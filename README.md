# Student Entry and Attendance Management System

A complete, production-grade, cloud-based attendance management system using AWS Serverless architecture and IoT integration.

## 🎯 Overview

This system automates student attendance tracking using:
- **ESP32 + RFID** for automatic student entry logging
- **Faculty Excel uploads** for lecture-wise attendance
- **AWS Serverless backend** for data processing and analytics
- **React frontend** for visualization, uploads, and reporting

## ✨ Features

- ✅ **IoT Entry Logging**: ESP32 RFID scanner sends entry data to AWS
- ✅ **Excel Upload Processing**: Faculty can upload attendance Excel files
- ✅ **Automatic Comparison**: System compares IoT data with uploaded attendance
- ✅ **Smart Status Calculation**: Computes Present, Absent, Proxy, and Bunk statuses
- ✅ **Analytics Dashboard**: Daily, weekly, monthly, and semester-level reports
- ✅ **Filtering & Export**: Filter by date, year, department, division; export to CSV
- ✅ **Real-time Updates**: CloudWatch integration for monitoring
- ✅ **AWS Free Tier Compatible**: Optimized for AWS free tier usage

## 🏗️ Architecture

```
┌─────────────┐
│   ESP32     │
│  + RFID     │─────┐
└─────────────┘     │
                    │ HTTP POST
                    ▼
            ┌───────────────┐
            │ API Gateway   │
            └───────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌─────────────┐        ┌─────────────────┐
│   Lambda    │        │   Lambda        │
│handle_entry │        │process_upload    │
└─────────────┘        └─────────────────┘
        │                       │
        └───────────┬───────────┘
                    │
                    ▼
            ┌───────────────┐
            │   DynamoDB    │
            │  (3 Tables)   │
            └───────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌─────────────┐        ┌─────────────────┐
│   Lambda    │        │   Lambda        │
│get_results  │        │get_analytics    │
└─────────────┘        └─────────────────┘
        │                       │
        └───────────┬───────────┘
                    │
                    ▼
            ┌───────────────┐
            │ React Frontend│
            │  (Amplify)    │
            └───────────────┘
```

## 📁 Project Structure

```
/project-root
│
├── frontend/                    # React + Vite frontend
│   ├── src/
│   │   ├── components/          # Dashboard, Charts, Tables
│   │   ├── pages/               # Upload page
│   │   ├── utils/               # API utilities, export functions
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── backend/                      # AWS Lambda functions
│   ├── lambdas/
│   │   ├── handle_entry_log.py         # Process IoT entries
│   │   ├── process_attendance_upload.py # Process Excel uploads
│   │   ├── get_results.py              # Get attendance results
│   │   └── get_analytics.py            # Get analytics
│   ├── dynamodb_schema.json
│   ├── requirements.txt
│   └── README.md
│
├── deployment/                   # Deployment guides
│   ├── dynamodb_setup.md
│   ├── api_gateway_setup.md
│   ├── s3_trigger_setup.md
│   ├── aws_amplify_setup.md
│   └── deployment_guide.md
│
├── esp32_example/                # ESP32 Arduino code
│   └── esp32_rfid_attendance.ino
│
└── README.md                     # This file
```

## 🚀 Quick Start

### Prerequisites

- AWS Account (Free Tier eligible)
- Node.js 18+ and npm
- Python 3.9+
- AWS CLI configured
- Arduino IDE (for ESP32)

### Step 1: Clone and Setup

```bash
# Clone repository
git clone <your-repo-url>
cd iot

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
pip install -r requirements.txt
```

### Step 2: Deploy Backend

1. **Create DynamoDB Tables**
   ```bash
   # Follow: deployment/dynamodb_setup.md
   ```

2. **Deploy Lambda Functions**
   ```bash
   # Follow: deployment/deployment_guide.md
   ```

3. **Set Up S3 Bucket**
   ```bash
   # Follow: deployment/s3_trigger_setup.md
   ```

4. **Configure API Gateway**
   ```bash
   # Follow: deployment/api_gateway_setup.md
   ```

### Step 3: Deploy Frontend

```bash
cd frontend

# Create .env file
echo "VITE_API_BASE_URL=https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod" > .env.local

# Test locally
npm run dev

# Deploy to AWS Amplify
# Follow: deployment/aws_amplify_setup.md
```

### Step 4: Configure ESP32

1. Open `esp32_example/esp32_rfid_attendance.ino` in Arduino IDE
2. Install required libraries:
   - MFRC522 (by GithubCommunity)
   - ESP32 board support
3. Update WiFi credentials and API Gateway URL
4. Upload to ESP32
5. Connect RFID module (see code comments for pinout)

### Step 5: Populate Student Data

Add students to DynamoDB `Student_Master` table:

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

## 📊 DynamoDB Schema

### Student_Master
- **PK**: `student_id` (String)
- **GSI**: `rfid-uid-index` on `rfid_uid`
- Fields: `rfid_uid`, `name`, `year`, `department`, `division`

### Entry_Log
- **PK**: `log_id` (String)
- **GSI**: `date-index`, `student-id-index`
- Fields: `rfid_uid`, `student_id`, `timestamp`, `date`

### Final_Attendance
- **PK**: `attendance_id` (String)
- **GSI**: `student-id-index`, `date-index`
- Fields: `student_id`, `rfid_uid`, `date`, `lecture`, `status`

## 🔌 API Endpoints

### POST `/entry`
Receive IoT entry log from ESP32.

**Request:**
```json
{
  "rfid_uid": "A1B2C3D4",
  "timestamp": "2025-11-03T09:30:00Z",
  "date": "2025-11-03"
}
```

### GET `/results`
Get attendance results with optional filters.

**Query Parameters:**
- `date` (optional): YYYY-MM-DD
- `year`, `department`, `division`, `status` (optional)
- `start_date`, `end_date` (optional): Date range

### GET `/analytics`
Get analytics data.

**Query Parameters:**
- `period` (optional): daily/weekly/monthly/semester
- `year`, `department`, `division` (optional)
- `start_date`, `end_date` (optional)

## 📝 Excel Upload Format

Upload Excel/CSV files with:
- **Required**: `student_id` OR `rfid_uid` column
- **Optional**: `name`, `lecture`, `date`

Example:
```
student_id | name       | lecture
-----------|------------|----------
STU001     | John Doe   | Lecture 1
STU002     | Jane Smith | Lecture 1
```

## 💰 Cost Estimation

All components optimized for **AWS Free Tier**:

| Service | Free Tier | Monthly (After) |
|---------|-----------|-----------------|
| Lambda | 1M requests | ~$0.20/1M |
| DynamoDB | 25 GB storage | ~$0.25/GB |
| API Gateway | 1M requests | ~$3.50/1M |
| S3 | 5 GB storage | ~$0.023/GB |
| Amplify | 5 GB storage | ~$0.15/GB |

**Total: Free for first year, ~$5-10/month for small scale**

## 🔧 Configuration

### Environment Variables

**Lambda Functions:**
- `ENTRY_LOG_TABLE`: DynamoDB table name
- `STUDENT_MASTER_TABLE`: DynamoDB table name
- `FINAL_ATTENDANCE_TABLE`: DynamoDB table name

**Frontend:**
- `VITE_API_BASE_URL`: API Gateway endpoint URL

**ESP32:**
- `ssid`: WiFi SSID
- `password`: WiFi password
- `apiGatewayUrl`: API Gateway endpoint URL

## 📚 Documentation

- [DynamoDB Setup](deployment/dynamodb_setup.md)
- [API Gateway Setup](deployment/api_gateway_setup.md)
- [S3 Trigger Setup](deployment/s3_trigger_setup.md)
- [Amplify Setup](deployment/aws_amplify_setup.md)
- [Complete Deployment Guide](deployment/deployment_guide.md)
- [Backend README](backend/README.md)

## 🧪 Testing

### Test IoT Entry
```bash
curl -X POST https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod/entry \
  -H "Content-Type: application/json" \
  -d '{"rfid_uid":"A1B2C3D4","timestamp":"2025-11-03T09:30:00Z","date":"2025-11-03"}'
```

### Test Results API
```bash
curl "https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod/results?date=2025-11-03"
```

### Test Analytics API
```bash
curl "https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod/analytics?period=daily"
```

## 🐛 Troubleshooting

### Common Issues

1. **Lambda timeout**: Increase timeout and memory
2. **CORS errors**: Verify API Gateway CORS configuration
3. **DynamoDB errors**: Check IAM permissions
4. **S3 trigger not firing**: Verify event notification configuration
5. **ESP32 connection issues**: Check WiFi credentials and API URL

### Monitoring

- **CloudWatch Logs**: Monitor Lambda executions
- **API Gateway Metrics**: Monitor API usage
- **DynamoDB Metrics**: Monitor table performance

## 🔐 Security Best Practices

1. Use API Gateway API keys for production
2. Implement AWS Cognito for authentication
3. Use least privilege IAM roles
4. Enable S3 bucket encryption
5. Use HTTPS only (Amplify/CloudFront)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is provided as-is for educational and production use.

## 🙏 Acknowledgments

- AWS for serverless infrastructure
- React and Vite teams for frontend framework
- MFRC522 library for RFID functionality

## 📞 Support

For issues and questions:
1. Check documentation in `deployment/` folder
2. Review CloudWatch Logs for errors
3. Verify all AWS services are configured correctly

---

**Built with ❤️ using AWS Serverless Architecture**

