"""
Optional Lambda function to generate S3 presigned URLs for secure file uploads.
This enables direct browser-to-S3 uploads without exposing bucket credentials.
"""

import json
import boto3
import os
from datetime import timedelta
from botocore.exceptions import ClientError

# Initialize S3 client
s3_client = boto3.client('s3')
BUCKET_NAME = os.environ.get('UPLOAD_BUCKET_NAME', 'attendance-uploads-default')

def lambda_handler(event, context):
    """
    Generate presigned URL for S3 upload.
    
    Expected event structure:
    {
        "file_name": "uploads/2025-11-03_Lecture1.xlsx",
        "date": "2025-11-03",
        "lecture": "Lecture1",
        "content_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    }
    """
    # Handle CORS preflight OPTIONS request
    if event.get('httpMethod') == 'OPTIONS' or event.get('requestContext', {}).get('http', {}).get('method') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'POST,OPTIONS',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    try:
        # Parse request body - handle both Lambda Proxy and non-Proxy integrations
        # Lambda Proxy: body is in event['body'] as a string (or dict if already parsed)
        # Non-Proxy: body might be in event directly or event['body']
        
        body = {}
        
        # Check if body is a string (Lambda Proxy integration)
        if isinstance(event.get('body'), str):
            try:
            body = json.loads(event['body'])
                print(f"✅ Parsed body from string (Lambda Proxy)")
            except json.JSONDecodeError as e:
                print(f"❌ ERROR: Failed to parse body as JSON: {str(e)}")
                print(f"   Body string: {event.get('body')}")
                body = {}
        # Check if body is already a dict (sometimes happens)
        elif isinstance(event.get('body'), dict):
            body = event['body']
            print(f"✅ Body is already a dict")
        # Check if body is in event directly (non-Proxy integration)
        elif 'date' in event or 'lecture' in event or 'file_name' in event:
            body = event
            print(f"✅ Using event directly as body (non-Proxy integration)")
        else:
            body = event.get('body', {})
            print(f"⚠️ WARNING: Body not found in expected locations")
        
        # Also check for query string parameters (sometimes API Gateway puts them there)
        if not body or len(body) == 0:
            query_params = event.get('queryStringParameters') or {}
            if query_params:
                print(f"⚠️ WARNING: Body is empty, checking query parameters")
                body = query_params
                print(f"   Query params: {query_params}")
        
        # Log received request for debugging
        print(f"=== REQUEST PARSING DEBUG ===")
        print(f"Event keys: {list(event.keys())}")
        print(f"Event body type: {type(event.get('body'))}")
        print(f"Event body value: {event.get('body')}")
        print(f"Event body is None: {event.get('body') is None}")
        print(f"Event body is empty string: {event.get('body') == ''}")
        print(f"Parsed body: {json.dumps(body, indent=2)}")
        print(f"Body keys: {list(body.keys())}")
        print(f"Body is empty: {len(body) == 0}")
        
        # CRITICAL: If body is still empty, check if this is a Lambda Proxy integration issue
        if not body or len(body) == 0:
            print(f"❌ CRITICAL: Request body is EMPTY!")
            print(f"   This usually means Lambda Proxy integration is NOT enabled in API Gateway")
            print(f"   OR API Gateway is not configured to pass the request body")
            print(f"   Full event structure: {json.dumps({k: str(type(v).__name__) for k, v in event.items()}, indent=2)}")
        
        # Extract parameters - CRITICAL: date from request body is the SOURCE OF TRUTH
        # Try multiple field name variations
        date = body.get('date') or body.get('Date') or body.get('DATE') or ''
        lecture = body.get('lecture') or body.get('Lecture') or body.get('LECTURE') or 'upload'
        
        # Convert date to string and strip whitespace
        if date:
            date = str(date).strip()
        else:
            date = ''
        
        # Log extracted parameters with extensive debugging
        print(f"=== EXTRACTING PARAMETERS FROM REQUEST ===")
        print(f"Full request body: {json.dumps(body, indent=2)}")
        print(f"Request body keys: {list(body.keys())}")
        print(f"Request body type: {type(body)}")
        print(f"Extracted date: '{date}' (type: {type(date)}, empty: {not date}, length: {len(date) if date else 0})")
        print(f"Extracted lecture: '{lecture}'")
        
        # Validate date is present and not empty
        if not date:
            print(f"❌ CRITICAL ERROR: Date parameter is missing or empty in request body!")
            print(f"   Request body keys: {list(body.keys())}")
            print(f"   Full request body: {json.dumps(body, indent=2)}")
            print(f"   Checked for: 'date', 'Date', 'DATE'")
        else:
            print(f"✅ Date parameter found: '{date}'")
        
        # CRITICAL: Always regenerate filename with date from request body
        # This ensures we ALWAYS use the date the user selected, never what's in the filename
        import re
        import time
        from datetime import datetime
        
        # Get file extension from request filename or default to xlsx
        request_file_name = body.get('file_name', '')
        file_ext = 'xlsx'  # default
        if request_file_name:
            if '.' in request_file_name:
                file_ext = request_file_name.split('.')[-1]
            else:
                file_ext = 'xlsx'
        
        # Generate timestamp
        timestamp = int(time.time() * 1000)  # milliseconds timestamp
        
        # CRITICAL: Always use date from request body if provided
        # This is the SINGLE SOURCE OF TRUTH - what the user selected in the frontend
        date_clean = None
        
        # Check if date is provided and valid
        # CRITICAL: Date MUST be in YYYY-MM-DD format (exactly 10 characters)
        if date:
            date_str = str(date).strip()
            
            # Validate date format: YYYY-MM-DD (exactly 10 characters, format: YYYY-MM-DD)
            date_format_pattern = r'^\d{4}-\d{2}-\d{2}$'
            
            if len(date_str) == 10 and re.match(date_format_pattern, date_str):
                # Try to parse the date to ensure it's valid
                try:
                    # Parse the date to validate it's a real date
                    parsed_date = datetime.strptime(date_str, '%Y-%m-%d')
                    
                    # Verify the parsed date matches the input (handles invalid dates like Feb 30)
                    if parsed_date.strftime('%Y-%m-%d') == date_str:
                        date_clean = date_str
                        print(f"✅ VALID DATE FROM REQUEST: '{date_clean}' (format: YYYY-MM-DD)")
                    else:
                        print(f"❌ ERROR: Date parsing mismatch. Input: '{date_str}', Parsed: '{parsed_date.strftime('%Y-%m-%d')}'")
                        date_clean = None
                except ValueError as e:
                    print(f"❌ ERROR: Date format invalid or date does not exist: '{date_str}'")
                    print(f"   Error: {str(e)}")
                    print(f"   Expected format: YYYY-MM-DD (e.g., 2025-11-06)")
                    date_clean = None
            else:
                print(f"❌ ERROR: Date format incorrect!")
                print(f"   Expected: YYYY-MM-DD (exactly 10 characters)")
                print(f"   Received: '{date_str}' (length: {len(date_str)})")
                print(f"   Format check: {'PASSED' if re.match(date_format_pattern, date_str) else 'FAILED'}")
                date_clean = None
        else:
            date_clean = None
        
        # CRITICAL: Date from request body is MANDATORY
        # We MUST have a valid date - do NOT use today's date as fallback
        if not date_clean:
            # This is a critical error - return an error response
            error_msg = f"CRITICAL ERROR: No valid date provided in request body. Received: '{date}'"
            print(f"❌ {error_msg}")
            print(f"   Request body: {json.dumps(body)}")
            print(f"   Request body keys: {list(body.keys())}")
            
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS',
                    'Access-Control-Max-Age': '86400'
                },
                'body': json.dumps({
                    'error': 'Date is required',
                    'message': 'A valid date in YYYY-MM-DD format must be provided in the request body. Example: 2025-11-06',
                    'received_date': str(date) if date else 'EMPTY',
                    'expected_format': 'YYYY-MM-DD',
                    'example': '2025-11-06',
                    'request_body_keys': list(body.keys()),
                    'request_body': body
                }, indent=2)
            }
        
        # Use the validated date from request body
        file_name = f"uploads/{date_clean}_{lecture.replace(' ', '_')}_{timestamp}.{file_ext}"
        print(f"✅ SUCCESS: Using date from request body: {date_clean}")
        print(f"✅ Generated filename: {file_name}")
        
        # Final validation: ensure filename contains a valid date
        final_date_match = re.search(r'(\d{4}-\d{2}-\d{2})', file_name)
        if final_date_match:
            final_date = final_date_match.group(1)
            print(f"✅ Final filename date: {final_date}")
            else:
            print(f"❌ ERROR: Generated filename does not contain a valid date: {file_name}")
        
        # Log the filename being used for debugging
        print(f"📋 Final filename: {file_name}")
        print(f"📋 Date from request: '{date}'")
        print(f"📋 Lecture: '{lecture}'")
        
        # Determine content type
        content_type = body.get('content_type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        
        # Set expiration (1 hour)
        expiration = int(body.get('expiration', 3600))
        
        # Generate presigned URL
        try:
            presigned_url = s3_client.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': BUCKET_NAME,
                    'Key': file_name,
                    'ContentType': content_type
                },
                ExpiresIn=expiration
            )
            
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS',
                    'Access-Control-Max-Age': '86400'
                },
                'body': json.dumps({
                    'presigned_url': presigned_url,
                    'file_name': file_name,
                    'bucket': BUCKET_NAME,
                    'expires_in': expiration,
                    'date_used': date_clean if date_clean else 'NOT_PROVIDED',
                    'date_received': str(date) if date else 'EMPTY',
                    'debug': {
                        'request_body_keys': list(body.keys()),
                        'date_validation_passed': date_clean is not None,
                        'final_filename': file_name
                    }
                }, indent=2)
            }
            
        except ClientError as e:
            return {
                'statusCode': 500,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS',
                    'Access-Control-Max-Age': '86400'
                },
                'body': json.dumps({
                    'error': f'Error generating presigned URL: {str(e)}'
                })
            }
    
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'POST,OPTIONS',
                'Access-Control-Max-Age': '86400'
            },
            'body': json.dumps({
                'error': 'Invalid JSON in request body'
            })
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'POST,OPTIONS',
                'Access-Control-Max-Age': '86400'
            },
            'body': json.dumps({
                'error': f'Internal server error: {str(e)}'
            })
        }

