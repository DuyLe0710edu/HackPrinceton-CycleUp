"""
Database connector for MediaPipe recognition data
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

# Global client instance
_client = None

def get_client():
    """Get or create Supabase client instance"""
    global _client
    if _client is None:
        if not supabase_url or not supabase_key:
            raise ValueError("Supabase URL and key must be provided in .env file")
        _client = create_client(supabase_url, supabase_key)
    return _client

def store_recognition_data(recognition_type, log_data):
    """
    Store MediaPipe recognition data in Supabase
    
    Args:
        recognition_type (str): Type of recognition ("Face", "Pose", or "Gesture")
        log_data (dict): Recognition data to store
    
    Returns:
        dict: Response from Supabase
    """
    try:
        client = get_client()
        
        # Ensure recognition_type is valid
        if recognition_type not in ["Face", "Pose", "Gesture"]:
            raise ValueError(f"Invalid recognition type: {recognition_type}")
        
        # Prepare data for insertion
        data = {
            "type_recognition": recognition_type,
            "log_info": json.dumps(log_data),
            "created_at": datetime.now().isoformat()
        }
        
        # Insert data into recognition_logs table
        response = client.table("recognition_logs").insert(data).execute()
        
        return {"success": True, "data": response.data}
    
    except Exception as e:
        print(f"Error storing recognition data: {e}")
        return {"success": False, "error": str(e)}

def get_recognition_data(recognition_type=None, limit=100, offset=0):
    """
    Retrieve MediaPipe recognition data from Supabase
    
    Args:
        recognition_type (str, optional): Filter by type ("Face", "Pose", or "Gesture")
        limit (int, optional): Maximum number of records to return
        offset (int, optional): Offset for pagination
    
    Returns:
        dict: Response from Supabase
    """
    try:
        client = get_client()
        
        # Start the query
        query = client.table("recognition_logs").select("*")
        
        # Apply filters if recognition_type is provided
        if recognition_type:
            if recognition_type not in ["Face", "Pose", "Gesture"]:
                raise ValueError(f"Invalid recognition type: {recognition_type}")
            query = query.eq("type_recognition", recognition_type)
        
        # Apply pagination
        query = query.order("created_at", desc=True).limit(limit).offset(offset)
        
        # Execute the query
        response = query.execute()
        
        return {"success": True, "data": response.data}
    
    except Exception as e:
        print(f"Error retrieving recognition data: {e}")
        return {"success": False, "error": str(e)}

def create_tables_if_not_exist():
    """
    Check if the required tables exist, if not create them
    This is a minimal implementation for demonstration - in production,
    you'd want to use proper database migrations
    """
    try:
        client = get_client()
        
        # Check if table exists by trying to select from it
        try:
            client.table("recognition_logs").select("id").limit(1).execute()
            print("recognition_logs table exists")
            return {"success": True, "message": "Tables already exist"}
        except Exception:
            print("Creating recognition_logs table")
            
            # Create the table using SQL - need Supabase permissions to do this
            # In practice, you should create tables through the Supabase dashboard
            # This is just for demonstration
            sql = """
            CREATE TABLE IF NOT EXISTS recognition_logs (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                type_recognition TEXT CHECK (type_recognition IN ('Face', 'Pose', 'Gesture')),
                log_info JSONB
            );
            """
            
            # Execute raw SQL (requires additional permissions)
            # client.execute_sql(sql)
            
            return {
                "success": False, 
                "message": "Table creation through API not supported. Please create the table manually in Supabase dashboard."
            }
    
    except Exception as e:
        print(f"Error creating tables: {e}")
        return {"success": False, "error": str(e)} 