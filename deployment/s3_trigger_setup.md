# S3 Trigger Setup Guide

This guide explains how to configure S3 bucket to trigger Lambda function when Excel/CSV files are uploaded.

## Prerequisites

- Lambda function `process_attendance_upload` deployed
- Lambda execution role has S3 read permissions

## Step 1: Create S3 Bucket

### Via AWS Console

1. Go to **S3** → **Create bucket**
2. Bucket name: `attendance-uploads-<your-unique-id>` (must be globally unique)
3. AWS Region: Choose same region as Lambda functions
4. **Block Public Access**: Keep all settings enabled (we'll use private bucket)
5. Bucket Versioning: **Disable** (optional, to save costs)
6. Default encryption: **Enable** (SSE-S3 or SSE-KMS)
7. Click **Create bucket**

## Step 2: Configure Bucket Permissions

### 2.1 Bucket Policy (Optional)

For direct uploads from frontend, you may need a bucket policy. However, for security, we recommend using presigned URLs (see Step 4).

### 2.2 CORS Configuration

If uploading directly from browser:

1. Go to bucket → **Permissions** → **CORS**
2. Add CORS configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "POST", "GET"],
    "AllowedOrigins": ["*"],  // Replace with your frontend domain
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

## Step 3: Configure S3 Event Notification

### 3.1 Create Lambda Trigger

1. Go to your S3 bucket
2. Click **Properties** tab
3. Scroll to **Event notifications**
4. Click **Create event notification**

### 3.2 Configure Event Notification

- **Event name**: `AttendanceUploadTrigger`
- **Prefix** (optional): `uploads/` (to filter specific folder)
- **Suffix** (optional): `.xlsx` or `.csv` (to trigger only on Excel/CSV)
- **Event types**: Select:
  - ✅ **PUT** (when file is uploaded)
  - ✅ **POST** (when file is uploaded via POST)

**Note**: For simplicity, select **All object create events**

5. **Destination**: **Lambda function**
6. **Lambda function**: Select `process_attendance_upload`
7. Click **Save changes**

### 3.3 Grant S3 Permission to Invoke Lambda

AWS should prompt you to grant permission. If not:

1. Go to **Lambda** → `process_attendance_upload` function
2. Go to **Configuration** → **Triggers**
3. You should see S3 trigger listed
4. If not, go to **S3** → **Bucket** → **Properties** → **Event notifications** → Edit → Re-add Lambda function

Or manually add permission:

```bash
aws lambda add-permission \
  --function-name process_attendance_upload \
  --principal s3.amazonaws.com \
  --statement-id s3-trigger \
  --action "lambda:InvokeFunction" \
  --source-arn arn:aws:s3:::attendance-uploads-<your-bucket-id>
```

## Step 4: Update Lambda Function Permissions

Ensure Lambda can read from S3:

1. Go to **Lambda** → `process_attendance_upload`
2. **Configuration** → **Permissions**
3. Click on **Execution role**
4. Click **Add permissions** → **Create inline policy**
5. Use JSON editor:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:GetObjectVersion"
      ],
      "Resource": "arn:aws:s3:::attendance-uploads-<your-bucket-id>/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::attendance-uploads-<your-bucket-id>"
    }
  ]
}
```

6. Policy name: `S3ReadAttendanceUploads`
7. Click **Create policy**

## Step 5: (Optional) Create Presigned URL Lambda

For secure file uploads from frontend, create a Lambda function to generate presigned URLs:

### 5.1 Create Lambda Function: `generate_presigned_url`

```python
import json
import boto3
from datetime import timedelta

s3_client = boto3.client('s3')
BUCKET_NAME = os.environ.get('UPLOAD_BUCKET_NAME', 'attendance-uploads-<your-bucket-id>')

def lambda_handler(event, context):
    try:
        file_name = event.get('file_name', f"uploads/{event.get('date', 'default')}_{event.get('lecture', 'upload')}.xlsx")
        expiration = 3600  # 1 hour
        
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': BUCKET_NAME,
                'Key': file_name,
                'ContentType': event.get('content_type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            },
            ExpiresIn=expiration
        )
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'presigned_url': presigned_url,
                'file_name': file_name,
                'expires_in': expiration
            })
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)})
        }
```

### 5.2 Add API Gateway Endpoint

1. Create `/upload-url` resource in API Gateway
2. Create **POST** method pointing to `generate_presigned_url` Lambda
3. Frontend can call this to get presigned URL, then upload directly to S3

### 5.3 Update Frontend Upload

Modify `frontend/src/pages/UploadPage.jsx` to use presigned URL:

```javascript
// Get presigned URL
const response = await api.post('/upload-url', { file_name, date, lecture });
const { presigned_url } = response.data;

// Upload directly to S3
await axios.put(presigned_url, file, {
  headers: {
    'Content-Type': file.type
  }
});
```

## Step 6: Test S3 Trigger

### 6.1 Upload Test File

1. Go to S3 bucket
2. Click **Upload**
3. Select a test Excel file (see `backend/README.md` for format)
4. Upload to bucket

### 6.2 Verify Lambda Execution

1. Go to **Lambda** → `process_attendance_upload`
2. **Monitor** tab → **View CloudWatch Logs**
3. Check logs for processing output
4. Verify attendance records in DynamoDB `Final_Attendance` table

## Step 7: Configure Lifecycle Policies (Optional)

To save costs, auto-delete old files:

1. Go to bucket → **Management** → **Lifecycle rules**
2. Click **Create lifecycle rule**
3. Rule name: `DeleteOldUploads`
4. Scope: Apply to all objects
5. **Expiration**: Delete objects after **30 days** (or your preference)
6. Click **Create rule**

## Cost Optimization (Free Tier)

- **S3 Free Tier**: 5 GB storage, 20,000 GET requests, 2,000 PUT requests (first 12 months)
- **Lifecycle policies**: Help manage storage costs
- **Infrequent Access**: Consider S3 Intelligent-Tiering after free tier

## Folder Structure Recommendation

Organize uploads by date:

```
attendance-uploads-<bucket-id>/
├── 2025-11/
│   ├── 2025-11-03_Lecture1.xlsx
│   └── 2025-11-03_Lecture2.xlsx
└── 2025-12/
    └── ...
```

Update Lambda function to extract date from S3 key path if needed.

## Troubleshooting

### Lambda not triggered
- Check S3 event notification configuration
- Verify Lambda permission granted by S3
- Check CloudWatch Logs for errors
- Ensure file extension matches suffix filter

### Lambda errors reading S3 file
- Verify Lambda execution role has `s3:GetObject` permission
- Check bucket name in Lambda environment variable
- Verify object key path is correct

### Large file timeouts
- Increase Lambda timeout (max 15 minutes)
- Increase Lambda memory (helps with processing speed)
- Consider using S3 Batch Operations for very large files

## Next Steps

1. Test complete upload flow
2. Configure frontend to upload files (see `aws_amplify_setup.md`)
3. Monitor CloudWatch for any errors

