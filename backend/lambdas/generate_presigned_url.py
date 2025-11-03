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
    try:
        # Parse request body
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event.get('body', {})
        
        # Extract parameters
        date = body.get('date', '')
        lecture = body.get('lecture', 'upload')
        
        # Generate file name if not provided
        file_name = body.get('file_name')
        if not file_name:
            if date and lecture:
                file_name = f"uploads/{date}_{lecture.replace(' ', '_')}.xlsx"
            else:
                file_name = f"uploads/{context.request_id if hasattr(context, 'request_id') else 'upload'}.xlsx"
        
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
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': json.dumps({
                    'presigned_url': presigned_url,
                    'file_name': file_name,
                    'bucket': BUCKET_NAME,
                    'expires_in': expiration
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
                    'error': f'Error generating presigned URL: {str(e)}'
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

