# Backend - AWS Lambda Functions

This directory contains all AWS Lambda functions for the Student Entry and Attendance Management System.

## Lambda Functions

### 1. `handle_entry_log.py`
**Purpose**: Process IoT entry logs from ESP32 RFID scanners.

**Triggers**: API Gateway POST `/entry`

**Input**:
```json
{
  "rfid_uid": "A1B2C3D4",
  "timestamp": "2025-11-03T09:30:00Z",
  "date": "2025-11-03"
}
```

**Environment Variables**:
- `ENTRY_LOG_TABLE`: DynamoDB table name for entry logs (default: `Entry_Log`)
- `STUDENT_MASTER_TABLE`: DynamoDB table name for student master (default: `Student_Master`)

### 2. `process_attendance_upload.py`
**Purpose**: Process Excel/CSV files uploaded to S3 and compute attendance.

**Triggers**: S3 bucket upload event

**Process**:
1. Downloads Excel/CSV from S3
2. Parses student data
3. Fetches IoT entry logs for the date
4. Compares and computes: Present, Absent, Proxy, Bunk
5. Stores results in Final_Attendance table

**Environment Variables**:
- `ENTRY_LOG_TABLE`: DynamoDB table name for entry logs
- `STUDENT_MASTER_TABLE`: DynamoDB table name for student master
- `FINAL_ATTENDANCE_TABLE`: DynamoDB table name for final attendance

**Excel Format**:
- Required columns: `student_id` OR `rfid_uid`
- Optional columns: `name`, `lecture`, `date`

### 3. `get_results.py`
**Purpose**: Retrieve attendance results with filtering.

**Triggers**: API Gateway GET `/results`

**Query Parameters**:
- `date`: YYYY-MM-DD (optional)
- `year`: Filter by year (optional)
- `department`: Filter by department (optional)
- `division`: Filter by division (optional)
- `status`: Filter by status - Present/Absent/Proxy/Bunk (optional)
- `start_date`: Start date for range (optional)
- `end_date`: End date for range (optional)

**Environment Variables**:
- `FINAL_ATTENDANCE_TABLE`: DynamoDB table name for final attendance
- `STUDENT_MASTER_TABLE`: DynamoDB table name for student master

### 4. `get_analytics.py`
**Purpose**: Generate analytics and reports.

**Triggers**: API Gateway GET `/analytics`

**Query Parameters**:
- `period`: daily/weekly/monthly/semester (default: daily)
- `year`: Filter by year (optional)
- `department`: Filter by department (optional)
- `division`: Filter by division (optional)
- `start_date`: Start date (optional)
- `end_date`: End date (optional)

**Environment Variables**:
- `FINAL_ATTENDANCE_TABLE`: DynamoDB table name for final attendance
- `STUDENT_MASTER_TABLE`: DynamoDB table name for student master

## Installation

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Package for Lambda deployment:
```bash
# Create deployment package
zip -r lambda_function.zip . -x "*.git*" -x "*.md" -x "__pycache__/*"
```

## Environment Variables Setup

Set the following environment variables in Lambda configuration:

```
ENTRY_LOG_TABLE=Entry_Log
STUDENT_MASTER_TABLE=Student_Master
FINAL_ATTENDANCE_TABLE=Final_Attendance
```

## Testing

You can test Lambda functions locally using AWS SAM or by invoking them with test events:

```bash
# Example test event for handle_entry_log
aws lambda invoke --function-name handle_entry_log \
  --payload '{"body": "{\"rfid_uid\":\"A1B2C3D4\",\"timestamp\":\"2025-11-03T09:30:00Z\",\"date\":\"2025-11-03\"}"}' \
  response.json
```

