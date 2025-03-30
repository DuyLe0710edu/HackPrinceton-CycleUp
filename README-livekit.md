# LiveKit AI Voice Chat Integration

This integration adds voice chat capabilities to your AI Teacher Assistant, allowing users to speak with the AI using their microphone.

## What Has Been Added

1. **LiveKit Components**: 
   - A fully functional voice chat interface that appears when clicking the microphone button
   - Support for microphone toggling 
   - Visual indicators for speaking/muted status

2. **Backend Integration**:
   - Token generation for secure LiveKit connections
   - A dedicated voice chat API endpoint for processing spoken messages
   - Integration with existing AI processing

3. **Utility Functions**:
   - Helpers for fetching tokens
   - Data message handling between frontend and LiveKit

## How to Use

1. **Setup LiveKit Server**:
   - Follow instructions in `backend/README-livekit.md` to set up a LiveKit server
   - Add your LiveKit credentials to `backend/.env`

2. **Start the Application**:
   - Run your backend server: `cd backend && python app.py`
   - Run your frontend: `cd frontend && npm start`

3. **Using Voice Chat**:
   - Navigate to the recognition page
   - Click the microphone button in the bottom right corner
   - Allow microphone access when prompted
   - Start speaking to the AI Teacher Assistant

## How It Works

1. The LiveKit integration is wrapped around your existing MediaPipeRecognition component
2. When you click the microphone button, a voice chat widget appears
3. Your microphone input is processed and sent to the AI
4. The AI's response is shown in the chat and is available for text-to-speech

## Files Added

- `frontend/src/components/LiveKitComponent.js` - Main voice chat component
- `frontend/src/components/LiveKitComponent.css` - Styling for voice chat
- `frontend/src/components/LiveKitIntegrator.js` - Integration wrapper 
- `frontend/src/livekit-integration.js` - Utility functions
- `backend/livekit_service.py` - Token generation and room management
- `backend/README-livekit.md` - Server setup instructions

## Implementation Notes

- The integration is completely non-invasive - it doesn't modify any of your existing code
- Voice chat appears in a separate widget, not affecting your existing UI
- All LiveKit dependencies are properly isolated

## Troubleshooting

- If you can't connect to LiveKit, check your server configuration in `.env`
- If microphone access fails, ensure you've granted browser permissions
- For any other issues, check browser console for LiveKit-related errors 