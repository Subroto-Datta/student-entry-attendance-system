# Timezone Fix - IST Implementation Guide

## Problem Summary
The system was experiencing timezone issues because:
1. **ESP32 RTC** was set to IST but sending timestamps as UTC (with `Z` suffix)
2. **Backend Lambda functions** were using `datetime.now()` which uses EU-North-1 region timezone
3. **Frontend** was correctly trying to convert UTC to IST, but timestamps were inconsistent

## Solution Implemented

### ✅ Backend Changes (Lambda Functions)

All Lambda functions now use **IST timezone** (UTC + 5 hours 30 minutes) for date/time calculations:

#### Files Modified:
1. **`backend/lambdas/get_entry_logs.py`**
   - Uses `datetime.utcnow() + timedelta(hours=5, minutes=30)` for IST date ranges
   - Default date range now calculated in IST

2. **`backend/lambdas/get_analytics.py`**
   - All date range calculations now use IST timezone
   - Properly handles daily/weekly/monthly/semester periods in IST

3. **`backend/lambdas/process_attendance_upload.py`**
   - Default dates use IST timezone
   - Lecture naming uses IST time

4. **`backend/lambdas/handle_entry_log.py`**
   - Already using `datetime.utcnow()` - no changes needed
   - Stores timestamps in UTC format with `Z` suffix

### ✅ Frontend Changes

**`frontend/src/utils/timezone.js`**
- Changed from manual offset calculation to browser's native timezone API
- Now uses `toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })`
- Properly handles all timestamp conversions from UTC to IST
- Accurate relative time calculations ("X hours ago")

### ✅ ESP32 Changes

**`esp32_example/esp32_rfid_attendance.ino`**
- ESP32 RTC remains set to IST (Indian Standard Time)
- **CRITICAL FIX**: Now converts IST to UTC before sending to backend
- Subtracts 19800 seconds (5.5 hours) to convert IST → UTC
- Date field sent in IST format (for correct daily grouping)
- Timestamp sent in UTC format (for consistent storage)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Data Flow                             │
└─────────────────────────────────────────────────────────┘

ESP32 RTC (IST) → Converts to UTC → Backend Lambda (stores UTC)
                                              ↓
                                     DynamoDB (UTC timestamps)
                                              ↓
                                     Frontend ← Converts UTC to IST
                                              ↓
                                     Display (IST)
```

## Deployment Steps

### 1. Deploy Backend Lambda Functions

**Option A: Via AWS Console**
```bash
# Navigate to each Lambda function and redeploy

# For each Lambda function:
# 1. Go to AWS Lambda Console
# 2. Select the function
# 3. Update the code from backend/lambdas/ directory
# 4. Click "Deploy"

Functions to update:
- handle_entry_log
- get_entry_logs
- get_analytics
- process_attendance_upload
```

**Option B: Using AWS CLI**
```bash
# Package and deploy each Lambda function

cd backend/lambda-deploy

# Update get-entry-logs
zip -r get-entry-logs.zip get-entry-logs/
aws lambda update-function-code \
  --function-name get-entry-logs \
  --zip-file fileb://get-entry-logs.zip \
  --region eu-north-1

# Update get-analytics
zip -r get-analytics.zip get-analytics/
aws lambda update-function-code \
  --function-name get-analytics \
  --zip-file fileb://get-analytics.zip \
  --region eu-north-1

# Update process-attendance-upload
zip -r process-attendance-upload.zip process-attendance-upload/
aws lambda update-function-code \
  --function-name process-attendance-upload \
  --zip-file fileb://process-attendance-upload.zip \
  --region eu-north-1

# Update handle-entry-log
zip -r handle-entry-log.zip handle-entry-log/
aws lambda update-function-code \
  --function-name handle-entry-log \
  --zip-file fileb://handle-entry-log.zip \
  --region eu-north-1
```

### 2. Deploy Frontend to AWS Amplify

**Option A: Git Push (if connected to Git)**
```bash
cd frontend
git add src/utils/timezone.js
git commit -m "Fix: Implement proper IST timezone handling"
git push

# AWS Amplify will automatically build and deploy
```

**Option B: Manual Build and Upload**
```bash
cd frontend

# Build the production version
npm run build

# Upload dist/ folder to AWS Amplify or your hosting service
```

**Option C: AWS Amplify Console**
1. Go to AWS Amplify Console
2. Select your app
3. Click "Redeploy this version" or trigger a new build
4. Wait for build to complete

### 3. Update ESP32 Firmware

**Steps:**
1. Open `esp32_example/esp32_rfid_attendance.ino` in Arduino IDE
2. Ensure RTC is set to IST time (your local time in India)
3. Upload the updated code to ESP32
4. Test by scanning an RFID card
5. Check CloudWatch Logs to verify UTC timestamps are being received

**Verification:**
```cpp
// The ESP32 will now send:
// - timestamp: "2024-01-15T08:30:00Z" (UTC - 5.5 hours from IST)
// - date: "2024-01-15" (IST date)
```

## Testing & Verification

### 1. Test Backend
```bash
# Test get-entry-logs endpoint
curl -X GET "https://YOUR-API-URL/prod/entry-logs?limit=10"

# Check CloudWatch Logs for timezone calculations
# Should see: "Date range: YYYY-MM-DD to YYYY-MM-DD" in IST
```

### 2. Test Frontend
1. Open the Live Attendance page
2. Check timestamps - they should display in IST
3. Verify "Time ago" is accurate (e.g., "5 minutes ago")
4. Check Dashboard analytics - dates should be in IST

### 3. Test ESP32
1. Scan an RFID card
2. Check serial monitor - you should see:
   ```
   Card detected. RFID UID: XXXXXXXX
   Timestamp: 2024-01-15T08:30:00Z, Date: 2024-01-15
   ✅ Entry log recorded successfully
   ```
3. Check CloudWatch Logs for `handle_entry_log`
4. Verify timestamp in DynamoDB is in UTC format

### 4. End-to-End Test
1. Scan RFID on ESP32 (e.g., at 14:00 IST = 08:30 UTC)
2. Wait a few seconds
3. Check Live Attendance page - should show "just now" or "X seconds ago"
4. Timestamp should display as "14:00 IST" (not 08:30)

## Timezone Reference

### IST (Indian Standard Time)
- **UTC Offset**: +5 hours 30 minutes (+05:30)
- **Time Zone**: Asia/Kolkata
- **Does NOT observe DST** (Daylight Saving Time)

### Calculations
```
UTC Time:     08:30:00
IST Time:     14:00:00 (UTC + 5:30)

IST Offset:   19800 seconds (5.5 hours × 3600)
```

### Example Conversions
| UTC Time       | IST Time       |
|----------------|----------------|
| 00:00:00       | 05:30:00       |
| 06:00:00       | 11:30:00       |
| 12:00:00       | 17:30:00       |
| 18:30:00       | 00:00:00 +1day |

## Common Issues & Troubleshooting

### Issue 1: Times still showing wrong timezone
**Solution:**
- Clear browser cache and reload
- Check CloudWatch Logs to verify Lambda is using UTC
- Verify ESP32 serial monitor shows UTC conversion

### Issue 2: ESP32 timestamps off by multiple hours
**Solution:**
- Check RTC time: `rtc.now()`
- Ensure RTC is set to IST (your local time)
- Verify UTC conversion: IST - 5.5 hours = UTC

### Issue 3: Frontend not displaying IST
**Solution:**
- Hard refresh browser (Ctrl+Shift+R)
- Check browser console for errors
- Verify `formatToIST()` function is being used

### Issue 4: "X days ago" instead of "X hours ago"
**Solution:**
- Check if timestamps have `Z` suffix (UTC indicator)
- Verify backend is sending proper ISO 8601 format
- Check if `getTimeAgoIST()` is handling timestamps correctly

## Monitoring

### CloudWatch Logs to Monitor
1. **`/aws/lambda/get_entry_logs`**
   - Look for: "Date range: YYYY-MM-DD to YYYY-MM-DD"
   - Should show IST dates

2. **`/aws/lambda/handle_entry_log`**
   - Look for: timestamp values with `Z` suffix
   - Should store UTC timestamps

3. **`/aws/lambda/get_analytics`**
   - Look for: "Fetching analytics for date range"
   - Should calculate IST date ranges

### DynamoDB Table Checks
```bash
# Check Entry_Log table
# Timestamps should be in format: "2024-01-15T08:30:00Z"
# Dates should be in format: "2024-01-15"

# Verify timestamps are UTC
# If RTC time is 14:00 IST, timestamp should be 08:30Z
```

## Rollback Plan

If issues occur, you can rollback:

### 1. Backend Rollback
- Go to AWS Lambda Console
- Select the function
- Click "Versions" tab
- Select previous version
- Update alias to point to previous version

### 2. Frontend Rollback
- In AWS Amplify Console
- Select previous successful deployment
- Click "Redeploy this version"

### 3. ESP32 Rollback
- Revert to previous version of `.ino` file
- Remove the UTC conversion lines (222-222)
- Re-upload to ESP32

## Summary

✅ **Backend**: All Lambda functions now use IST for date calculations, store UTC timestamps
✅ **Frontend**: Properly converts UTC to IST using browser's timezone API
✅ **ESP32**: Converts IST to UTC before sending to backend
✅ **DynamoDB**: Stores consistent UTC timestamps with IST dates

**Result**: All timestamps throughout the system are now consistent and display correctly in IST!

## Questions?

- Check CloudWatch Logs for detailed execution traces
- Verify API Gateway endpoints are returning expected data
- Test with different dates and times to ensure consistency
- Monitor for the next 24 hours to catch edge cases

