import os
import jwt
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# LiveKit server configuration
LIVEKIT_API_KEY = os.getenv('LIVEKIT_API_KEY', 'devkey')
LIVEKIT_API_SECRET = os.getenv('LIVEKIT_API_SECRET', 'secret')
LIVEKIT_URL = os.getenv('LIVEKIT_URL', 'ws://localhost:7880')

print(f"LiveKit service initialized with URL: {LIVEKIT_URL}")
print(f"API Key present: {'Yes' if LIVEKIT_API_KEY and LIVEKIT_API_KEY != 'devkey' else 'No'}")
print(f"API Secret present: {'Yes' if LIVEKIT_API_SECRET and LIVEKIT_API_SECRET != 'secret' else 'No'}")

def create_room_if_not_exists(room_name):
    """
    Creates a LiveKit room if it doesn't already exist
    Note: With the Python SDK, we're not creating rooms explicitly
    The room will be created automatically when the first user joins
    """
    # Return success by default since the room will be created automatically
    return True

def generate_token(room_name, participant_name, is_ai=False):
    """
    Generates a token for a participant to join a LiveKit room
    """
    try:
        print(f"Generating token for participant: {participant_name} in room: {room_name}")
        
        # Grant for the token
        video_grant = {
            "roomJoin": True,
            "room": room_name,
            "canPublish": not is_ai,  # AI doesn't publish, only subscribe
            "canSubscribe": True
        }
        
        # Create a token with the grant
        token_data = {
            "exp": int(time.time()) + 3600,  # 1 hour
            "iss": LIVEKIT_API_KEY,
            "nbf": int(time.time()),
            "sub": participant_name,
            "video": video_grant
        }
        
        # Generate the JWT token
        token = jwt.encode(token_data, LIVEKIT_API_SECRET, algorithm='HS256')
        
        print(f"Token generated successfully for {participant_name}")
        
        # Return the token
        return token
        
    except Exception as e:
        print(f"Error generating token: {str(e)}")
        raise

def get_ai_and_user_tokens(room_name, user_name="user"):
    """
    Convenience method to get tokens for both AI and user
    """
    try:
        print(f"Getting tokens for room: {room_name}, user: {user_name}")
        
        ai_token = generate_token(room_name, "ai-assistant", is_ai=True)
        user_token = generate_token(room_name, user_name)
        
        result = {
            "ai_token": ai_token,
            "user_token": user_token,
            "room": room_name,
            "livekit_url": LIVEKIT_URL
        }
        
        print("Successfully generated tokens for AI and user")
        return result
        
    except Exception as e:
        print(f"Error in get_ai_and_user_tokens: {str(e)}")
        raise 