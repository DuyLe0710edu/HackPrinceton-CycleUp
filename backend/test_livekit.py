"""
Test script for LiveKit token generation
"""
import os
import jwt
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get LiveKit API credentials from environment
api_key = os.getenv('LIVEKIT_API_KEY', 'devkey')
api_secret = os.getenv('LIVEKIT_API_SECRET', 'secret')
url = os.getenv('LIVEKIT_URL', 'ws://localhost:7880')

print(f"Using LiveKit API Key: {api_key}")
print(f"Using LiveKit URL: {url}")

try:
    # Using PyJWT to generate tokens directly
    print("\nGenerating token using PyJWT...")
    
    # Grant for the token
    grant = {
        "video": {
            "roomJoin": True,
            "room": "test-room",
            "canPublish": True,
            "canSubscribe": True
        }
    }
    
    # Create a token with the grant
    at = {
        "exp": int(time.time()) + 3600, # 1 hour
        "iss": api_key,
        "nbf": int(time.time()),
        "sub": "test-user",
        "video": grant["video"]
    }
    
    token = jwt.encode(at, api_secret, algorithm='HS256')
    print(f"Generated token: {token}")
    
    # Generate token for AI assistant (for testing)
    ai_grant = {
        "video": {
            "roomJoin": True,
            "room": "test-room",
            "canPublish": False,  # AI doesn't publish, only subscribe
            "canSubscribe": True
        }
    }
    
    ai_token_data = {
        "exp": int(time.time()) + 3600, # 1 hour
        "iss": api_key,
        "nbf": int(time.time()),
        "sub": "ai-assistant",
        "video": ai_grant["video"]
    }
    
    ai_token = jwt.encode(ai_token_data, api_secret, algorithm='HS256')
    print(f"Generated AI token: {ai_token}")

except Exception as e:
    print(f"Error generating token: {str(e)}") 