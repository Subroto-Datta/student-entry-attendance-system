"""
Lambda function triggered by S3 upload event.
Processes Excel/CSV files uploaded by faculty.
Compares uploaded attendance with IoT entry logs.
Computes attendance status: Present, Absent, Proxy, Bunk.
"""

import json
import boto3
import os
import pandas as pd
import io
from datetime import datetime
from decimal import Decimal
from botocore.exceptions import ClientError

# Initialize AWS clients
s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

entry_log_table = dynamodb.Table(os.environ.get('ENTRY_LOG_TABLE', 'Entry_Log'))
student_master_table = dynamodb.Table(os.environ.get('STUDENT_MASTER_TABLE', 'Student_Master'))
final_attendance_table = dynamodb.Table(os.environ.get('FINAL_ATTENDANCE_TABLE', 'Final_Attendance'))

def lambda_handler(event, context):
    """
    Process S3 upload event for attendance Excel/CSV files.
    
    Expected S3 event structure:
    {
        "Records": [{
            "s3": {
                "bucket": {"name": "bucket-name"},
                "object": {"key": "path/to/file.xlsx"}
            }
        }]
    }
    
    Excel file format:
    - Must contain columns: student_id or rfid_uid, lecture (optional)
    - May contain: name, date (if not in filename)
    """
    try:
        # Process each S3 record
        for record in event.get('Records', []):
            bucket_name = record['s3']['bucket']['name']
            object_key = record['s3']['object']['key']
            
            # Skip if not an Excel/CSV file
            if not (object_key.endswith('.xlsx') or object_key.endswith('.xls') or object_key.endswith('.csv')):
                print(f"Skipping non-Excel file: {object_key}")
                continue
            
            # Download file from S3
            try:
                response = s3_client.get_object(Bucket=bucket_name, Key=object_key)
                file_content = response['Body'].read()
            except ClientError as e:
                print(f"Error downloading file from S3: {str(e)}")
                continue
            
            # Parse Excel/CSV file
            try:
                if object_key.endswith('.csv'):
                    df = pd.read_csv(io.BytesIO(file_content))
                else:
                    df = pd.read_excel(io.BytesIO(file_content), engine='openpyxl')
            except Exception as e:
                print(f"Error parsing file: {str(e)}")
                continue
            
            # Extract date from filename or use today's date
            date = extract_date_from_filename(object_key)
            if not date:
                date = datetime.now().strftime('%Y-%m-%d')
            
            # Extract lecture from filename or use default
            lecture = extract_lecture_from_filename(object_key)
            if not lecture:
                lecture = f"Lecture_{datetime.now().strftime('%H:%M')}"
            
            # Normalize column names (case-insensitive, strip whitespace)
            df.columns = df.columns.str.strip().str.lower()
            
            # Identify student identifier column
            student_id_col = None
            rfid_uid_col = None
            
            for col in df.columns:
                if col in ['student_id', 'studentid']:
                    student_id_col = col
                elif col in ['rfid_uid', 'rfid', 'rfiduid']:
                    rfid_uid_col = col
            
            if not student_id_col and not rfid_uid_col:
                print("Error: Excel file must contain 'student_id' or 'rfid_uid' column")
                continue
            
            # Fetch all entry logs for the date
            entry_logs = fetch_entry_logs_for_date(date)
            entry_rfid_uids = set(log['rfid_uid'] for log in entry_logs)
            rfid_to_student_id = {log['rfid_uid']: log.get('student_id') for log in entry_logs}
            
            # Fetch all students from master table
            all_students = fetch_all_students()
            student_id_to_info = {s['student_id']: s for s in all_students}
            rfid_to_student_info = {s['rfid_uid']: s for s in all_students}
            
            # Process each student in Excel
            attendance_results = []
            
            for _, row in df.iterrows():
                student_id = None
                rfid_uid = None
                
                if student_id_col:
                    student_id = str(row[student_id_col]).strip()
                elif rfid_uid_col:
                    rfid_uid = str(row[rfid_uid_col]).strip()
                    # Find student_id from rfid_uid
                    student_info = rfid_to_student_info.get(rfid_uid)
                    if student_info:
                        student_id = student_info['student_id']
                
                if not student_id:
                    print(f"Warning: Could not find student_id for row: {row.to_dict()}")
                    continue
                
                # Determine attendance status
                student_info = student_id_to_info.get(student_id)
                if not student_info:
                    print(f"Warning: Student {student_id} not found in Student_Master")
                    continue
                
                student_rfid = student_info['rfid_uid']
                
                # Check if student was scanned (in entry logs)
                was_scanned = student_rfid in entry_rfid_uids
                
                # Check if student is in Excel (they are, since we're processing them)
                in_excel = True
                
                # Determine status
                if was_scanned and in_excel:
                    status = "Present"
                elif not was_scanned and in_excel:
                    status = "Proxy"  # In Excel but not scanned
                elif was_scanned and not in_excel:
                    status = "Bunk"  # Scanned but not in Excel (shouldn't happen in this flow)
                else:
                    status = "Absent"
                
                # Create attendance record
                attendance_id = f"{student_id}_{date}_{lecture.replace(' ', '_')}"
                
                attendance_record = {
                    'attendance_id': attendance_id,
                    'student_id': student_id,
                    'rfid_uid': student_rfid,
                    'date': date,
                    'lecture': lecture,
                    'status': status,
                    'uploaded_file': object_key,
                    'processed_at': datetime.utcnow().isoformat() + 'Z'
                }
                
                attendance_results.append(attendance_record)
            
            # Also check for "Bunk" cases: students who were scanned but not in Excel
            scanned_students_not_in_excel = []
            
            excel_student_ids = set()
            for _, row in df.iterrows():
                if student_id_col:
                    excel_student_ids.add(str(row[student_id_col]).strip())
                elif rfid_uid_col:
                    rfid = str(row[rfid_uid_col]).strip()
                    if rfid in rfid_to_student_info:
                        excel_student_ids.add(rfid_to_student_info[rfid]['student_id'])
            
            for log in entry_logs:
                student_id_from_log = log.get('student_id')
                if student_id_from_log and student_id_from_log not in excel_student_ids:
                    # Student was scanned but not in Excel - this is a "Bunk"
                    attendance_id = f"{student_id_from_log}_{date}_{lecture.replace(' ', '_')}_bunk"
                    
                    attendance_record = {
                        'attendance_id': attendance_id,
                        'student_id': student_id_from_log,
                        'rfid_uid': log['rfid_uid'],
                        'date': date,
                        'lecture': lecture,
                        'status': 'Bunk',
                        'uploaded_file': object_key,
                        'processed_at': datetime.utcnow().isoformat() + 'Z'
                    }
                    
                    scanned_students_not_in_excel.append(attendance_record)
            
            attendance_results.extend(scanned_students_not_in_excel)
            
            # Store all attendance records in DynamoDB
            for record in attendance_results:
                try:
                    # Convert Python types to DynamoDB-compatible types
                    dynamo_item = json.loads(json.dumps(record), parse_float=Decimal)
                    final_attendance_table.put_item(Item=dynamo_item)
                except ClientError as e:
                    print(f"Error storing attendance record {record['attendance_id']}: {str(e)}")
            
            print(f"Successfully processed {len(attendance_results)} attendance records from {object_key}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Attendance processing completed successfully',
                'records_processed': len(attendance_results) if 'attendance_results' in locals() else 0
            })
        }
    
    except Exception as e:
        print(f"Error processing attendance upload: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': f'Error processing attendance: {str(e)}'
            })
        }

def extract_date_from_filename(filename):
    """Extract date from filename if present (format: YYYY-MM-DD or similar)."""
    import re
    date_pattern = r'(\d{4}[-/]\d{2}[-/]\d{2})'
    match = re.search(date_pattern, filename)
    if match:
        date_str = match.group(1).replace('/', '-')
        return date_str
    return None

def extract_lecture_from_filename(filename):
    """Extract lecture name from filename if present."""
    import re
    # Look for patterns like "Lecture_1", "Lec1", "Math", etc.
    lecture_patterns = [
        r'[Ll]ecture[_\s]*(\w+)',
        r'[Ll]ec[_\s]*(\w+)',
        r'([A-Z][a-z]+)[_\s]*\d{4}'  # Subject name before date
    ]
    for pattern in lecture_patterns:
        match = re.search(pattern, filename)
        if match:
            return match.group(1) if len(match.groups()) > 0 else match.group(0)
    return None

def fetch_entry_logs_for_date(date):
    """Fetch all entry logs for a specific date."""
    try:
        response = entry_log_table.scan(
            FilterExpression='#date = :date_val',
            ExpressionAttributeNames={'#date': 'date'},
            ExpressionAttributeValues={':date_val': date}
        )
        return response.get('Items', [])
    except ClientError as e:
        print(f"Error fetching entry logs: {str(e)}")
        return []

def fetch_all_students():
    """Fetch all students from Student_Master table."""
    try:
        response = student_master_table.scan()
        return response.get('Items', [])
    except ClientError as e:
        print(f"Error fetching students: {str(e)}")
        return []

