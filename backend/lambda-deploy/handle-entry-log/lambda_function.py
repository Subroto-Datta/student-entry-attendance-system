"""
Lambda function to handle IoT entry logs from ESP32 RFID scanner.
Receives POST requests with RFID UID, timestamp, and date.
Validates and stores entry logs in DynamoDB.
"""

import json
import boto3
import os
from datetime import datetime
from decimal import Decimal
from botocore.exceptions import ClientError

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
entry_log_table = dynamodb.Table(os.environ.get('ENTRY_LOG_TABLE', 'Entry_Log'))
student_master_table = dynamodb.Table(os.environ.get('STUDENT_MASTER_TABLE', 'Student_Master'))

def lambda_handler(event, context):
    """
    Main Lambda handler for processing entry logs.
    
    Expected event structure:
    {
        "rfid_uid": "A1B2C3D4",
        "timestamp": "2025-11-03T09:30:00Z",
        "date": "2025-11-03"
    }
    """
    try:
        # DEBUG: Log the incoming event
        print(f"DEBUG: Received event: {json.dumps(event)}")
        
        # Parse request body - handle multiple API Gateway formats
        body = {}
        
        # Case 1: Lambda Proxy Integration - body is a JSON string
        if 'body' in event and isinstance(event['body'], str):
            print("DEBUG: Parsing body as JSON string (Lambda Proxy format)")
            body = json.loads(event['body'])
        
        # Case 2: Lambda Proxy Integration - body is already a dict
        elif 'body' in event and isinstance(event['body'], dict):
            print("DEBUG: Body is already a dict")
            body = event['body']
        
        # Case 3: Direct invocation or non-proxy integration - data is in event root
        elif 'rfid_uid' in event:
            print("DEBUG: Data found in event root (non-proxy format)")
            body = event
        
        # Case 4: Nothing found
        else:
            print(f"DEBUG: Could not parse body. Event keys: {list(event.keys())}")
            body = {}
        
        print(f"DEBUG: Parsed body: {json.dumps(body)}")
        
        # Extract required fields
        rfid_uid = body.get('rfid_uid', '').strip() if body.get('rfid_uid') else ''
        timestamp = body.get('timestamp', '')
        date = body.get('date', '')
        
        print(f"DEBUG: Extracted fields - rfid_uid: '{rfid_uid}', timestamp: '{timestamp}', date: '{date}'")
        
        # Validate required fields
        if not rfid_uid or not timestamp or not date:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': json.dumps({
                    'error': 'Missing required fields: rfid_uid, timestamp, and date are required'
                })
            }
        
        # Verify student exists in Student_Master
        try:
            response = student_master_table.scan(
                FilterExpression='rfid_uid = :uid',
                ExpressionAttributeValues={':uid': rfid_uid}
            )
            
            if not response.get('Items'):
                return {
                    'statusCode': 404,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Methods': 'POST, OPTIONS'
                    },
                    'body': json.dumps({
                        'error': f'Student with RFID UID {rfid_uid} not found in database'
                    })
                }
            
            student = response['Items'][0]
            student_id = student['student_id']
            
        except ClientError as e:
            return {
                'statusCode': 500,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': json.dumps({
                    'error': f'Error validating student: {str(e)}'
                })
            }
        
        # Generate unique log ID
        log_id = f"{student_id}_{timestamp.replace(':', '-').replace('.', '-')}"
        
        # Create entry log item
        entry_log_item = {
            'log_id': log_id,
            'rfid_uid': rfid_uid,
            'student_id': student_id,
            'timestamp': timestamp,
            'date': date,
            'created_at': datetime.utcnow().isoformat() + 'Z'
        }
        
        # Store in DynamoDB
        try:
            entry_log_table.put_item(Item=entry_log_item)
            
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': json.dumps({
                    'message': 'Entry log recorded successfully',
                    'log_id': log_id,
                    'student_id': student_id,
                    'student_name': student.get('name', 'Unknown')
                })
            }
            
        except ClientError as e:
            return {
                'statusCode': 500,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': json.dumps({
                    'error': f'Error storing entry log: {str(e)}'
                })
            }
    
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
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
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({
                'error': f'Internal server error: {str(e)}'
            })
        }

