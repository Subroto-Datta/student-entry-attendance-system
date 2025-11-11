"""
Lambda function to retrieve attendance results.
Supports filtering by date, year, department, division, and status.
"""

import json
import boto3
import os
from decimal import Decimal
from botocore.exceptions import ClientError
from datetime import datetime, timedelta

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
final_attendance_table = dynamodb.Table(os.environ.get('FINAL_ATTENDANCE_TABLE', 'Final_Attendance'))
student_master_table = dynamodb.Table(os.environ.get('STUDENT_MASTER_TABLE', 'Student_Master'))

class DecimalEncoder(json.JSONEncoder):
    """Helper class to convert Decimal to float for JSON serialization."""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

def lambda_handler(event, context):
    """
    Retrieve attendance results with optional filtering.
    
    Query parameters:
    - date: YYYY-MM-DD (required for date-specific results)
    - year: Filter by student year
    - department: Filter by department
    - division: Filter by division
    - status: Filter by attendance status (Present, Absent, Proxy, Bunk)
    - start_date: Start date for range query
    - end_date: End date for range query
    """
    try:
        # Parse query parameters
        query_params = event.get('queryStringParameters') or {}
        date = query_params.get('date')
        year = query_params.get('year')
        department = query_params.get('department')
        division = query_params.get('division')
        status = query_params.get('status')
        start_date = query_params.get('start_date')
        end_date = query_params.get('end_date')
        
        # Fetch all attendance records (or filtered by date)
        if date:
            # Single date query
            print(f"Fetching attendance records for specific date: {date}")
            attendance_records = fetch_attendance_by_date(date)
            print(f"Found {len(attendance_records)} records for date {date}")
        elif start_date and end_date:
            # Date range query
            print(f"Fetching attendance records for date range: {start_date} to {end_date}")
            attendance_records = fetch_attendance_by_date_range(start_date, end_date)
            print(f"Found {len(attendance_records)} records in date range")
        else:
            # Get ALL records if no date filter (don't default to last 30 days)
            # This allows users to see all uploaded data
            print("No date filter specified, fetching ALL attendance records")
            try:
                response = final_attendance_table.scan()
                attendance_records = response.get('Items', [])
                print(f"Found {len(attendance_records)} total records (no date filter)")
            except ClientError as e:
                print(f"Error fetching all records: {str(e)}")
                attendance_records = []
        
        # Fetch all students for filtering
        all_students = fetch_all_students()
        student_info_map = {s['student_id']: s for s in all_students}
        
        # Enrich attendance records with student information
        enriched_records = []
        for record in attendance_records:
            student_id = record.get('student_id')
            student_info = student_info_map.get(student_id, {})
            
            # Apply filters
            if year and student_info.get('year') != year:
                continue
            if department and student_info.get('department') != department:
                continue
            if division and student_info.get('division') != division:
                continue
            if status and record.get('status') != status:
                continue
            
            enriched_record = {
                'attendance_id': record.get('attendance_id'),
                'student_id': student_id,
                'student_name': student_info.get('name', 'Unknown'),
                'rfid_uid': record.get('rfid_uid'),
                'year': student_info.get('year'),
                'department': student_info.get('department'),
                'division': student_info.get('division'),
                'date': record.get('date'),
                'lecture': record.get('lecture'),
                'status': record.get('status'),
                'processed_at': record.get('processed_at')
            }
            
            enriched_records.append(enriched_record)
        
        # Calculate summary statistics
        summary = calculate_summary(enriched_records)
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, OPTIONS'
            },
            'body': json.dumps({
                'records': enriched_records,
                'summary': summary,
                'total_records': len(enriched_records)
            }, cls=DecimalEncoder)
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, OPTIONS'
            },
            'body': json.dumps({
                'error': f'Error retrieving results: {str(e)}'
            })
        }

def fetch_attendance_by_date(date):
    """Fetch attendance records for a specific date."""
    try:
        response = final_attendance_table.scan(
            FilterExpression='#date = :date_val',
            ExpressionAttributeNames={'#date': 'date'},
            ExpressionAttributeValues={':date_val': date}
        )
        return response.get('Items', [])
    except ClientError as e:
        print(f"Error fetching attendance by date: {str(e)}")
        return []

def fetch_attendance_by_date_range(start_date, end_date):
    """Fetch attendance records for a date range."""
    try:
        # Scan all records and filter by date range
        response = final_attendance_table.scan()
        all_records = response.get('Items', [])
        
        # Filter records in date range
        filtered_records = []
        for record in all_records:
            record_date = record.get('date')
            if record_date and start_date <= record_date <= end_date:
                filtered_records.append(record)
        
        return filtered_records
    except ClientError as e:
        print(f"Error fetching attendance by date range: {str(e)}")
        return []

def fetch_all_students():
    """Fetch all students from Student_Master table."""
    try:
        response = student_master_table.scan()
        return response.get('Items', [])
    except ClientError as e:
        print(f"Error fetching students: {str(e)}")
        return []

def calculate_summary(records):
    """Calculate summary statistics from attendance records."""
    if not records:
        return {
            'present': 0,
            'absent': 0,
            'proxy': 0,
            'bunk': 0,
            'total': 0,
            'attendance_percentage': 0
        }
    
    status_counts = {
        'Present': 0,
        'Absent': 0,
        'Proxy': 0,
        'Bunk': 0
    }
    
    for record in records:
        status = record.get('status', '')
        if status in status_counts:
            status_counts[status] += 1
    
    total = len(records)
    present_count = status_counts['Present']
    
    attendance_percentage = (present_count / total * 100) if total > 0 else 0
    
    return {
        'present': status_counts['Present'],
        'absent': status_counts['Absent'],
        'proxy': status_counts['Proxy'],
        'bunk': status_counts['Bunk'],
        'total': total,
        'attendance_percentage': round(attendance_percentage, 2)
    }

