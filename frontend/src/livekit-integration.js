/**
 * LiveKit integration utilities for AI Assistant
 */

/**
 * Fetches LiveKit tokens for AI and user from the backend
 * @param {string} userId - Optional user ID
 * @returns {Promise<Object>} - Token data including AI and user tokens
 */
export const fetchLiveKitTokens = async (userId = null) => {
  try {
    // Generate a default user ID if none provided
    const defaultUserId = userId || `user-${Date.now()}`;
    
    // Make API call to get tokens - this will be proxied to the backend via the proxy setting in package.json
    const response = await fetch(`/api/livekit/token?user_id=${defaultUserId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch LiveKit tokens: ${response.statusText}`);
    }
    
    // Parse and return the token data
    return await response.json();
  } catch (error) {
    console.error('Error fetching LiveKit tokens:', error);
    throw error;
  }
};

/**
 * Sends a data message through LiveKit to the AI participant
 * @param {Room} room - LiveKit room instance
 * @param {string} message - Message to send
 * @param {Object} metadata - Additional metadata to include
 */
export const sendMessageToAI = (room, message, metadata = {}) => {
  if (!room) return;
  
  try {
    const payload = JSON.stringify({
      type: 'user-message',
      message,
      timestamp: Date.now(),
      ...metadata
    });
    
    // Send the message to all participants (AI will pick it up)
    room.localParticipant.publishData(new TextEncoder().encode(payload), 'chat');
  } catch (error) {
    console.error('Error sending message to AI:', error);
  }
};

/**
 * Formats a speech prompt for the AI to speak
 * @param {string} message - The text content to be spoken
 * @returns {Object} - Formatted data object
 */
export const formatSpeechPrompt = (message) => {
  return {
    type: 'speech',
    content: message,
    timestamp: Date.now()
  };
};

/**
 * Parses a data message received from LiveKit
 * @param {Uint8Array} data - Binary data from LiveKit
 * @returns {Object|null} - Parsed message or null if invalid
 */
export const parseDataMessage = (data) => {
  try {
    const textDecoder = new TextDecoder();
    const jsonString = textDecoder.decode(data);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error parsing data message:', error);
    return null;
  }
}; 