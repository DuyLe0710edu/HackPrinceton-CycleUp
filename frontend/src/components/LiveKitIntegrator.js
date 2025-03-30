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
          bottom: '24px',
          right: '24px',
          zIndex: 1000,
          background: 'linear-gradient(135deg, #4F46E5, #6366F1)',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '60px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 6px 16px rgba(79, 70, 229, 0.3)',
          cursor: 'pointer',
          fontSize: '24px',
          transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
          transform: showVoiceChat ? 'scale(0.92)' : 'scale(1)'
        }}
      >
        {showVoiceChat ? '✕' : '🎤'}
      </button>
      
      {/* LiveKit component (voice chat) */}
      {showVoiceChat && liveKitData && (
        <div 
          className="voice-chat-container"
          style={{
            position: 'fixed',
            bottom: '100px',
            right: '24px',
            width: '380px',
            maxWidth: 'calc(100vw - 48px)',
            backgroundColor: 'white',
            borderRadius: '16px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1), 0 6px 12px rgba(0, 0, 0, 0.08)',
            zIndex: 1000,
            overflow: 'hidden',
            border: '1px solid rgba(230, 230, 230, 0.8)',
            animation: 'slideIn 0.3s ease forwards'
          }}
        >
          <div className="voice-chat-header" style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(240, 240, 240, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(to right, rgba(249, 250, 251, 0.8), white)'
          }}>
            <h3 style={{ 
              margin: 0, 
              fontSize: '17px', 
              fontWeight: '600',
              color: '#1F2937',
              letterSpacing: '0.01em'
            }}>Voice Chat with AI Teacher</h3>
            <button 
              onClick={toggleVoiceChat}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#6B7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(243, 244, 246, 0.8)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
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
          bottom: '100px', 
          right: '24px',
          padding: '12px 16px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          border: '1px solid rgba(230, 230, 240, 0.7)'
        }}>
          <div style={{
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            border: '2px solid rgba(99, 102, 241, 0.3)',
            borderTopColor: '#6366F1',
            animation: 'spin 0.8s linear infinite'
          }}></div>
          <span style={{ fontSize: '14px', fontWeight: '500', color: '#4B5563' }}>
            Initializing voice chat...
          </span>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div style={{ 
          position: 'fixed', 
          bottom: '100px', 
          right: '24px',
          padding: '12px 16px',
          backgroundColor: 'white',
          color: '#DC2626',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          border: '1px solid rgba(252, 165, 165, 0.5)',
          maxWidth: '300px'
        }}>
          <div style={{ 
            fontSize: '18px',
            color: '#DC2626'
          }}>⚠️</div>
          <span style={{ fontSize: '14px', fontWeight: '500' }}>
            {error}
          </span>
        </div>
      )}
      
      <style>
        {`
          @keyframes slideIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default LiveKitIntegrator; 