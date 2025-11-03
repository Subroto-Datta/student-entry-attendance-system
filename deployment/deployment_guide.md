# Complete Deployment Guide

This guide provides step-by-step instructions to deploy the entire Student Entry and Attendance Management System to AWS.

## Prerequisites

- AWS Account (Free Tier eligible)
- AWS CLI installed and configured
- Git repository for version control
- Python 3.9+ installed locally
- Node.js 18+ and npm installed

## Architecture Overview

```
ESP32 (IoT) → API Gateway → Lambda (handle_entry_log) → DynamoDB (Entry_Log)
Frontend → API Gateway → Lambda (get_results/get_analytics) → DynamoDB
Frontend → S3 → Lambda (process_attendance_upload) → DynamoDB (Final_Attendance)
```

## Deployment Order

Follow these steps in order:

### Phase 1: Backend Setup

1. ✅ **DynamoDB Tables** (15 minutes)
   - See `dynamodb_setup.md`
   - Create 3 tables: Student_Master, Entry_Log, Final_Attendance

2. ✅ **Lambda Functions** (30 minutes)
   - Deploy all 4 Lambda functions
   - Configure environment variables
   - Set up IAM roles

3. ✅ **S3 Bucket** (10 minutes)
   - Create bucket for file uploads
   - Configure S3 event trigger
   - See `s3_trigger_setup.md`

4. ✅ **API Gateway** (20 minutes)
   - Create REST API
   - Configure endpoints
   - Enable CORS
   - See `api_gateway_setup.md`

### Phase 2: Frontend Setup

5. ✅ **React Frontend** (20 minutes)
   - Build and test locally
   - Deploy to AWS Amplify or S3+CloudFront
   - Configure API endpoints
   - See `aws_amplify_setup.md`

### Phase 3: Testing & Configuration

6. ✅ **ESP32 Integration** (10 minutes)
   - Configure ESP32 with WiFi credentials
   - Update API Gateway URL
   - Test RFID scan → API call

7. ✅ **Data Population** (15 minutes)
   - Add student records to Student_Master
   - Test end-to-end flow

## Detailed Steps

### Step 1: Set Up AWS Environment

```bash
# Verify AWS CLI configuration
aws configure list

# Set default region (e.g., us-east-1)
export AWS_DEFAULT_REGION=us-east-1
```

### Step 2: Deploy DynamoDB Tables

```bash
# Navigate to backend directory
cd backend

# Use AWS CLI or Console (see dynamodb_setup.md)
# Tables will be created with PAY_PER_REQUEST billing mode
```

**Quick CLI Setup:**

```bash
# Create Student_Master
aws dynamodb create-table \
  --table-name Student_Master \
  --attribute-definitions \
    AttributeName=student_id,AttributeType=S \
    AttributeName=rfid_uid,AttributeType=S \
  --key-schema AttributeName=student_id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes \
    IndexName=rfid-uid-index,KeySchema=[{AttributeName=rfid_uid,KeyType=HASH}],Projection={ProjectionType=ALL}

# Create Entry_Log (simplified, add indexes via Console)
aws dynamodb create-table \
  --table-name Entry_Log \
  --attribute-definitions \
    AttributeName=log_id,AttributeType=S \
  --key-schema AttributeName=log_id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# Create Final_Attendance (simplified, add indexes via Console)
aws dynamodb create-table \
  --table-name Final_Attendance \
  --attribute-definitions \
    AttributeName=attendance_id,AttributeType=S \
  --key-schema AttributeName=attendance_id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

### Step 3: Create IAM Role for Lambda

```bash
# Create trust policy
cat > trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create role
aws iam create-role \
  --role-name AttendanceLambdaExecutionRole \
  --assume-role-policy-document file://trust-policy.json

# Attach basic Lambda execution policy
aws iam attach-role-policy \
  --role-name AttendanceLambdaExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Create and attach DynamoDB policy
cat > dynamodb-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:UpdateItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:*:*:table/Student_Master",
        "arn:aws:dynamodb:*:*:table/Student_Master/index/*",
        "arn:aws:dynamodb:*:*:table/Entry_Log",
        "arn:aws:dynamodb:*:*:table/Entry_Log/index/*",
        "arn:aws:dynamodb:*:*:table/Final_Attendance",
        "arn:aws:dynamodb:*:*:table/Final_Attendance/index/*"
      ]
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name AttendanceLambdaExecutionRole \
  --policy-name DynamoDBAccess \
  --policy-document file://dynamodb-policy.json

# Create and attach S3 policy (for process_attendance_upload)
cat > s3-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::attendance-uploads-*",
        "arn:aws:s3:::attendance-uploads-*/*"
      ]
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name AttendanceLambdaExecutionRole \
  --policy-name S3Access \
  --policy-document file://s3-policy.json
```

**Note**: Replace `*` with your actual account ID and bucket name.

### Step 4: Package and Deploy Lambda Functions

```bash
cd backend

# Install dependencies locally (for packaging)
pip install -r requirements.txt -t .

# Package each Lambda function
# Note: Each function should be packaged with its dependencies

# Example for handle_entry_log
zip -r handle_entry_log.zip handle_entry_log.py boto3* botocore* pandas* openpyxl* xlrd* -x "*.pyc" -x "__pycache__/*"

# Upload and create Lambda function
aws lambda create-function \
  --function-name handle_entry_log \
  --runtime python3.9 \
  --role arn:aws:iam::YOUR-ACCOUNT-ID:role/AttendanceLambdaExecutionRole \
  --handler handle_entry_log.lambda_handler \
  --zip-file fileb://handle_entry_log.zip \
  --timeout 30 \
  --memory-size 256 \
  --environment Variables="{
    ENTRY_LOG_TABLE=Entry_Log,
    STUDENT_MASTER_TABLE=Student_Master
  }"

# Repeat for other functions:
# - process_attendance_upload (add S3 trigger)
# - get_results
# - get_analytics
```

**Or use AWS Console:**

1. Go to **Lambda** → **Create function**
2. Choose **Author from scratch**
3. Function name: `handle_entry_log`
4. Runtime: **Python 3.9**
5. Change default execution role → **Use an existing role** → `AttendanceLambdaExecutionRole`
6. Click **Create function**
7. Upload code: Copy-paste from `backend/lambdas/handle_entry_log.py`
8. **Configuration** → **Environment variables**:
   ```
   ENTRY_LOG_TABLE=Entry_Log
   STUDENT_MASTER_TABLE=Student_Master
   ```
9. Click **Deploy**

Repeat for all 4 functions.

### Step 5: Create S3 Bucket and Configure Trigger

See `s3_trigger_setup.md` for detailed steps.

Quick setup:
```bash
# Create bucket
aws s3 mb s3://attendance-uploads-<your-unique-id>

# Configure event notification via Console (see s3_trigger_setup.md)
```

### Step 6: Set Up API Gateway

See `api_gateway_setup.md` for detailed steps.

Quick summary:
1. Create REST API
2. Create resources: `/entry`, `/results`, `/analytics`
3. Create methods: POST for `/entry`, GET for others
4. Connect to Lambda functions
5. Enable CORS
6. Deploy API

### Step 7: Deploy Frontend

See `aws_amplify_setup.md` for detailed steps.

Quick setup:
```bash
cd frontend

# Install dependencies
npm install

# Create .env file
echo "VITE_API_BASE_URL=https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod" > .env.local

# Test locally
npm run dev

# Build
npm run build

# Deploy to Amplify (via Console) or S3+CloudFront
```

### Step 8: Populate Student Data

Add sample students to `Student_Master`:

```bash
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

Or use AWS Console to add multiple students via CSV import or manually.

### Step 9: Test Complete System

1. **Test IoT Entry**:
   ```bash
   curl -X POST https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod/entry \
     -H "Content-Type: application/json" \
     -d '{"rfid_uid":"A1B2C3D4","timestamp":"2025-11-03T09:30:00Z","date":"2025-11-03"}'
   ```

2. **Test Frontend**: Open deployed URL and verify dashboard loads

3. **Test File Upload**: Upload test Excel file and verify processing

4. **Check DynamoDB**: Verify records appear in tables

## Cost Estimation (Free Tier)

| Service | Free Tier | Monthly Cost (After Free Tier) |
|---------|-----------|-------------------------------|
| Lambda | 1M requests, 400K GB-seconds | ~$0.20 per 1M requests |
| DynamoDB | 25 GB storage, 25 RCU/WCU | ~$0.25 per GB |
| API Gateway | 1M requests | ~$3.50 per 1M requests |
| S3 | 5 GB storage, 20K GET/2K PUT | ~$0.023 per GB |
| Amplify | 5 GB storage, 15 GB transfer | ~$0.15 per GB |
| **Total** | **Free for first year** | **~$5-10/month for small scale** |

## Troubleshooting Checklist

- [ ] Lambda functions have correct IAM permissions
- [ ] DynamoDB tables exist and have correct indexes
- [ ] API Gateway CORS is enabled
- [ ] Environment variables set in Lambda
- [ ] S3 bucket trigger configured
- [ ] Frontend API_BASE_URL is correct
- [ ] Student records exist in Student_Master
- [ ] CloudWatch Logs checked for errors

## Monitoring

- **CloudWatch Logs**: Monitor Lambda executions
- **API Gateway Metrics**: Monitor API usage
- **DynamoDB Metrics**: Monitor table performance
- **Amplify Console**: Monitor frontend deployments

## Security Best Practices

1. **API Keys**: Add API Gateway API keys for production
2. **Cognito Auth**: Implement AWS Cognito for frontend authentication
3. **IAM Roles**: Use least privilege principle
4. **VPC**: Deploy Lambdas in VPC if needed (advanced)
5. **SSL/TLS**: Always use HTTPS (Amplify/CloudFront provides this)

## Next Steps

1. Set up alerts in CloudWatch
2. Implement backup strategy for DynamoDB
3. Add logging and monitoring
4. Create runbook for common issues
5. Document API endpoints for team

## Support Resources

- AWS Lambda Documentation: https://docs.aws.amazon.com/lambda/
- API Gateway Documentation: https://docs.aws.amazon.com/apigateway/
- DynamoDB Documentation: https://docs.aws.amazon.com/dynamodb/
- Amplify Documentation: https://docs.amplify.aws/

