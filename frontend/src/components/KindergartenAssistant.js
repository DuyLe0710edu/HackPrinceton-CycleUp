import React, { useState, useEffect, useRef } from 'react';
import './KindergartenAssistant.css';
import mediaStateService from '../services/mediaStateService';

// ResponsiveVoice API key - for a real app, use an environment variable
const RESPONSIVE_VOICE_API_KEY = "OJj1V3xf"; // This is a free key for temporary testing only

const KindergartenAssistant = ({ onSendMessage }) => {
  const [inputMessage, setInputMessage] = useState('');
  const [messageHistory, setMessageHistory] = useState([
    { 
      sender: 'assistant', 
      text: 'Hello there! I\'m your Kindergarten Assistant. I can help analyze movements and provide insights based on the camera feed. What would you like to know about the classroom activities?' 
    }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Add state for text-to-speech - now enabled by default
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState(null);
  const [responsiveVoiceLoaded, setResponsiveVoiceLoaded] = useState(false);
  const [isLoadingVoice, setIsLoadingVoice] = useState(true);
  
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
  const componentMountedRef = useRef(true);
  
  // Load ResponsiveVoice script
  useEffect(() => {
    const loadResponsiveVoice = () => {
      try {
        setIsLoadingVoice(true);
        
        // Check if ResponsiveVoice is already loaded
        if (window.responsiveVoice) {
          console.log("ResponsiveVoice already loaded");
          setResponsiveVoiceLoaded(true);
          setIsLoadingVoice(false);
          setSpeechError(null);
          
          // Try to speak the greeting message
          if (isSpeechEnabled && messageHistory.length > 0) {
            const firstMessage = messageHistory[0];
            if (firstMessage.sender === 'assistant') {
              speakTextWithFallback(firstMessage.text);
            }
          }
          return;
        }
        
        console.log("Loading ResponsiveVoice script...");
        const script = document.createElement('script');
        script.src = `https://code.responsivevoice.org/responsivevoice.js?key=${RESPONSIVE_VOICE_API_KEY}`;
        script.async = true;
        
        script.onload = () => {
          if (componentMountedRef.current) {
            console.log("ResponsiveVoice loaded successfully");
            setResponsiveVoiceLoaded(true);
            setIsLoadingVoice(false);
            setSpeechError(null);
            
            // Initialize ResponsiveVoice if needed
            if (window.responsiveVoice && !window.responsiveVoice.isInitialized()) {
              window.responsiveVoice.init();
            }
            
            // Try to speak the greeting message
            if (isSpeechEnabled && messageHistory.length > 0) {
              const firstMessage = messageHistory[0];
              if (firstMessage.sender === 'assistant') {
                speakTextWithFallback(firstMessage.text);
              }
            }
          }
        };
        
        script.onerror = (error) => {
          console.error("Error loading ResponsiveVoice:", error);
          if (componentMountedRef.current) {
            setSpeechError("Could not load voice service. Using browser's built-in voice instead.");
            setResponsiveVoiceLoaded(false);
            setIsLoadingVoice(false);
            
            // Try to speak with native speech synthesis as fallback
            if (isSpeechEnabled && messageHistory.length > 0) {
              const firstMessage = messageHistory[0];
              if (firstMessage.sender === 'assistant') {
                speakWithNativeSynthesis(firstMessage.text);
              }
            }
          }
        };
        
        // Set a timeout to prevent infinite loading state
        setTimeout(() => {
          if (componentMountedRef.current && isLoadingVoice) {
            setIsLoadingVoice(false);
            if (!responsiveVoiceLoaded) {
              setSpeechError("Voice service is taking too long to load. Using browser's built-in voice instead.");
              // Try native speech synthesis as fallback
              if (isSpeechEnabled && messageHistory.length > 0) {
                const firstMessage = messageHistory[0];
                if (firstMessage.sender === 'assistant') {
                  speakWithNativeSynthesis(firstMessage.text);
                }
              }
            }
          }
        }, 5000);
        
        document.body.appendChild(script);
        
        // Clean up function to remove the script when component unmounts
        return () => {
          if (document.body.contains(script)) {
            document.body.removeChild(script);
          }
        };
      } catch (error) {
        console.error("Error setting up ResponsiveVoice:", error);
        setSpeechError(`Error setting up voice: ${error.message}`);
        setResponsiveVoiceLoaded(false);
        setIsLoadingVoice(false);
      }
    };
    
    loadResponsiveVoice();
    
    // Clean up on unmount
    return () => {
      componentMountedRef.current = false;
      
      // Cancel any ongoing speech
      if (window.responsiveVoice && window.responsiveVoice.isPlaying()) {
        try {
          window.responsiveVoice.cancel();
        } catch (e) {
          console.error("Error canceling speech on unmount:", e);
        }
      }
      
      // Cancel native speech as well if it's being used
      if (window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
        } catch (e) {
          console.error("Error canceling native speech on unmount:", e);
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
        speakTextWithFallback(lastMessage.text);
      }
    }
  }, [messageHistory, isSpeechEnabled]);
  
  // Native speech synthesis fallback when ResponsiveVoice isn't available
  const speakWithNativeSynthesis = (text) => {
    if (!window.speechSynthesis) {
      console.warn("Native speech synthesis not available");
      setSpeechError("Voice playback is not supported in your browser.");
      return;
    }
    
    try {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      // Create a new speech utterance
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set properties for a friendly voice
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      utterance.volume = 1.0;
      
      // Set voice if available
      const voices = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find(voice => 
        voice.name.includes('female') || 
        voice.name.includes('girl') || 
        voice.name.includes('woman')
      );
      
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }
      
      // Add event listeners
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
        console.error("Native speech error:", event);
        if (componentMountedRef.current) {
          setIsSpeaking(false);
          setSpeechError("Voice playback error with native speech.");
        }
      };
      
      // Speak the text
      window.speechSynthesis.speak(utterance);
      
    } catch (error) {
      console.error("Error with native speech synthesis:", error);
      setSpeechError(`Speech error: ${error.message}`);
      setIsSpeaking(false);
    }
  };
  
  // Function to speak text - tries ResponsiveVoice first, falls back to native synthesis
  const speakTextWithFallback = (text) => {
    // Reset any previous errors
    setSpeechError(null);
    
    // Check if ResponsiveVoice is loaded and use it
    if (window.responsiveVoice && responsiveVoiceLoaded) {
      try {
        // Cancel any ongoing speech
        if (window.responsiveVoice.isPlaying()) {
          window.responsiveVoice.cancel();
        }
        
        // Set speaking state
        setIsSpeaking(true);
        
        // Use a warm, friendly kindergarten teacher voice
        window.responsiveVoice.speak(
          text,
          "UK English Female", // Using UK English Female for a warm, clear voice
          {
            pitch: 1.1,     // Slightly higher pitch for friendliness
            rate: 0.9,      // Slightly slower for clarity
            volume: 1.0,    // Full volume
            onstart: () => {
              if (componentMountedRef.current) {
                setIsSpeaking(true);
              }
            },
            onend: () => {
              if (componentMountedRef.current) {
                setIsSpeaking(false);
              }
            },
            onerror: (error) => {
              console.error("ResponsiveVoice error:", error);
              if (componentMountedRef.current) {
                setIsSpeaking(false);
                setSpeechError("Using browser's built-in voice instead.");
                // Try native speech synthesis as fallback
                speakWithNativeSynthesis(text);
              }
            }
          }
        );
        
        return;
      } catch (error) {
        console.error("Error during ResponsiveVoice speech:", error);
        setSpeechError(`Falling back to browser's voice: ${error.message}`);
        // Continue to fallback
      }
    }
    
    // If ResponsiveVoice failed or isn't available, use native speech synthesis
    speakWithNativeSynthesis(text);
  };
  
  // Function to speak text (kept for compatibility but now calls speakTextWithFallback)
  const speakText = (text) => {
    speakTextWithFallback(text);
  };
  
  // Toggle speech on/off
  const toggleSpeech = () => {
    // Reset any previous errors
    setSpeechError(null);
    
    const newState = !isSpeechEnabled;
    setIsSpeechEnabled(newState);
    
    // If turning off, cancel any ongoing speech
    if (!newState) {
      // Cancel ResponsiveVoice if available
      if (window.responsiveVoice) {
        try {
          if (window.responsiveVoice.isPlaying()) {
            window.responsiveVoice.cancel();
          }
        } catch (e) {
          console.warn("Error canceling ResponsiveVoice speech:", e);
        }
      }
      
      // Also cancel native speech synthesis if it's being used
      if (window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
        } catch (e) {
          console.warn("Error canceling native speech:", e);
        }
      }
      
      setIsSpeaking(false);
    }
    
    // If turning on, try to speak the last assistant message
    if (newState && messageHistory.length > 0) {
      const lastAssistantMessage = [...messageHistory]
        .reverse()
        .find(msg => msg.sender === 'assistant' && !msg.typing);
        
      if (lastAssistantMessage) {
        speakTextWithFallback(lastAssistantMessage.text);
      }
    }
  };
  
  // Stop speaking
  const stopSpeaking = () => {
    // Try to stop ResponsiveVoice
    if (window.responsiveVoice) {
      try {
        if (window.responsiveVoice.isPlaying()) {
          window.responsiveVoice.cancel();
        }
      } catch (e) {
        console.error("Error stopping ResponsiveVoice speech:", e);
      }
    }
    
    // Also try to stop native speech synthesis
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        console.error("Error stopping native speech:", e);
      }
    }
    
    setIsSpeaking(false);
  };
  
  // Retry speech if there was an error
  const retrySpeech = () => {
    setSpeechError(null);
    
    // Check if ResponsiveVoice is available
    if (!window.responsiveVoice || !responsiveVoiceLoaded) {
      // Try to reload the script
      setIsLoadingVoice(true);
      const script = document.createElement('script');
      script.src = `https://code.responsivevoice.org/responsivevoice.js?key=${RESPONSIVE_VOICE_API_KEY}`;
      script.async = true;
      
      script.onload = () => {
        if (componentMountedRef.current) {
          setResponsiveVoiceLoaded(true);
          setIsLoadingVoice(false);
          
          // Try speaking the last message again if speech is enabled
          if (isSpeechEnabled && messageHistory.length > 0) {
            const lastAssistantMessage = [...messageHistory]
              .reverse()
              .find(msg => msg.sender === 'assistant' && !msg.typing);
              
            if (lastAssistantMessage) {
              speakTextWithFallback(lastAssistantMessage.text);
            }
          }
        }
      };
      
      script.onerror = () => {
        if (componentMountedRef.current) {
          setIsLoadingVoice(false);
          setSpeechError("Using browser's built-in voice instead.");
          // Try with native speech as fallback
          if (isSpeechEnabled && messageHistory.length > 0) {
            const lastAssistantMessage = [...messageHistory]
              .reverse()
              .find(msg => msg.sender === 'assistant' && !msg.typing);
              
            if (lastAssistantMessage) {
              speakWithNativeSynthesis(lastAssistantMessage.text);
            }
          }
        }
      };
      
      document.body.appendChild(script);
    } else {
      // If ResponsiveVoice is already available, just try speaking again
      if (isSpeechEnabled && messageHistory.length > 0) {
        const lastAssistantMessage = [...messageHistory]
          .reverse()
          .find(msg => msg.sender === 'assistant' && !msg.typing);
          
        if (lastAssistantMessage) {
          speakTextWithFallback(lastAssistantMessage.text);
        }
      }
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
      stopSpeaking();
      
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
      stopSpeaking();
      
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
        {/* Add voice control buttons - now always clickable */}
        <div className="speech-controls">
          {isLoadingVoice && (
            <div className="voice-loading">
              <div className="loading-spinner"></div>
              <span>Loading voice...</span>
            </div>
          )}
          
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