# DynamoDB Setup Guide

This guide walks you through creating the DynamoDB tables required for the Attendance Management System.

## Prerequisites

- AWS Account with DynamoDB access
- AWS CLI configured (optional, for CLI setup)
- AWS Console access

## Tables to Create

1. **Student_Master** - Stores student information
2. **Entry_Log** - Stores RFID entry logs from ESP32
3. **Final_Attendance** - Stores computed attendance records

## Method 1: AWS Console Setup

### 1. Create Student_Master Table

1. Go to AWS Console → DynamoDB
2. Click "Create table"
3. Table name: `Student_Master`
4. Partition key: `student_id` (String)
5. Table settings: **Use default settings** (PAY_PER_REQUEST billing mode)
6. Click "Create table"

#### Add Global Secondary Index (GSI) for RFID lookup:

1. Click on `Student_Master` table
2. Go to "Indexes" tab
3. Click "Create index"
4. Index name: `rfid-uid-index`
5. Partition key: `rfid_uid` (String)
6. Click "Create index"

### 2. Create Entry_Log Table

1. Click "Create table"
2. Table name: `Entry_Log`
3. Partition key: `log_id` (String)
4. Use default settings
5. Click "Create table"

#### Add Global Secondary Indexes:

**Index 1 - Date Index:**
- Index name: `date-index`
- Partition key: `date` (String)

**Index 2 - Student ID Index:**
- Index name: `student-id-index`
- Partition key: `student_id` (String)

### 3. Create Final_Attendance Table

1. Click "Create table"
2. Table name: `Final_Attendance`
3. Partition key: `attendance_id` (String)
4. Use default settings
5. Click "Create table"

#### Add Global Secondary Indexes:

**Index 1 - Student ID Index:**
- Index name: `student-id-index`
- Partition key: `student_id` (String)

**Index 2 - Date Index:**
- Index name: `date-index`
- Partition key: `date` (String)

## Method 2: AWS CLI Setup

### Create Tables Using CLI

```bash
# Create Student_Master table
aws dynamodb create-table \
  --table-name Student_Master \
  --attribute-definitions \
    AttributeName=student_id,AttributeType=S \
    AttributeName=rfid_uid,AttributeType=S \
  --key-schema \
    AttributeName=student_id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes \
    IndexName=rfid-uid-index,KeySchema=[{AttributeName=rfid_uid,KeyType=HASH}],Projection={ProjectionType=ALL}

# Create Entry_Log table
aws dynamodb create-table \
  --table-name Entry_Log \
  --attribute-definitions \
    AttributeName=log_id,AttributeType=S \
    AttributeName=date,AttributeType=S \
    AttributeName=student_id,AttributeType=S \
  --key-schema \
    AttributeName=log_id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes \
    IndexName=date-index,KeySchema=[{AttributeName=date,KeyType=HASH}],Projection={ProjectionType=ALL} \
    IndexName=student-id-index,KeySchema=[{AttributeName=student_id,KeyType=HASH}],Projection={ProjectionType=ALL}

# Create Final_Attendance table
aws dynamodb create-table \
  --table-name Final_Attendance \
  --attribute-definitions \
    AttributeName=attendance_id,AttributeType=S \
    AttributeName=student_id,AttributeType=S \
    AttributeName=date,AttributeType=S \
  --key-schema \
    AttributeName=attendance_id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes \
    IndexName=student-id-index,KeySchema=[{AttributeName=student_id,KeyType=HASH}],Projection={ProjectionType=ALL} \
    IndexName=date-index,KeySchema=[{AttributeName=date,KeyType=HASH}],Projection={ProjectionType=ALL}
```

## Method 3: Using CloudFormation / Terraform

See `deployment/deployment_guide.md` for Infrastructure as Code setup.

## Populate Student_Master Table

After creating tables, you need to populate student data. Example:

```bash
# Add a sample student
aws dynamodb put-item \
  --table-name Student_Master \
  --item '{
    "student_id": {"S": "STU001"},
    "rfid_uid": {"S": "A1B2C3D4"},
    "name": {"S": "John Doe"},
    "year": {"S": "FE"},
    "department": {"S": "Computer"},
    "division": {"S": "A"}
  }'
```

Or use the AWS Console:
1. Open `Student_Master` table
2. Click "Explore table items"
3. Click "Create item"
4. Add fields:
   - `student_id`: "STU001"
   - `rfid_uid`: "A1B2C3D4"
   - `name`: "John Doe"
   - `year`: "FE"
   - `department`: "Computer"
   - `division`: "A"

## Verification

1. Check all tables are created: AWS Console → DynamoDB → Tables
2. Verify indexes: Click on each table → "Indexes" tab
3. Test with sample data

## Cost Optimization (Free Tier)

- **DynamoDB Free Tier**: 25 GB storage, 25 RCU, 25 WCU (always free)
- All tables use **PAY_PER_REQUEST** (on-demand) billing mode
- No provisioned capacity needed for free tier usage
- Global Secondary Indexes consume additional storage but stay within free tier for small datasets

## Troubleshooting

- **Error: "Table already exists"** - Delete existing table first or use different name
- **Index creation fails** - Ensure attribute definitions include the index key
- **Access denied** - Check IAM permissions for DynamoDB operations

## Next Steps

After setting up DynamoDB:
1. Configure Lambda functions with table names (see `api_gateway_setup.md`)
2. Set up S3 bucket for file uploads (see `s3_trigger_setup.md`)
3. Configure API Gateway (see `api_gateway_setup.md`)

