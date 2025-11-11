"""
Lambda function to retrieve analytics and reports.
Supports daily, weekly, monthly, and semester-level analytics.
"""

import json
import boto3
import os
from decimal import Decimal
from botocore.exceptions import ClientError
from datetime import datetime, timedelta
from collections import defaultdict

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
    Retrieve analytics data with optional filtering.
    
    Query parameters:
    - period: daily, weekly, monthly, semester
    - year: Filter by student year
    - department: Filter by department
    - division: Filter by division
    - start_date: Start date for analytics period
    - end_date: End date for analytics period
    """
    try:
        # Parse query parameters
        query_params = event.get('queryStringParameters') or {}
        period = query_params.get('period', 'daily')
        year = query_params.get('year')
        department = query_params.get('department')
        division = query_params.get('division')
        start_date = query_params.get('start_date')
        end_date = query_params.get('end_date')
        
        # Set default date range if not provided
        # If no dates provided, fetch ALL records (don't default to today)
        if not end_date and not start_date:
            # No date filter - get ALL records
            print("No date filter specified for analytics, fetching ALL attendance records")
            try:
                response = final_attendance_table.scan()
                attendance_records = response.get('Items', [])
                print(f"Found {len(attendance_records)} total records for analytics")
            except ClientError as e:
                print(f"Error fetching all records for analytics: {str(e)}")
                attendance_records = []
        else:
            # Date range provided - use it
            if not end_date:
                end_date = datetime.now().strftime('%Y-%m-%d')
            if not start_date:
                if period == 'daily':
                    start_date = end_date
                elif period == 'weekly':
                    start_date = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
                elif period == 'monthly':
                    start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
                elif period == 'semester':
                    start_date = (datetime.now() - timedelta(days=180)).strftime('%Y-%m-%d')
                else:
                    start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
            
            print(f"Fetching analytics for date range: {start_date} to {end_date}")
            # Fetch attendance records
            attendance_records = fetch_attendance_by_date_range(start_date, end_date)
            print(f"Found {len(attendance_records)} records in date range for analytics")
        
        # Fetch all students for filtering
        all_students = fetch_all_students()
        student_info_map = {s['student_id']: s for s in all_students}
        
        # Apply filters and enrich records
        filtered_records = []
        for record in attendance_records:
            student_id = record.get('student_id')
            student_info = student_info_map.get(student_id, {})
            
            if year and student_info.get('year') != year:
                continue
            if department and student_info.get('department') != department:
                continue
            if division and student_info.get('division') != division:
                continue
            
            record['student_info'] = student_info
            filtered_records.append(record)
        
        # Generate analytics based on period
        if period == 'daily':
            analytics = generate_daily_analytics(filtered_records)
        elif period == 'weekly':
            analytics = generate_weekly_analytics(filtered_records)
        elif period == 'monthly':
            analytics = generate_monthly_analytics(filtered_records)
        elif period == 'semester':
            analytics = generate_semester_analytics(filtered_records)
        else:
            analytics = generate_daily_analytics(filtered_records)
        
        # Add overall statistics
        overall_stats = calculate_overall_statistics(filtered_records)
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, OPTIONS'
            },
            'body': json.dumps({
                'period': period,
                'start_date': start_date,
                'end_date': end_date,
                'analytics': analytics,
                'overall_statistics': overall_stats
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
                'error': f'Error retrieving analytics: {str(e)}'
            })
        }

def fetch_attendance_by_date_range(start_date, end_date):
    """Fetch attendance records for a date range."""
    try:
        response = final_attendance_table.scan()
        all_records = response.get('Items', [])
        
        filtered_records = []
        for record in all_records:
            record_date = record.get('date')
            if record_date and start_date <= record_date <= end_date:
                filtered_records.append(record)
        
        return filtered_records
    except ClientError as e:
        print(f"Error fetching attendance by date range: {str(e)}")
        return []

def generate_daily_analytics(records):
    """Generate daily analytics grouped by date."""
    daily_stats = defaultdict(lambda: {
        'present': 0,
        'absent': 0,
        'proxy': 0,
        'bunk': 0,
        'total': 0
    })
    
    for record in records:
        date = record.get('date')
        status = record.get('status', '')
        
        if date:
            if status == 'Present':
                daily_stats[date]['present'] += 1
            elif status == 'Absent':
                daily_stats[date]['absent'] += 1
            elif status == 'Proxy':
                daily_stats[date]['proxy'] += 1
            elif status == 'Bunk':
                daily_stats[date]['bunk'] += 1
            
            daily_stats[date]['total'] += 1
    
    # Convert to list format and calculate percentages
    result = []
    for date in sorted(daily_stats.keys()):
        stats = daily_stats[date]
        total = stats['total']
        attendance_pct = (stats['present'] / total * 100) if total > 0 else 0
        
        result.append({
            'date': date,
            **stats,
            'attendance_percentage': round(attendance_pct, 2)
        })
    
    return result

def generate_weekly_analytics(records):
    """Generate weekly analytics grouped by week."""
    weekly_stats = defaultdict(lambda: {
        'present': 0,
        'absent': 0,
        'proxy': 0,
        'bunk': 0,
        'total': 0,
        'dates': set()
    })
    
    for record in records:
        date_str = record.get('date')
        if date_str:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
            week_key = f"{date_obj.year}-W{date_obj.isocalendar()[1]}"
            weekly_stats[week_key]['dates'].add(date_str)
            
            status = record.get('status', '')
            if status == 'Present':
                weekly_stats[week_key]['present'] += 1
            elif status == 'Absent':
                weekly_stats[week_key]['absent'] += 1
            elif status == 'Proxy':
                weekly_stats[week_key]['proxy'] += 1
            elif status == 'Bunk':
                weekly_stats[week_key]['bunk'] += 1
            
            weekly_stats[week_key]['total'] += 1
    
    # Convert to list format
    result = []
    for week in sorted(weekly_stats.keys()):
        stats = weekly_stats[week]
        total = stats['total']
        attendance_pct = (stats['present'] / total * 100) if total > 0 else 0
        
        result.append({
            'week': week,
            'present': stats['present'],
            'absent': stats['absent'],
            'proxy': stats['proxy'],
            'bunk': stats['bunk'],
            'total': total,
            'attendance_percentage': round(attendance_pct, 2),
            'days_count': len(stats['dates'])
        })
    
    return result

def generate_monthly_analytics(records):
    """Generate monthly analytics grouped by month."""
    monthly_stats = defaultdict(lambda: {
        'present': 0,
        'absent': 0,
        'proxy': 0,
        'bunk': 0,
        'total': 0
    })
    
    for record in records:
        date_str = record.get('date')
        if date_str:
            month_key = date_str[:7]  # YYYY-MM
            
            status = record.get('status', '')
            if status == 'Present':
                monthly_stats[month_key]['present'] += 1
            elif status == 'Absent':
                monthly_stats[month_key]['absent'] += 1
            elif status == 'Proxy':
                monthly_stats[month_key]['proxy'] += 1
            elif status == 'Bunk':
                monthly_stats[month_key]['bunk'] += 1
            
            monthly_stats[month_key]['total'] += 1
    
    # Convert to list format
    result = []
    for month in sorted(monthly_stats.keys()):
        stats = monthly_stats[month]
        total = stats['total']
        attendance_pct = (stats['present'] / total * 100) if total > 0 else 0
        
        result.append({
            'month': month,
            **stats,
            'attendance_percentage': round(attendance_pct, 2)
        })
    
    return result

def generate_semester_analytics(records):
    """Generate semester-level analytics."""
    # Group by department and year
    dept_year_stats = defaultdict(lambda: {
        'present': 0,
        'absent': 0,
        'proxy': 0,
        'bunk': 0,
        'total': 0,
        'students': set()
    })
    
    for record in records:
        student_info = record.get('student_info', {})
        dept = student_info.get('department', 'Unknown')
        year = student_info.get('year', 'Unknown')
        key = f"{dept}_{year}"
        
        student_id = record.get('student_id')
        dept_year_stats[key]['students'].add(student_id)
        
        status = record.get('status', '')
        if status == 'Present':
            dept_year_stats[key]['present'] += 1
        elif status == 'Absent':
            dept_year_stats[key]['absent'] += 1
        elif status == 'Proxy':
            dept_year_stats[key]['proxy'] += 1
        elif status == 'Bunk':
            dept_year_stats[key]['bunk'] += 1
        
        dept_year_stats[key]['total'] += 1
    
    # Convert to list format
    result = []
    for key in sorted(dept_year_stats.keys()):
        dept, year = key.split('_', 1)
        stats = dept_year_stats[key]
        total = stats['total']
        attendance_pct = (stats['present'] / total * 100) if total > 0 else 0
        
        result.append({
            'department': dept,
            'year': year,
            **{k: v for k, v in stats.items() if k != 'students'},
            'unique_students': len(stats['students']),
            'attendance_percentage': round(attendance_pct, 2)
        })
    
    return result

def calculate_overall_statistics(records):
    """Calculate overall statistics from all records."""
    if not records:
        return {
            'total_records': 0,
            'present': 0,
            'absent': 0,
            'proxy': 0,
            'bunk': 0,
            'attendance_percentage': 0
        }
    
    status_counts = {
        'Present': 0,
        'Absent': 0,
        'Proxy': 0,
        'Bunk': 0
    }
    
    unique_students = set()
    unique_dates = set()
    
    for record in records:
        status = record.get('status', '')
        if status in status_counts:
            status_counts[status] += 1
        
        unique_students.add(record.get('student_id'))
        unique_dates.add(record.get('date'))
    
    total = len(records)
    present_count = status_counts['Present']
    attendance_pct = (present_count / total * 100) if total > 0 else 0
    
    return {
        'total_records': total,
        'present': status_counts['Present'],
        'absent': status_counts['Absent'],
        'proxy': status_counts['Proxy'],
        'bunk': status_counts['Bunk'],
        'attendance_percentage': round(attendance_pct, 2),
        'unique_students': len(unique_students),
        'unique_dates': len(unique_dates)
    }

