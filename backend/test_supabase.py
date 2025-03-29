"""
Test Supabase Connection Script
"""
import os
from dotenv import load_dotenv
from supabase import create_client
import json
from datetime import datetime

# Load environment variables
load_dotenv()

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    print("ERROR: Supabase URL and key must be provided in .env file")
    exit(1)

print(f"Connecting to Supabase at {supabase_url[:30]}...")

try:
    # Create client
    client = create_client(supabase_url, supabase_key)
    
    # Test connection by trying to select from the logs table
    print("Testing connection to the recognition_logs table...")
    
    try:
        response = client.table("recognition_logs").select("id").limit(1).execute()
        print("SUCCESS: Connected to Supabase!")
        print(f"Found {len(response.data)} records in recognition_logs table")
    except Exception as table_err:
        print(f"ERROR: Could connect to Supabase but couldn't query the table: {str(table_err)}")
        print("Make sure you've created the 'recognition_logs' table in Supabase")
    
    # Try to insert a test record
    print("\nTesting data insertion...")
    try:
        test_data = {
            "type_recognition": "Test",
            "log_info": json.dumps({"test": True, "timestamp": datetime.now().isoformat()}),
            "created_at": datetime.now().isoformat()
        }
        
        response = client.table("recognition_logs").insert(test_data).execute()
        print("SUCCESS: Test record inserted!")
        print(f"Response data: {response.data}")
    except Exception as insert_err:
        print(f"ERROR: Could not insert test record: {str(insert_err)}")
        
except Exception as e:
    print(f"ERROR: Could not connect to Supabase: {str(e)}")
    print("Please check your SUPABASE_URL and SUPABASE_KEY in the .env file") 