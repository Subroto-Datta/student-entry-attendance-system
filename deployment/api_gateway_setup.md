# API Gateway Setup Guide

This guide explains how to set up AWS API Gateway to expose Lambda functions as REST endpoints.

## Prerequisites

- All Lambda functions deployed (see `deployment_guide.md`)
- DynamoDB tables created (see `dynamodb_setup.md`)
- Lambda functions configured with environment variables

## Step 1: Create API Gateway REST API

### Via AWS Console

1. Go to **API Gateway** → **Create API**
2. Choose **REST API** → **Build**
3. Choose **New API**
4. API name: `attendance-management-api`
5. Endpoint type: **Regional** (cost-effective, free tier eligible)
6. Click **Create API**

## Step 2: Create Resources and Methods

### 2.1 Create `/entry` Resource (POST)

1. Click **Actions** → **Create Resource**
   - Resource name: `entry`
   - Resource path: `entry`
   - Enable CORS: **Yes** (optional, we'll configure separately)
   - Click **Create Resource**

2. Select `/entry` resource → **Actions** → **Create Method** → **POST**
   - Integration type: **Lambda Function**
   - Lambda Region: Your region (e.g., `us-east-1`)
   - Lambda Function: Select `handle_entry_log`
   - Click **Save** → **OK** (grant API Gateway permission)

### 2.2 Create `/results` Resource (GET)

1. Create resource: `results`
2. Create **GET** method
   - Integration type: **Lambda Function**
   - Lambda Function: `get_results`
   - Click **Save**

3. Configure **Method Request**:
   - Click on **GET** method
   - Go to **Method Request**
   - Expand **URL Query String Parameters**
   - Add query strings:
     - `date` (optional)
     - `year` (optional)
     - `department` (optional)
     - `division` (optional)
     - `status` (optional)
     - `start_date` (optional)
     - `end_date` (optional)

### 2.3 Create `/analytics` Resource (GET)

1. Create resource: `analytics`
2. Create **GET** method
   - Integration type: **Lambda Function**
   - Lambda Function: `get_analytics`
   - Click **Save**

3. Configure **Method Request**:
   - Add query strings:
     - `period` (optional)
     - `year` (optional)
     - `department` (optional)
     - `division` (optional)
     - `start_date` (optional)
     - `end_date` (optional)

### 2.4 (Optional) Create `/upload` Resource (POST)

If you want direct file upload via API Gateway instead of S3:

1. Create resource: `upload`
2. Create **POST** method
   - Integration type: **Lambda Function**
   - Lambda Function: `process_attendance_upload`
   - Click **Save**

## Step 3: Enable CORS

For each resource that needs CORS:

1. Select the resource (e.g., `/entry`)
2. **Actions** → **Enable CORS**
3. Configure:
   - Access-Control-Allow-Origin: `*` (or your frontend domain)
   - Access-Control-Allow-Headers: `Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token`
   - Access-Control-Allow-Methods: `GET,POST,OPTIONS`
4. Click **Enable CORS and replace existing CORS headers**

## Step 4: Configure Lambda Integration Response

For proper error handling:

### 4.1 For `/entry` POST method:

1. Click on **POST** method under `/entry`
2. Go to **Integration Response**
3. Expand **Default** response (200)
4. Click **Add Integration Response**:
   - Status: `400`
   - Selection pattern: `.*"statusCode":\s*400.*`
   - Click **Save**

5. Repeat for status codes: `404`, `500`

### 4.2 Configure Response Templates

1. Under Integration Response → Expand status code
2. Expand **Mapping Templates**
3. Content-Type: `application/json`
4. Template: `$input.path('$')`
5. Click **Save**

## Step 5: Deploy API

1. Click **Actions** → **Deploy API**
2. Deployment stage: **New Stage**
   - Stage name: `prod` (or `dev`)
   - Stage description: `Production deployment`
3. Click **Deploy**

4. **Note the Invoke URL** (e.g., `https://abc123.execute-api.us-east-1.amazonaws.com/prod`)

## Step 6: Update Frontend Configuration

Update `frontend/src/utils/api.js`:

```javascript
const API_BASE_URL = 'https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod';
```

Or set environment variable:

```bash
# In frontend/.env
VITE_API_BASE_URL=https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod
```

## Step 7: Test Endpoints

### Test `/entry` endpoint:

```bash
curl -X POST https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod/entry \
  -H "Content-Type: application/json" \
  -d '{
    "rfid_uid": "A1B2C3D4",
    "timestamp": "2025-11-03T09:30:00Z",
    "date": "2025-11-03"
  }'
```

### Test `/results` endpoint:

```bash
curl "https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod/results?date=2025-11-03"
```

### Test `/analytics` endpoint:

```bash
curl "https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod/analytics?period=daily&start_date=2025-11-01&end_date=2025-11-03"
```

## Step 8: Set Up API Keys (Optional - For Production)

For rate limiting and security:

1. **API Gateway** → **API Keys** → **Create API Key**
2. Go to **Usage Plans** → **Create Usage Plan**
3. Add API stages and set rate limits
4. Attach API key to usage plan

## Cost Optimization (Free Tier)

- **API Gateway Free Tier**: 1 million requests/month (always free)
- **Regional endpoints** (free tier eligible)
- No data transfer charges within AWS Free Tier limits
- Monitor usage in AWS Cost Explorer

## Troubleshooting

### Error: "Lambda function not found"
- Verify Lambda function name matches exactly
- Check Lambda function exists in the same region as API Gateway

### Error: "CORS policy error"
- Ensure CORS is enabled on all resources
- Check preflight OPTIONS method exists
- Verify Access-Control-Allow-Origin header

### Error: "Missing Authentication Token"
- Check API Gateway URL is correct
- Verify resource path matches exactly
- Ensure API is deployed

### 403 Forbidden
- Check Lambda execution role has DynamoDB permissions
- Verify API Gateway has permission to invoke Lambda

## API Endpoints Summary

| Endpoint | Method | Purpose | Query Parameters |
|----------|--------|---------|------------------|
| `/entry` | POST | Receive IoT entry logs | None |
| `/results` | GET | Get attendance results | date, year, department, division, status, start_date, end_date |
| `/analytics` | GET | Get analytics data | period, year, department, division, start_date, end_date |
| `/upload` | POST | Upload attendance file | None (body: multipart/form-data) |

## Next Steps

1. Configure S3 bucket and triggers (see `s3_trigger_setup.md`)
2. Set up frontend deployment (see `aws_amplify_setup.md`)
3. Test complete system end-to-end

