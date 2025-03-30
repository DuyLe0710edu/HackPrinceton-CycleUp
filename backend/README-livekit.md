# LiveKit Server Setup

This document provides instructions for setting up a LiveKit server for the AI Assistant voice chat functionality.

## What is LiveKit?

LiveKit is an open-source platform for building real-time audio, video, and data experiences. In this project, we're using it to enable voice chat between users and the AI Assistant.

## Option 1: Using the LiveKit Cloud Service

The easiest way to get started is to use LiveKit Cloud:

1. Sign up for a free account at [https://cloud.livekit.io](https://cloud.livekit.io)
2. Create a new project
3. Go to the "API Keys" section
4. Create a new API key
5. Copy the API Key and Secret to your `.env` file:
   ```
   LIVEKIT_API_KEY=your_api_key
   LIVEKIT_API_SECRET=your_api_secret
   LIVEKIT_URL=wss://your-project.livekit.cloud
   ```

## Option 2: Running LiveKit Server Locally

For development or self-hosting, you can run LiveKit server locally:

### Using Docker

The easiest way to run LiveKit server locally is with Docker:

```bash
docker run --rm -p 7880:7880 \
    -p 7881:7881 \
    -p 7882:7882/udp \
    -e LIVEKIT_KEYS="devkey: secret" \
    livekit/livekit-server
```

Update your `.env` file to use the local server:
```
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
LIVEKIT_URL=ws://localhost:7880
```

### Using Binary

Alternatively, you can download the LiveKit CLI and run the server directly:

1. Download LiveKit CLI from [GitHub Releases](https://github.com/livekit/livekit-cli/releases)
2. Create a config file named `livekit.yaml`:
   ```yaml
   port: 7880
   rtc:
     port_range:
       start: 50000
       end: 60000
   keys:
     devkey: secret
   ```
3. Run the server:
   ```bash
   ./livekit-cli --dev --config livekit.yaml
   ```

## Testing the LiveKit Integration

Once the LiveKit server is running and configured in your `.env` file, you can test the voice chat feature:

1. Start your backend server
2. Start your frontend application
3. Navigate to the recognition page
4. Click the microphone button in the bottom right corner to open the voice chat
5. Allow microphone access when prompted
6. Start speaking to interact with the AI Assistant

## Troubleshooting

- If you're having connection issues, make sure your LiveKit server is accessible from your application.
- For local development, ensure that you're using `ws://` instead of `wss://` in the URL.
- Check browser console for any error messages related to LiveKit.
- Verify that the API key and secret in your `.env` file match what's configured on your LiveKit server. 