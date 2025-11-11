#!/usr/bin/env python3
"""
Quick script to verify if a student with specific RFID exists in DynamoDB.
Usage: python verify_student_exists.py <RFID_UID>
Example: python verify_student_exists.py 9A435818
"""

import boto3
import sys
import json
from botocore.exceptions import ClientError

def check_student(rfid_uid):
    """Check if student exists in Student_Master table"""
    try:
        # Initialize DynamoDB
        dynamodb = boto3.resource('dynamodb', region_name='eu-north-1')
        table = dynamodb.Table('Student_Master')
        
        print(f"\n🔍 Searching for student with RFID: {rfid_uid}")
        print("=" * 60)
        
        # Scan for student with matching RFID
        response = table.scan(
            FilterExpression='rfid_uid = :uid',
            ExpressionAttributeValues={':uid': rfid_uid}
        )
        
        if response.get('Items'):
            print("✅ STUDENT FOUND!\n")
            for student in response['Items']:
                print(json.dumps(student, indent=2, default=str))
            return True
        else:
            print("❌ STUDENT NOT FOUND in Student_Master table")
            print("\nTo fix this:")
            print("1. Go to DynamoDB Console: https://console.aws.amazon.com/dynamodb/")
            print("2. Open 'Student_Master' table")
            print("3. Click 'Create item'")
            print("4. Add the following attributes:")
            print(f"   - student_id: (e.g., 'STU001')")
            print(f"   - rfid_uid: '{rfid_uid}'")
            print(f"   - name: (student's name)")
            print(f"   - email: (optional)")
            print(f"   - phone: (optional)")
            return False
            
    except ClientError as e:
        print(f"❌ ERROR accessing DynamoDB: {e}")
        print("\nPossible issues:")
        print("1. AWS credentials not configured (run 'aws configure')")
        print("2. Insufficient permissions to access DynamoDB")
        print("3. Wrong region or table doesn't exist")
        return False
    except Exception as e:
        print(f"❌ UNEXPECTED ERROR: {e}")
        return False

def list_all_students():
    """List all students in Student_Master table"""
    try:
        dynamodb = boto3.resource('dynamodb', region_name='eu-north-1')
        table = dynamodb.Table('Student_Master')
        
        print("\n📋 ALL STUDENTS IN DATABASE:")
        print("=" * 60)
        
        response = table.scan()
        
        if response.get('Items'):
            for idx, student in enumerate(response['Items'], 1):
                print(f"\n{idx}. Student ID: {student.get('student_id', 'N/A')}")
                print(f"   Name: {student.get('name', 'N/A')}")
                print(f"   RFID: {student.get('rfid_uid', 'N/A')}")
                print(f"   Email: {student.get('email', 'N/A')}")
        else:
            print("No students found in database")
            
    except Exception as e:
        print(f"❌ ERROR listing students: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python verify_student_exists.py <RFID_UID>")
        print("Example: python verify_student_exists.py 9A435818")
        print("\nOr use --list to see all students:")
        print("python verify_student_exists.py --list")
        sys.exit(1)
    
    if sys.argv[1] == "--list":
        list_all_students()
    else:
        rfid_uid = sys.argv[1].upper().strip()
        exists = check_student(rfid_uid)
        sys.exit(0 if exists else 1)

