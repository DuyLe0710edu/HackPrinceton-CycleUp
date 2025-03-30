import React, { useState, useEffect, useRef } from 'react';
import './KindergartenAssistant.css';
import mediaStateService from '../services/mediaStateService';

const KindergartenAssistant = ({ onSendMessage }) => {
  const [inputMessage, setInputMessage] = useState('');
  const [messageHistory, setMessageHistory] = useState([
    { 
      sender: 'assistant', 
      text: 'Hello there! I\'m your Kindergarten Assistant. I can help analyze movements and provide insights based on the camera feed. What would you like to know about the classroom activities?' 
    }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Local state for camera data from service
  const [detectionStats, setDetectionStats] = useState({
    face: 0,
    pose: 0,
    gesture: 0,
    fps: 0
  });
  const [cameraRunning, setCameraRunning] = useState(false);
  const [insightsData, setInsightsData] = useState([]);
  
  // Add backend URL config for API calls
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
  
  const messagesEndRef = useRef(null);
  
  // Subscribe to the mediaStateService
  useEffect(() => {
    // Subscribe to detection stats
    const detectionStatsUnsubscribe = mediaStateService.subscribe(
      'detectionStats',
      (stats) => {
        setDetectionStats(stats);
      }
    );
    
    // Subscribe to camera status
    const cameraStatusUnsubscribe = mediaStateService.subscribe(
      'cameraStatus',
      (isRunning) => {
        setCameraRunning(isRunning);
      }
    );
    
    // Subscribe to activity insights
    const insightsUnsubscribe = mediaStateService.subscribe(
      'activityInsights',
      (insights) => {
        setInsightsData(insights);
      }
    );
    
    // Get initial state
    const currentState = mediaStateService.getState();
    setDetectionStats(currentState.detectionStats);
    setCameraRunning(currentState.cameraRunning);
    setInsightsData(currentState.activityInsights);
    
    // Clean up subscriptions on unmount
    return () => {
      detectionStatsUnsubscribe();
      cameraStatusUnsubscribe();
      insightsUnsubscribe();
    };
  }, []);
  
  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messageHistory]);

  const handleSendMessage = () => {
    if (inputMessage.trim() === '') return;
    
    // Add user message to history
    setMessageHistory(prev => [
      ...prev, 
      { sender: 'user', text: inputMessage }
    ]);
    
    // Show typing indicator
    setIsProcessing(true);
    setMessageHistory(prev => [
      ...prev,
      { sender: 'assistant', typing: true }
    ]);
    
    // Get the most recent activity insight if available
    const latestActivity = insightsData.length > 0 ? insightsData[0].text : '';
    
    // Get emotional state based on current stats (simplified version)
    let emotionData = 'Unknown';
    if (detectionStats.face > 0) {
      emotionData = 'Active engagement detected';
    }
    
    // Use the same API endpoint as MediaPipeRecognition
    fetch(`${backendUrl}/api/chat/kindergarten-teacher`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: inputMessage,
        activity_data: latestActivity,
        emotion_data: emotionData
      })
    })
    .then(response => response.json())
    .then(data => {
      // Remove the typing indicator
      setMessageHistory(prev => prev.filter(msg => !msg.typing));
      
      if (data.success) {
        // Add the AI response
        setMessageHistory(prev => [...prev, { 
          sender: 'assistant', 
          text: data.response
        }]);
      } else {
        // Add fallback response in case of error
        setMessageHistory(prev => [...prev, { 
          sender: 'assistant', 
          text: "I'm sorry, I'm having a little trouble with my thinking right now. Can we try talking again in a moment?"
        }]);
        console.error('Error from kindergarten teacher AI:', data.error);
      }
    })
    .catch(error => {
      // Remove the typing indicator
      setMessageHistory(prev => prev.filter(msg => !msg.typing));
      
      // Add fallback response
      setMessageHistory(prev => [...prev, { 
        sender: 'assistant', 
        text: "Oh dear, it seems I can't connect to my thinking help right now. Let's chat again in a little bit, okay?"
      }]);
      console.error('Error calling kindergarten teacher API:', error);
    });
    
    // If external handler exists, call it too
    if (onSendMessage) {
      onSendMessage(inputMessage);
    }
    
    setInputMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="kindergarten-assistant-page">
      {/* Info Sidebar */}
      <div className="assistant-sidebar">
        <div className="assistant-sidebar-header">
          <h2>Kindergarten Assistant</h2>
          <div className="camera-status">
            <div className={`status-indicator ${cameraRunning ? 'active' : ''}`}></div>
            <span>{cameraRunning ? 'Camera Active' : 'Camera Inactive'}</span>
          </div>
        </div>
        
        <div className="assistant-sidebar-content">
          <div className="assistant-section">
            <h3>About</h3>
            <p>
              I'm your Kindergarten Assistant. I can analyze camera movements and provide real-time feedback based on the camera feed. I can suggest classroom activities, answer questions about proper behavior, and track children's engagement.
            </p>
          </div>
          
          <div className="assistant-section">
            <h3>Camera Status</h3>
            <div className="detection-stats">
              <div className="stat-item">
                <span className="stat-label">Face Detection</span>
                <span className="stat-value">{detectionStats.face || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Pose Detection</span>
                <span className="stat-value">{detectionStats.pose || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Gesture Recognition</span>
                <span className="stat-value">{detectionStats.gesture || 0}</span>
              </div>
              {detectionStats.fps > 0 && (
                <div className="stat-item">
                  <span className="stat-label">FPS</span>
                  <span className="stat-value">{detectionStats.fps || 0}</span>
                </div>
              )}
            </div>
          </div>
          
          {insightsData.length > 0 && (
            <div className="assistant-section">
              <h3>Recent Insights</h3>
              <div className="insights-list">
                {insightsData.slice(0, 5).map((insight, index) => (
                  <div key={index} className="insight-item">
                    <div className="insight-time">{insight.time || (new Date()).toLocaleTimeString()}</div>
                    <div className="insight-text">{insight.text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="assistant-tips">
            <h3>Tips</h3>
            <ul>
              <li>Ask about detected faces in the classroom</li>
              <li>Get suggestions for engaging classroom activities</li>
              <li>Inquire about appropriate childhood behaviors</li>
              <li>Get real-time feedback on classroom movement</li>
              <li>Ask for help managing classroom energy levels</li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Chat Area */}
      <div className="assistant-chat">
        <div className="chat-messages-container">
          {messageHistory.length === 0 ? (
            <div className="welcome-message">
              <div className="welcome-icon">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="24" height="24" rx="12" fill="#4CAF50" fillOpacity="0.1"/>
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#4CAF50" strokeWidth="2"/>
                  <path d="M8 14C8.91221 15.2144 10.3645 16 12.0004 16C13.6362 16 15.0885 15.2144 16.0007 14" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M9 10C9.55228 10 10 9.55228 10 9C10 8.44772 9.55228 8 9 8C8.44772 8 8 8.44772 8 9C8 9.55228 8.44772 10 9 10Z" fill="#4CAF50"/>
                  <path d="M15 10C15.5523 10 16 9.55228 16 9C16 8.44772 15.5523 8 15 8C14.4477 8 14 8.44772 14 9C14 9.55228 14.4477 10 15 10Z" fill="#4CAF50"/>
                </svg>
              </div>
              <h2>Welcome to EcoGuardian Kindergarten Assistant</h2>
              <p>I can analyze the camera feed and provide assistance for your kindergarten class. Ask me anything about the children's activities, behaviors, or for educational recommendations.</p>
            </div>
          ) : (
            <div className="messages-list">
              {messageHistory.map((message, index) => (
                <div 
                  key={index} 
                  className={`chat-message ${message.sender === 'user' ? 'user-message' : 'assistant-message'}`}
                >
                  {message.sender === 'assistant' && (
                    <div className="message-avatar">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="24" height="24" rx="12" fill="#4CAF50" fillOpacity="0.1"/>
                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#4CAF50" strokeWidth="1.5"/>
                        <path d="M8 14C8.91221 15.2144 10.3645 16 12.0004 16C13.6362 16 15.0885 15.2144 16.0007 14" stroke="#4CAF50" strokeWidth="1.5" strokeLinecap="round"/>
                        <path d="M9 10C9.55228 10 10 9.55228 10 9C10 8.44772 9.55228 8 9 8C8.44772 8 8 8.44772 8 9C8 9.55228 8.44772 10 9 10Z" fill="#4CAF50"/>
                        <path d="M15 10C15.5523 10 16 9.55228 16 9C16 8.44772 15.5523 8 15 8C14.4477 8 14 8.44772 14 9C14 9.55228 14.4477 10 15 10Z" fill="#4CAF50"/>
                      </svg>
                    </div>
                  )}
                  <div className="message-content">
                    {message.typing ? (
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    ) : (
                      message.text
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        <div className="chat-input-area">
          <div className="input-container">
            <textarea 
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Message Kindergarten Assistant..."
              rows={1}
            />
            <button 
              className="send-button" 
              onClick={handleSendMessage}
              disabled={inputMessage.trim() === '' || isProcessing}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KindergartenAssistant; 