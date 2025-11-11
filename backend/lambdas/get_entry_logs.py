"""
Lambda function to retrieve entry logs from Entry_Log table.
Supports filtering by date range and student information.
"""

import json
import boto3
import os
from decimal import Decimal
from botocore.exceptions import ClientError
from datetime import datetime, timedelta

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
entry_log_table = dynamodb.Table(os.environ.get('ENTRY_LOG_TABLE', 'Entry_Log'))
student_master_table = dynamodb.Table(os.environ.get('STUDENT_MASTER_TABLE', 'Student_Master'))

class DecimalEncoder(json.JSONEncoder):
    """Helper class to convert Decimal to float for JSON serialization."""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

def lambda_handler(event, context):
    """
    Retrieve entry logs with optional filtering.
    
    Query parameters:
    - date: YYYY-MM-DD (optional, for specific date)
    - start_date: Start date for range query (optional)
    - end_date: End date for range query (optional)
    - year: Filter by student year (optional)
    - department: Filter by department (optional)
    - division: Filter by division (optional)
    - limit: Maximum number of records to return (default: 100, max: 500)
    """
    try:
        # Parse query parameters
        query_params = event.get('queryStringParameters') or {}
        date = query_params.get('date')
        start_date = query_params.get('start_date')
        end_date = query_params.get('end_date')
        year = query_params.get('year')
        department = query_params.get('department')
        division = query_params.get('division')
        limit = int(query_params.get('limit', 100))
        limit = min(limit, 500)  # Cap at 500
        
        print(f"Received query params: {query_params}")
        
        # Set default date range if not provided
        if not end_date:
            end_date = datetime.now().strftime('%Y-%m-%d')
        if not start_date:
            if date:
                start_date = date
                end_date = date
            else:
                # Default to last 90 days to be more inclusive
                start_date = (datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d')
        
        print(f"Date range: {start_date} to {end_date}")
        
        # Fetch entry logs
        entry_logs = fetch_entry_logs_by_date_range(start_date, end_date)
        print(f"Fetched {len(entry_logs)} entry logs from DynamoDB")
        
        # Fetch all students for filtering and enrichment
        all_students = fetch_all_students()
        print(f"Fetched {len(all_students)} students from Student_Master")
        student_info_map = {s['student_id']: s for s in all_students}
        
        # Enrich entry logs with student information and apply filters
        enriched_logs = []
        logs_without_student = 0
        for log in entry_logs:
            student_id = log.get('student_id')
            student_info = student_info_map.get(student_id, {})
            
            # If student not found, still include the log but mark as unknown
            if not student_info:
                logs_without_student += 1
                print(f"Warning: Student {student_id} not found in Student_Master")
                # If filters are provided but student info doesn't exist, skip this log
                # Otherwise, include it
                if year or department or division:
                    continue
            else:
                # Apply filters only if student info exists
                if year and student_info.get('year') != year:
                    continue
                if department and student_info.get('department') != department:
                    continue
                if division and student_info.get('division') != division:
                    continue
            
            enriched_log = {
                'log_id': log.get('log_id'),
                'rfid_uid': log.get('rfid_uid'),
                'student_id': student_id,
                'student_name': student_info.get('name', 'Unknown') if student_info else 'Unknown',
                'year': student_info.get('year') if student_info else None,
                'department': student_info.get('department') if student_info else None,
                'division': student_info.get('division') if student_info else None,
                'timestamp': log.get('timestamp'),
                'date': log.get('date'),
                'created_at': log.get('created_at'),
            }
            
            enriched_logs.append(enriched_log)
        
        print(f"Enriched {len(enriched_logs)} logs ({(logs_without_student)} without student info)")
        
        # Sort by timestamp (most recent first)
        enriched_logs.sort(key=lambda x: x.get('timestamp') or x.get('created_at') or '', reverse=True)
        
        # Apply limit
        enriched_logs = enriched_logs[:limit]
        
        # Calculate summary statistics
        total_scans = len(enriched_logs)
        unique_students = len(set(log['student_id'] for log in enriched_logs if log.get('student_id')))
        
        print(f"Returning {total_scans} logs, {unique_students} unique students")
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, OPTIONS'
            },
            'body': json.dumps({
                'logs': enriched_logs,
                'total_logs': total_scans,
                'unique_students': unique_students,
                'start_date': start_date,
                'end_date': end_date
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
                'error': f'Error retrieving entry logs: {str(e)}'
            })
        }

def fetch_entry_logs_by_date_range(start_date, end_date):
    """Fetch entry logs for a date range with pagination support."""
    try:
        all_logs = []
        last_evaluated_key = None
        
        # Scan with pagination to get all records
        while True:
            if last_evaluated_key:
                response = entry_log_table.scan(ExclusiveStartKey=last_evaluated_key)
            else:
                response = entry_log_table.scan()
            
            items = response.get('Items', [])
            all_logs.extend(items)
            
            # Check if there are more pages
            last_evaluated_key = response.get('LastEvaluatedKey')
            if not last_evaluated_key:
                break
        
        print(f"Total logs scanned: {len(all_logs)}")
        
        # Filter logs in date range
        filtered_logs = []
        logs_without_date = []
        
        for log in all_logs:
            log_date = log.get('date')
            
            # If log has a valid date, check if it's in range
            if log_date:
                try:
                    if start_date <= log_date <= end_date:
                        filtered_logs.append(log)
                except Exception as e:
                    print(f"Error comparing date {log_date}: {e}")
                    # Include logs with invalid date format to avoid data loss
                    logs_without_date.append(log)
            else:
                # Log doesn't have a date field - try to extract from timestamp or created_at
                timestamp = log.get('timestamp') or log.get('created_at')
                if timestamp:
                    try:
                        # Extract date from timestamp (format: YYYY-MM-DDTHH:MM:SSZ)
                        extracted_date = timestamp[:10]  # Get YYYY-MM-DD part
                        if start_date <= extracted_date <= end_date:
                            filtered_logs.append(log)
                        print(f"Log {log.get('log_id')} missing 'date' field, extracted from timestamp: {extracted_date}")
                    except Exception as e:
                        print(f"Error extracting date from timestamp {timestamp}: {e}")
                        logs_without_date.append(log)
                else:
                    print(f"Warning: Log {log.get('log_id')} has no date, timestamp, or created_at field")
                    logs_without_date.append(log)
        
        # Include logs without dates in the result (to avoid data loss)
        # These will appear as "Unknown" date in frontend
        if logs_without_date:
            print(f"Warning: {len(logs_without_date)} logs don't have valid dates, including them anyway")
            filtered_logs.extend(logs_without_date)
        
        print(f"Filtered logs for date range {start_date} to {end_date}: {len(filtered_logs)} (including {len(logs_without_date)} without valid dates)")
        return filtered_logs
    except ClientError as e:
        print(f"Error fetching entry logs by date range: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return []
    except Exception as e:
        print(f"Unexpected error in fetch_entry_logs_by_date_range: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return []

def fetch_all_students():
    """Fetch all students from Student_Master table with pagination."""
    try:
        all_students = []
        last_evaluated_key = None
        
        # Scan with pagination to get all students
        while True:
            if last_evaluated_key:
                response = student_master_table.scan(ExclusiveStartKey=last_evaluated_key)
            else:
                response = student_master_table.scan()
            
            items = response.get('Items', [])
            all_students.extend(items)
            
            # Check if there are more pages
            last_evaluated_key = response.get('LastEvaluatedKey')
            if not last_evaluated_key:
                break
        
        return all_students
    except ClientError as e:
        print(f"Error fetching students: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return []

