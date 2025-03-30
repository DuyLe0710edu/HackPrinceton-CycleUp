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
  
  // Add state for text-to-speech
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState(null);
  
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
  const speechSynthesisRef = useRef(null);
  const speechInitializedRef = useRef(false);
  const componentMountedRef = useRef(true);
  
  // Initialize speech synthesis with proper error handling
  useEffect(() => {
    const initializeSpeechSynthesis = () => {
      try {
        // Check if speech synthesis is available in this browser
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          speechSynthesisRef.current = window.speechSynthesis;
          
          // Force load voices - needed in some browsers
          speechSynthesisRef.current.getVoices();
          
          // Listen for voices changed event (important for Chrome)
          window.speechSynthesis.onvoiceschanged = () => {
            if (componentMountedRef.current && !speechInitializedRef.current) {
              speechInitializedRef.current = true;
              console.log("Speech synthesis initialized with", speechSynthesisRef.current.getVoices().length, "voices");
            }
          };
          
          // If voices are already available, mark as initialized
          if (speechSynthesisRef.current.getVoices().length > 0) {
            speechInitializedRef.current = true;
            console.log("Speech synthesis initialized immediately with", speechSynthesisRef.current.getVoices().length, "voices");
          }
          
          setSpeechError(null);
        } else {
          console.warn("Speech synthesis not supported in this browser");
          setSpeechError("Speech synthesis not supported in your browser");
        }
      } catch (error) {
        console.error("Error initializing speech synthesis:", error);
        setSpeechError(`Error initializing speech: ${error.message}`);
      }
    };
    
    initializeSpeechSynthesis();
    
    // Clean up on unmount
    return () => {
      componentMountedRef.current = false;
      if (speechSynthesisRef.current) {
        try {
          speechSynthesisRef.current.cancel();
        } catch (e) {
          console.error("Error canceling speech on unmount:", e);
        }
      }
    };
  }, []);
  
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
    
    // Speak out the latest assistant message if speech is enabled
    if (isSpeechEnabled && messageHistory.length > 0) {
      const lastMessage = messageHistory[messageHistory.length - 1];
      if (lastMessage.sender === 'assistant' && !lastMessage.typing) {
        speakText(lastMessage.text);
      }
    }
  }, [messageHistory, isSpeechEnabled]);
  
  // Function to speak text using Web Speech API with robust error handling
  const speakText = (text) => {
    // Reset any previous errors
    setSpeechError(null);
    
    // Check if speech synthesis is available and initialized
    if (!speechSynthesisRef.current || !speechInitializedRef.current) {
      console.warn("Speech synthesis not initialized yet or not available");
      setSpeechError("Speech not available. Please check your browser settings.");
      return;
    }
    
    try {
      // Try to cancel any ongoing speech
      try {
        speechSynthesisRef.current.cancel();
      } catch (e) {
        console.warn("Error canceling previous speech:", e);
      }
      
      // Create a new utterance with proper error handling
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set properties for a charming kindergarten teacher voice
      utterance.rate = 0.9; // Slightly slower than normal
      utterance.pitch = 1.2; // Slightly higher pitch
      utterance.volume = 1.0; // Full volume
      
      // Get available voices safely
      let voices = [];
      try {
        voices = speechSynthesisRef.current.getVoices();
      } catch (e) {
        console.warn("Error getting voices:", e);
      }
      
      // Try to find a friendly, warm female voice
      const preferredVoices = voices.filter(voice => 
        (voice.name.includes('female') || 
         voice.name.includes('girl') || 
         voice.name.includes('Karen') || 
         voice.name.includes('Samantha') || 
         voice.name.includes('Victoria')) && 
        voice.lang.includes('en')
      );
      
      if (preferredVoices.length > 0) {
        utterance.voice = preferredVoices[0];
      } else if (voices.length > 0) {
        // Fallback to any English voice if no female voice is found
        const englishVoices = voices.filter(voice => voice.lang.includes('en'));
        if (englishVoices.length > 0) {
          utterance.voice = englishVoices[0];
        }
      }
      
      // Add event listeners with error handling
      utterance.onstart = () => {
        if (componentMountedRef.current) {
          setIsSpeaking(true);
        }
      };
      
      utterance.onend = () => {
        if (componentMountedRef.current) {
          setIsSpeaking(false);
        }
      };
      
      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event);
        if (componentMountedRef.current) {
          setIsSpeaking(false);
          setSpeechError(`Speech error: ${event.error || 'Unknown error'}`);
        }
      };
      
      // Start speaking with timeout safeguard
      speechSynthesisRef.current.speak(utterance);
      
      // Set a timeout to check if speaking actually started
      setTimeout(() => {
        if (componentMountedRef.current && !speechSynthesisRef.current.speaking && isSpeechEnabled) {
          setSpeechError("Speech failed to start. Try refreshing the page.");
        }
      }, 1000);
      
    } catch (error) {
      console.error("Error during speech synthesis:", error);
      setSpeechError(`Speech error: ${error.message}`);
      setIsSpeaking(false);
    }
  };
  
  // Toggle speech on/off
  const toggleSpeech = () => {
    // Reset any previous errors
    setSpeechError(null);
    
    const newState = !isSpeechEnabled;
    setIsSpeechEnabled(newState);
    
    // If turning off, cancel any ongoing speech
    if (!newState && speechSynthesisRef.current) {
      try {
        speechSynthesisRef.current.cancel();
        setIsSpeaking(false);
      } catch (e) {
        console.warn("Error canceling speech:", e);
      }
    }
    
    // If turning on, try to speak the last assistant message
    if (newState) {
      if (!speechSynthesisRef.current || !speechInitializedRef.current) {
        setSpeechError("Speech not available in your browser");
        return;
      }
      
      if (messageHistory.length > 0) {
        const lastAssistantMessage = [...messageHistory]
          .reverse()
          .find(msg => msg.sender === 'assistant' && !msg.typing);
          
        if (lastAssistantMessage) {
          speakText(lastAssistantMessage.text);
        }
      }
    }
  };
  
  // Stop speaking
  const stopSpeaking = () => {
    if (speechSynthesisRef.current) {
      try {
        speechSynthesisRef.current.cancel();
        setIsSpeaking(false);
      } catch (e) {
        console.error("Error stopping speech:", e);
        setSpeechError(`Error stopping speech: ${e.message}`);
      }
    }
  };
  
  // Retry speech if there was an error
  const retrySpeech = () => {
    setSpeechError(null);
    
    // Reinitialize the speech synthesis
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      speechSynthesisRef.current = window.speechSynthesis;
      speechInitializedRef.current = true;
      
      // Try speaking the last message again
      if (messageHistory.length > 0) {
        const lastAssistantMessage = [...messageHistory]
          .reverse()
          .find(msg => msg.sender === 'assistant' && !msg.typing);
          
        if (lastAssistantMessage && isSpeechEnabled) {
          speakText(lastAssistantMessage.text);
        }
      }
    } else {
      setSpeechError("Speech synthesis not supported in your browser");
    }
  };

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
      // Stop speaking previous response
      if (isSpeechEnabled && speechSynthesisRef.current) {
        try {
          speechSynthesisRef.current.cancel();
        } catch (e) {
          console.warn("Error canceling previous speech:", e);
        }
      }
      
      // Remove the typing indicator
      setMessageHistory(prev => prev.filter(msg => !msg.typing));
      
      if (data.success) {
        // Add the AI response
        setMessageHistory(prev => [...prev, { 
          sender: 'assistant', 
          text: data.response
        }]);
        
        // Speech will be handled by the useEffect that watches messageHistory
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
      // Stop speaking previous response
      if (isSpeechEnabled && speechSynthesisRef.current) {
        try {
          speechSynthesisRef.current.cancel();
        } catch (e) {
          console.warn("Error canceling previous speech:", e);
        }
      }
      
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
        {/* Add voice control buttons */}
        <div className="speech-controls">
          {speechError && (
            <div className="speech-error">
              <span className="error-message">{speechError}</span>
              <button 
                className="retry-button"
                onClick={retrySpeech}
                title="Retry speech"
              >
                Retry
              </button>
            </div>
          )}
          
          <button 
            className={`speech-toggle-button ${isSpeechEnabled ? 'active' : ''}`}
            onClick={toggleSpeech}
            title={isSpeechEnabled ? "Turn voice off" : "Turn voice on"}
            disabled={!speechInitializedRef.current}
          >
            {isSpeechEnabled ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 3C10.9 3 10 3.9 10 5V13C10 14.1 10.9 15 12 15C13.1 15 14 14.1 14 13V5C14 3.9 13.1 3 12 3Z" fill="currentColor"/>
                <path d="M17 11C17 14.53 14.39 17.44 11 17.93V21H13V23H9V21H11V17.93C7.61 17.44 5 14.53 5 11H7C7 13.76 9.24 16 12 16C14.76 16 17 13.76 17 11H19H17Z" fill="currentColor"/>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 3C10.9 3 10 3.9 10 5V13C10 14.1 10.9 15 12 15C13.1 15 14 14.1 14 13V5C14 3.9 13.1 3 12 3Z" fill="currentColor" fillOpacity="0.5"/>
                <path d="M17 11C17 14.53 14.39 17.44 11 17.93V21H13V23H9V21H11V17.93C7.61 17.44 5 14.53 5 11H7C7 13.76 9.24 16 12 16C14.76 16 17 13.76 17 11H19H17Z" fill="currentColor" fillOpacity="0.5"/>
                <path d="M3 4L21 22" stroke="red" strokeWidth="2" strokeLinecap="round" style={{ display: isSpeaking ? 'none' : 'block' }}/>
              </svg>
            )}
            <span>{isSpeechEnabled ? "Voice On" : "Voice Off"}</span>
          </button>
          
          {isSpeechEnabled && isSpeaking && (
            <button 
              className="stop-speech-button"
              onClick={stopSpeaking}
              title="Stop speaking"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor"/>
              </svg>
              <span>Stop</span>
            </button>
          )}
        </div>

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