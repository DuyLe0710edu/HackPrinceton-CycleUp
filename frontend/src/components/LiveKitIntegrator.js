import React, { useState, useEffect, useRef } from 'react';
import { fetchLiveKitTokens } from '../livekit-integration';
import LiveKitComponent from './LiveKitComponent';

/**
 * LiveKitIntegrator component
 * This component handles the integration between your existing MediaPipeRecognition app
 * and the LiveKit voice chat functionality.
 */
const LiveKitIntegrator = ({ onSendMessage, onMessageReceived, children }) => {
  const [liveKitData, setLiveKitData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showVoiceChat, setShowVoiceChat] = useState(false);
  
  // Reference to the LiveKit component
  const liveKitRef = useRef(null);

  // Fetch LiveKit tokens on component mount
  useEffect(() => {
    const getLiveKitTokens = async () => {
      try {
        setIsLoading(true);
        const tokenData = await fetchLiveKitTokens();
        setLiveKitData(tokenData);
        setError(null);
      } catch (err) {
        console.error('Failed to get LiveKit tokens:', err);
        setError('Failed to initialize voice chat. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    getLiveKitTokens();
  }, []);

  // Handle sending messages to the LiveKit component
  const handleSendToLiveKit = (message, metadata = {}) => {
    if (liveKitRef.current) {
      liveKitRef.current.sendMessage(message, metadata);
    }
  };

  // Handle receiving messages from the LiveKit component
  const handleMessageFromLiveKit = (message) => {
    if (onMessageReceived && typeof onMessageReceived === 'function') {
      onMessageReceived(message);
    }
  };

  // Toggle voice chat visibility
  const toggleVoiceChat = () => {
    setShowVoiceChat(prev => !prev);
  };

  return (
    <div className="livekit-integrator">
      {/* Original children (your MediaPipeRecognition component) */}
      {children}
      
      {/* Voice chat toggle button */}
      <button 
        className="voice-chat-toggle"
        onClick={toggleVoiceChat}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1000,
          backgroundColor: '#4F46E5',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '60px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          cursor: 'pointer',
          fontSize: '24px'
        }}
      >
        🎤
      </button>
      
      {/* LiveKit component (voice chat) */}
      {showVoiceChat && liveKitData && (
        <div 
          className="voice-chat-container"
          style={{
            position: 'fixed',
            bottom: '90px',
            right: '20px',
            width: '350px',
            maxWidth: 'calc(100vw - 40px)',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            overflow: 'hidden'
          }}
        >
          <div className="voice-chat-header" style={{
            padding: '12px 16px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>Voice Chat with AI Teacher</h3>
            <button 
              onClick={toggleVoiceChat}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
          
          <LiveKitComponent
            ref={liveKitRef}
            url={liveKitData.livekit_url}
            token={liveKitData.user_token}
            roomName={liveKitData.room}
            onMessage={handleMessageFromLiveKit}
          />
        </div>
      )}
      
      {/* Loading indicator */}
      {isLoading && (
        <div style={{ 
          position: 'fixed', 
          bottom: '90px', 
          right: '20px',
          padding: '10px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          zIndex: 1000
        }}>
          Initializing voice chat...
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div style={{ 
          position: 'fixed', 
          bottom: '90px', 
          right: '20px',
          padding: '10px',
          backgroundColor: 'rgba(254, 226, 226, 0.9)',
          color: '#DC2626',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          zIndex: 1000
        }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default LiveKitIntegrator; 