import React, { useEffect, useState, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import {
  Room,
  RoomEvent,
  LocalParticipant,
  RemoteParticipant,
  DataPacket_Kind,
  ConnectionState
} from 'livekit-client';
import './LiveKitComponent.css';
import { parseDataMessage } from '../livekit-integration';

// Speech synthesis utility functions
const speakText = (text, options = {}) => {
  return new Promise((resolve, reject) => {
    // Log speech synthesis status for debugging
    console.log("Speech synthesis status:", {
      supported: !!window.speechSynthesis,
      voicesAvailable: window.speechSynthesis?.getVoices()?.length || 0,
      text: text
    });
    
    // Check if speech synthesis is available
    if (!window.speechSynthesis) {
      console.error('Speech synthesis not supported in this browser');
      reject('Speech synthesis not supported');
      return;
    }
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    // Create a new speech synthesis utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set default options for the teacher voice
    utterance.rate = options.rate || 0.95; // Slightly slower than normal
    utterance.pitch = options.pitch || 1.1; // Slightly higher pitch
    utterance.volume = options.volume || 0.9;
    
    // Add event listeners
    utterance.onstart = () => {
      console.log("Speech started");
      if (options.onStart) options.onStart();
    };
    
    utterance.onend = () => {
      console.log("Speech ended");
      if (options.onEnd) options.onEnd();
      resolve();
    };
    
    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event);
      reject(event);
    };
    
    // Get available voices
    const voices = window.speechSynthesis.getVoices();
    console.log(`Found ${voices.length} voices`);
    
    if (voices.length > 0) {
      // Try to find a good female voice
      const femaleVoice = voices.find(voice => 
        (voice.name.includes('female') || voice.name.includes('woman') || 
         voice.name.includes('girl') || voice.name.includes('Samantha') ||
         voice.name.includes('Karen')) && voice.lang.includes('en')
      );
      
      if (femaleVoice) {
        console.log("Using female voice:", femaleVoice.name);
        utterance.voice = femaleVoice;
      } else {
        // Default to first English voice
        const englishVoice = voices.find(voice => voice.lang.includes('en'));
        if (englishVoice) {
          console.log("Using English voice:", englishVoice.name);
          utterance.voice = englishVoice;
        }
      }
    } else {
      console.warn("No voices available yet, using default voice");
    }
    
    // Speak the text
    console.log("Speaking:", text);
    window.speechSynthesis.speak(utterance);
  });
};

// Function to ensure voices are loaded
const ensureVoicesLoaded = () => {
  return new Promise((resolve) => {
    // Forces voices refresh in Chrome
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      
      let voices = window.speechSynthesis.getVoices();
      
      if (voices.length > 0) {
        console.log(`${voices.length} voices already loaded`);
        resolve(voices);
        return;
      }
      
      // If voices aren't loaded yet, set up event listener
      const voicesChangedHandler = () => {
        voices = window.speechSynthesis.getVoices();
        console.log(`${voices.length} voices loaded after event`);
        window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
        resolve(voices);
      };
      
      window.speechSynthesis.addEventListener('voiceschanged', voicesChangedHandler);
      
      // Set a timeout in case the event never fires
      setTimeout(() => {
        voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          console.log(`${voices.length} voices loaded after timeout`);
          window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
          resolve(voices);
        } else {
          console.warn("No voices loaded after timeout");
          resolve([]);
        }
      }, 1000);
    } else {
      console.error("Speech synthesis not available");
      resolve([]);
    }
  });
};

// Load voices when component is imported
if (typeof window !== 'undefined' && window.speechSynthesis) {
  // Initialize speech synthesis
  ensureVoicesLoaded().then(voices => {
    console.log(`Initialized ${voices.length} speech synthesis voices`);
  });
}

// Speech recognition utility
const setupSpeechRecognition = (callback, errorCallback) => {
  // Check if speech recognition is available
  if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
    console.error('Speech recognition not supported in this browser');
    if (errorCallback) errorCallback('Speech recognition not supported in this browser');
    return null;
  }
  
  // Create speech recognition instance
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  
  // Configure speech recognition with improved settings
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  recognition.maxAlternatives = 3; // Get multiple alternatives to improve accuracy
  
  // Add a timeout for network operations
  let networkTimeout = null;
  
  // Set up event handlers
  recognition.onstart = () => {
    console.log('Speech recognition started');
    // Set a timeout to catch network hanging issues
    networkTimeout = setTimeout(() => {
      try {
        recognition.abort();
        console.warn('Speech recognition timed out - network may be slow');
        if (errorCallback) errorCallback('Speech recognition timed out. Please try again.', 'timeout');
      } catch (e) {
        console.error('Error aborting speech recognition on timeout:', e);
      }
    }, 10000); // 10 second timeout
  };
  
  recognition.onresult = (event) => {
    // Clear timeout when we get results
    if (networkTimeout) {
      clearTimeout(networkTimeout);
      networkTimeout = null;
    }
    
    try {
      const transcript = event.results[0][0].transcript;
      console.log('Speech recognized:', transcript);
      if (callback && typeof callback === 'function') {
        callback(transcript);
      }
    } catch (e) {
      console.error('Error processing speech recognition result:', e);
      if (errorCallback) errorCallback('Error processing speech. Please try again.', 'processing');
    }
  };
  
  recognition.onerror = (event) => {
    // Clear timeout if we get an error
    if (networkTimeout) {
      clearTimeout(networkTimeout);
      networkTimeout = null;
    }
    
    console.error('Speech recognition error:', event.error);
    
    // Customize error message based on error type
    let errorMessage;
    let errorType = event.error;
    
    switch (event.error) {
      case 'network':
        errorMessage = 'Network error: Unable to connect to speech recognition service. Please check your internet connection and try again.';
        // Automatically retry after a short delay for network errors
        setTimeout(() => {
          try {
            console.log('Automatically retrying speech recognition after network error');
            recognition.start();
          } catch (e) {
            console.error('Error auto-retrying speech recognition:', e);
          }
        }, 2000); // Wait 2 seconds before retry
        break;
      case 'not-allowed':
      case 'permission-denied':
        errorMessage = 'Microphone access denied. Please enable microphone permissions in your browser settings.';
        break;
      case 'no-speech':
        errorMessage = 'No speech detected. Please speak more clearly and try again.';
        break;
      case 'aborted':
        errorMessage = 'Speech recognition was aborted.';
        break;
      default:
        errorMessage = `Speech recognition error: ${event.error}`;
    }
    
    if (errorCallback) errorCallback(errorMessage, errorType);
  };
  
  recognition.onend = () => {
    // Clear timeout if recognition ends
    if (networkTimeout) {
      clearTimeout(networkTimeout);
      networkTimeout = null;
    }
    console.log('Speech recognition ended');
  };
  
  return recognition;
};

/**
 * Component to display AI participant
 */
const AIParticipant = ({ participant, isSpeakingSynthesis }) => {
  const [isMuted, setIsMuted] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  useEffect(() => {
    const handleMuteChanged = () => {
      // Get audio tracks
      const audioTracks = participant.getTrackPublications().filter(
        pub => pub.kind === 'audio' && !pub.isMuted
      );
      setIsMuted(audioTracks.length === 0);
    };
    
    const handleSpeakingChanged = (speaking) => {
      setIsSpeaking(speaking);
    };
    
    participant.on('trackMuted', handleMuteChanged);
    participant.on('trackUnmuted', handleMuteChanged);
    participant.on('speakingChanged', handleSpeakingChanged);
    
    handleMuteChanged(); // Initial state
    
    return () => {
      participant.off('trackMuted', handleMuteChanged);
      participant.off('trackUnmuted', handleMuteChanged);
      participant.off('speakingChanged', handleSpeakingChanged);
    };
  }, [participant]);
  
  // Determine if AI is speaking (either through LiveKit or speech synthesis)
  const aiIsSpeaking = isSpeaking || isSpeakingSynthesis;
  
  return (
    <div className="ai-participant">
      <div className="ai-avatar">
        <div className={`ai-avatar-icon ${aiIsSpeaking ? 'speaking-animation' : ''}`}>
          {aiIsSpeaking ? "👩‍🏫" : "👩‍🏫"}
        </div>
        <span className="ai-name">AI Teacher</span>
        {aiIsSpeaking && (
          <div className="speaking-indicator">Speaking...</div>
        )}
        {!aiIsSpeaking && isSpeakingSynthesis === null && (
          <div className="processing-indicator">Processing...</div>
        )}
      </div>
      <div className="audio-status">
        {isMuted ? (
          <span className="muted">🔇</span>
        ) : aiIsSpeaking ? (
          <span className="speaking">🔊</span>
        ) : (
          <span>🔈</span>
        )}
      </div>
    </div>
  );
};

/**
 * Component to display User participant
 */
const UserParticipant = ({ participant, isLocalParticipant }) => {
  const [isMuted, setIsMuted] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  useEffect(() => {
    const handleMuteChanged = () => {
      // Get audio tracks
      const audioTracks = participant.getTrackPublications().filter(
        pub => pub.kind === 'audio' && !pub.isMuted
      );
      setIsMuted(audioTracks.length === 0);
    };
    
    const handleSpeakingChanged = (speaking) => {
      setIsSpeaking(speaking);
    };
    
    participant.on('trackMuted', handleMuteChanged);
    participant.on('trackUnmuted', handleMuteChanged);
    participant.on('speakingChanged', handleSpeakingChanged);
    
    handleMuteChanged(); // Initial state
    
    return () => {
      participant.off('trackMuted', handleMuteChanged);
      participant.off('trackUnmuted', handleMuteChanged);
      participant.off('speakingChanged', handleSpeakingChanged);
    };
  }, [participant]);
  
  return (
    <div className="user-participant">
      <div className="user-avatar">
        <div className="user-avatar-icon">👨‍🎓</div>
        <span className="user-name">You</span>
      </div>
      <div className="audio-indicator">
        {isMuted ? (
          <span className="muted">🔇</span>
        ) : isSpeaking ? (
          <span className="speaking">🔊</span>
        ) : (
          <span>🔈</span>
        )}
      </div>
    </div>
  );
};

/**
 * Room controls component with speech recognition
 */
const RoomControls = ({ room, onSpeechInput, onError }) => {
  const [isMuted, setIsMuted] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [permissionError, setPermissionError] = useState(null);
  const [errorType, setErrorType] = useState(null);
  const [networkStatus, setNetworkStatus] = useState('online');
  const [retryCount, setRetryCount] = useState(0);
  const recognitionRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  
  // Check for network connectivity
  useEffect(() => {
    const handleOnline = () => {
      console.log('Browser reports network is online');
      setNetworkStatus('online');
      setPermissionError(null);
    };
    
    const handleOffline = () => {
      console.log('Browser reports network is offline');
      setNetworkStatus('offline');
      setPermissionError('Your device appears to be offline. Speech recognition requires internet connectivity.');
      setErrorType('network');
    };
    
    // Add network status listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check initial network status
    if (!navigator.onLine) {
      setNetworkStatus('offline');
      setPermissionError('Your device appears to be offline. Speech recognition requires internet connectivity.');
      setErrorType('network');
    }
    
    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Initialize speech recognition
  useEffect(() => {
    // Setup speech recognition
    recognitionRef.current = setupSpeechRecognition(
      (transcript) => {
        // When speech is recognized, send it to the parent component
        if (onSpeechInput && typeof onSpeechInput === 'function') {
          onSpeechInput(transcript);
        }
        setIsListening(false);
        setErrorType(null);
        setPermissionError(null);
        setRetryCount(0); // Reset retry counter on success
      },
      (error, type) => {
        setIsListening(false);
        setPermissionError(error);
        setErrorType(type);
        
        // Only show the error to the user if it's not a network error (since we auto-retry)
        // or if we've had multiple network errors (indicating a persistent issue)
        if (type !== 'network' || retryCount > 2) {
          if (onError) onError(error);
        }
        
        // Increment retry counter for network errors
        if (type === 'network') {
          setRetryCount(prev => prev + 1);
        }
      }
    );
    
    // Cleanup
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors when stopping
        }
      }
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [onSpeechInput, onError, retryCount]);
  
  useEffect(() => {
    if (!room) return;
    
    const handleMuteChanged = () => {
      const audioTracks = room.localParticipant.getTrackPublications().filter(
        pub => pub.kind === 'audio'
      );
      const allMuted = audioTracks.every(track => track.isMuted);
      setIsMuted(allMuted);
    };
    
    room.localParticipant.on('trackMuted', handleMuteChanged);
    room.localParticipant.on('trackUnmuted', handleMuteChanged);
    
    handleMuteChanged(); // Initial state
    
    return () => {
      room.localParticipant.off('trackMuted', handleMuteChanged);
      room.localParticipant.off('trackUnmuted', handleMuteChanged);
    };
  }, [room]);
  
  const toggleMicrophone = async () => {
    if (!room) return;
    
    try {
      setPermissionError(null);
      
      const audioTracks = room.localParticipant.getTrackPublications().filter(
        pub => pub.kind === 'audio'
      );
      
      if (audioTracks.length === 0) {
        // No microphone, let's request one
        try {
          await room.localParticipant.setMicrophoneEnabled(true);
          setIsMuted(false);
        } catch (error) {
          console.error('Failed to enable microphone:', error);
          
          // Check if this is a permission error
          if (error.message && (
              error.message.includes('permission') || 
              error.message.includes('Permission') ||
              error.message.includes('denied')
            )) {
            setPermissionError('Microphone permission denied. Please allow microphone access in your browser settings.');
            setErrorType('permission');
            if (onError) onError('Microphone permission denied');
          } else {
            setPermissionError(`Failed to enable microphone: ${error.message}`);
            setErrorType('device');
            if (onError) onError(`Microphone error: ${error.message}`);
          }
        }
      } else {
        // Toggle existing microphone
        const shouldEnable = audioTracks.every(track => track.isMuted);
        try {
          await room.localParticipant.setMicrophoneEnabled(shouldEnable);
          setIsMuted(!shouldEnable);
        } catch (error) {
          console.error('Failed to toggle microphone:', error);
          setPermissionError(`Failed to toggle microphone: ${error.message}`);
          setErrorType('device');
          if (onError) onError(`Microphone toggle error: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('General microphone error:', error);
      setPermissionError(`Microphone error: ${error.message}`);
      setErrorType('device');
      if (onError) onError(`Microphone error: ${error.message}`);
    }
  };
  
  // Start listening for speech
  const startListening = () => {
    // Don't start if we're offline
    if (networkStatus === 'offline') {
      setPermissionError('Your device appears to be offline. Speech recognition requires internet connectivity.');
      setErrorType('network');
      if (onError) onError('Cannot start speech recognition while offline');
      return;
    }
    
    setPermissionError(null);
    setErrorType(null);
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    if (!recognitionRef.current) {
      setPermissionError('Speech recognition not available in this browser');
      setErrorType('support');
      if (onError) onError('Speech recognition not available');
      return;
    }
    
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setIsListening(false);
      setPermissionError(`Error starting speech recognition: ${error.message}`);
      setErrorType('start');
      if (onError) onError(`Speech recognition error: ${error.message}`);
    }
  };
  
  // Helper to retry after network error
  const retryAfterNetworkError = () => {
    // Don't retry if we're offline
    if (networkStatus === 'offline') {
      setPermissionError('Your device appears to be offline. Please check your connection and try again.');
      return;
    }
    
    // Clear any existing retry timers
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    
    // Reset error state
    setPermissionError('Retrying speech recognition...');
    
    // Start a new retry timer (shorter delay)
    retryTimeoutRef.current = setTimeout(() => {
      setPermissionError(null);
      startListening();
    }, 1000);
  };
  
  // Determine if we're showing a special network error
  const isNetworkError = errorType === 'network' || errorType === 'timeout' || networkStatus === 'offline';
  
  // Determine button text and style based on state
  let buttonText = '🗣️ Speak';
  let buttonClass = 'speech-button';
  
  if (isListening) {
    buttonText = '🔴 Listening...';
    buttonClass += ' listening';
  } else if (isNetworkError) {
    buttonText = '🔄 Retry';
    buttonClass += ' network-error';
  }
  
  return (
    <div className="livekit-controls">
      <div className="buttons-container">
        <button 
          className={`mic-toggle ${isMuted ? 'muted' : ''}`}
          onClick={toggleMicrophone}
          title={isMuted ? "Unmute microphone" : "Mute microphone"}
        >
          {isMuted ? '🎙️' : '🎤'}
        </button>
        
        <button 
          className={buttonClass}
          onClick={isNetworkError ? retryAfterNetworkError : startListening}
          disabled={isListening || networkStatus === 'checking'}
          title={isNetworkError ? "Retry speech recognition" : "Click to speak to the AI"}
        >
          {buttonText}
        </button>
        
        {/* Network status indicator */}
        <div className={`network-status ${networkStatus}`} title={`Network status: ${networkStatus}`}>
          {networkStatus === 'online' ? '🟢' : networkStatus === 'offline' ? '🔴' : '🟠'}
        </div>
      </div>
      
      {permissionError && (
        <div className={`permission-error ${isNetworkError ? 'network-error' : ''}`}>
          {permissionError}
          {isNetworkError && networkStatus !== 'offline' && (
            <div className="error-actions">
              <button 
                onClick={retryAfterNetworkError}
                className="retry-button"
              >
                Try again
              </button>
              <span className="error-tip">
                This error might be caused by a weak internet connection or a firewall blocking the speech service.
              </span>
            </div>
          )}
          {networkStatus === 'offline' && (
            <div className="error-tip">
              Please check your internet connection and try again when you're back online.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Main LiveKitComponent
 */
const LiveKitComponent = forwardRef(({
  url,
  token,
  roomName,
  onMessage
}, ref) => {
  // State for room and connection status
  const [room, setRoom] = useState(null);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [participants, setParticipants] = useState([]);
  
  // State for speaking and processing status
  const [isSpeakingSynthesis, setIsSpeakingSynthesis] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // State for reconnection and errors
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [connectionError, setConnectionError] = useState(null);
  
  // UI state for debug panel
  const [showDebug, setShowDebug] = useState(false);
  
  // Constants
  const MAX_RECONNECT_ATTEMPTS = 3;
  
  // References
  const roomRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const connectionTimerRef = useRef(null);
  const recognitionRef = useRef(null);
  
  // Diagnostic state
  const [speechDiagnostics, setSpeechDiagnostics] = useState({
    voicesAvailable: 0,
    lastResponse: '',
    lastError: null,
    speechSynthesisSupported: !!window.speechSynthesis,
    apiCallStatus: 'none',
    speakingState: 'idle'
  });
  
  // API and error state management
  const [errorState, setErrorState] = useState({
    hasError: false,
    errorMessage: '',
    errorType: '',
    apiCallStatus: 'none'
  });
  
  // Handle errors
  const handleError = (message, type = 'generic') => {
    console.error(`LiveKit Error (${type}):`, message);
    setErrorState({
      hasError: true,
      errorMessage: message,
      errorType: type,
      apiCallStatus: 'error'
    });
    
    // Clear error after 5 seconds
    setTimeout(() => {
      setErrorState(prev => ({
        ...prev,
        hasError: false
      }));
    }, 5000);
  };
  
  // Initialize speech synthesis with diagnostics
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      // Ensure voices are loaded
      ensureVoicesLoaded().then(voices => {
        console.log(`Loaded ${voices.length} speech synthesis voices`);
        setSpeechDiagnostics(prev => ({
          ...prev,
          voicesAvailable: voices.length,
          speechSynthesisSupported: true
        }));
      });
    } else {
      console.warn('Speech synthesis not supported in this browser');
      setSpeechDiagnostics(prev => ({
        ...prev,
        speechSynthesisSupported: false
      }));
    }
    
    // Clean up any ongoing speech synthesis when component unmounts
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);
  
  // Handle AI response with speech synthesis
  const handleAIResponse = async (text) => {
    try {
      console.log("Processing AI response for speech:", text);
      setIsSpeakingSynthesis(true);
      setIsSpeaking(true);
      
      // Set API call status
      setErrorState(prev => ({
        ...prev,
        apiCallStatus: 'speaking'
      }));
      
      setSpeechDiagnostics(prev => ({
        ...prev,
        apiCallStatus: 'speaking',
        speakingState: 'speaking',
        lastResponse: text
      }));
      
      // Make sure voices are loaded
      await ensureVoicesLoaded();
      
      // Speak the text
      await speakText(text, {
        onStart: () => {
          console.log("AI started speaking");
          setIsSpeakingSynthesis(true);
          setIsSpeaking(true);
          setErrorState(prev => ({
            ...prev,
            apiCallStatus: 'speaking-active'
          }));
          setSpeechDiagnostics(prev => ({
            ...prev,
            apiCallStatus: 'speaking-active',
            speakingState: 'speaking'
          }));
        },
        onEnd: () => {
          console.log("AI finished speaking");
          setIsSpeakingSynthesis(false);
          setIsSpeaking(false);
          setErrorState(prev => ({
            ...prev,
            apiCallStatus: 'completed'
          }));
          setSpeechDiagnostics(prev => ({
            ...prev,
            apiCallStatus: 'completed',
            speakingState: 'completed'
          }));
        }
      });
    } catch (err) {
      console.error("Error in speech synthesis:", err);
      setIsSpeakingSynthesis(false);
      setIsSpeaking(false);
      handleError(`Speech synthesis error: ${err.message || 'Unknown error'}`, 'speech');
      setSpeechDiagnostics(prev => ({
        ...prev,
        apiCallStatus: 'error',
        speakingState: 'error',
        lastError: err.message || 'Unknown error'
      }));
    }
  };
  
  // Handle speech input from the user
  const handleSpeechInput = (transcript) => {
    if (!transcript.trim()) return;
    
    console.log('User spoke:', transcript);
    
    // Send the transcript as a message
    if (ref.current && ref.current.sendMessage) {
      ref.current.sendMessage(transcript);
    }
  };
  
  // Helper to update participants list
  const updateParticipants = useCallback((room) => {
    if (!room) return;
    
    const allParticipants = [
      room.localParticipant,
      ...room.remoteParticipants.values()
    ];
    
    setParticipants(allParticipants);
  }, []);
  
  // Attempt reconnection with exponential backoff
  const attemptReconnection = useCallback(async () => {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      setConnectionError(`Failed to connect after ${MAX_RECONNECT_ATTEMPTS} attempts. Please check your network and try again.`);
      return;
    }
    
    // Exponential backoff delay
    const delay = Math.min(1000 * (2 ** reconnectAttempts), 10000);
    console.log(`Attempting reconnection in ${delay}ms (attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
    
    // Set a timeout to reconnect
    connectionTimerRef.current = setTimeout(async () => {
      try {
        setConnectionError(null);
        setConnectionState('connecting');
        
        if (roomRef.current) {
          console.log('Attempting to reconnect to LiveKit room');
          await roomRef.current.connect(url, token);
          
          console.log('Reconnected to LiveKit room');
          setConnectionState(roomRef.current.state);
          setReconnectAttempts(0);
          updateParticipants(roomRef.current);
        }
      } catch (error) {
        console.error('Reconnection attempt failed:', error);
        setReconnectAttempts(prev => prev + 1);
        attemptReconnection();
      }
    }, delay);
  }, [reconnectAttempts, token, url, MAX_RECONNECT_ATTEMPTS, updateParticipants]);
  
  // Expose functions to parent through ref
  useImperativeHandle(ref, () => ({
    // Send a message to the room
    sendMessage: (message, metadata = {}) => {
      if (room) {
        try {
          // Prepare message data
          const messageData = {
            type: 'text',
            text: message,
            sender: 'user',
            timestamp: Date.now(),
            ...metadata
          };
          
          // Encode and send the message
          const encoder = new TextEncoder();
          const data = encoder.encode(JSON.stringify(messageData));
          room.localParticipant.publishData(data, DataPacket_Kind.RELIABLE);
          
          console.log('Message sent:', messageData);
          return true;
        } catch (error) {
          console.error('Error sending message:', error);
          handleError(`Failed to send message: ${error.message}`);
          return false;
        }
      } else {
        console.error('Cannot send message: Room is not connected');
        handleError('Cannot send message: Not connected to room');
        return false;
      }
    },
    
    // Directly speak a message using speech synthesis
    speakMessage: (text) => {
      return handleAIResponse(text);
    },
    
    // Get the current connection state
    getConnectionState: () => connectionState,
    
    // Get room participants
    getParticipants: () => participants,
    
    // Disconnect from the room
    disconnect: () => {
      if (room) {
        room.disconnect();
      }
    }
  }));
  
  // Connect to LiveKit room on component mount
  useEffect(() => {
    if (!url || !token || !roomName) {
      setConnectionError('Missing LiveKit configuration');
      return;
    }
    
    const connectToRoom = async () => {
      try {
        // Create a new room instance if we don't have one
        if (!roomRef.current) {
          const newRoom = new Room({
            adaptiveStream: true,
            dynacast: true,
            audioDeviceQuality: { 
              channelCount: 1,
              echoCancellation: true,
              autoGainControl: true,
              noiseSuppression: true
            },
            reconnect: true,
            maxRetries: 3
          });
          
          // Set room reference
          roomRef.current = newRoom;
          setRoom(newRoom);
          
          // Set connection state listeners
          newRoom.on(RoomEvent.ConnectionStateChanged, (state) => {
            console.log('Connection state changed:', state);
            setConnectionState(state);
            
            if (state === ConnectionState.Disconnected) {
              if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                setReconnectAttempts(prev => prev + 1);
                attemptReconnection();
              } else {
                setConnectionError('Connection lost. Please try reconnecting.');
              }
            } else if (state === ConnectionState.Connected) {
              setConnectionError(null);
              setReconnectAttempts(0);
            }
          });
          
          // Set up other event listeners
          setupRoomEventListeners(newRoom);
        }
        
        // Connect to the LiveKit room
        setConnectionState('connecting');
        setConnectionError(null);
        
        // If already connected, disconnect first
        if (roomRef.current.state === ConnectionState.Connected) {
          await roomRef.current.disconnect();
        }
        
        await roomRef.current.connect(url, token, {
          autoSubscribe: true
        });
        
        console.log('Connected to room:', roomName);
        
        // Update participants list
        updateParticipants(roomRef.current);
        
        // Set connection state
        setConnectionState(roomRef.current.state);
        setReconnectAttempts(0);
        
      } catch (error) {
        console.error('Failed to connect to LiveKit room:', error);
        setConnectionState('disconnected');
        setConnectionError(`Connection failed: ${error.message || 'Unknown error'}`);
        
        // Attempt to reconnect
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          setReconnectAttempts(prev => prev + 1);
          attemptReconnection();
        }
      }
    };
    
    // Set up room event listeners
    const setupRoomEventListeners = (newRoom) => {
      // Data message listener
      newRoom.on(RoomEvent.DataReceived, (payload, participant, kind) => {
        if (kind !== DataPacket_Kind.RELIABLE) return;
        
        try {
          const message = parseDataMessage(payload);
          console.log('Message received:', message);
          
          if (message && message.type === 'message' && onMessage) {
            onMessage({
              sender: participant ? participant.identity : 'unknown',
              content: message.content,
              timestamp: message.timestamp || Date.now(),
              type: message.type
            });
            
            // If message is from AI, speak it
            if (participant && participant.identity === 'ai-assistant') {
              setIsSpeaking(true);
              handleAIResponse(message.content);
            }
          }
        } catch (error) {
          console.error('Error parsing data message:', error);
          handleError('Error parsing message');
        }
      });
      
      // Participant listeners
      newRoom.on(RoomEvent.ParticipantConnected, () => {
        console.log('Participant connected');
        updateParticipants(newRoom);
      });
      
      newRoom.on(RoomEvent.ParticipantDisconnected, () => {
        console.log('Participant disconnected');
        updateParticipants(newRoom);
      });
      
      newRoom.on(RoomEvent.Disconnected, (error) => {
        console.log('Disconnected from room:', error);
        setConnectionState('disconnected');
        if (error) {
          setConnectionError(`Disconnected: ${error.message || 'Unknown error'}`);
        }
      });
      
      // Error handling
      newRoom.on(RoomEvent.MediaDevicesError, (error) => {
        console.error('Media devices error:', error);
        handleError(`Media device error: ${error.message || 'Unknown media error'}`);
      });
    };
    
    connectToRoom();
    
    // Cleanup on unmount
    return () => {
      if (connectionTimerRef.current) {
        clearTimeout(connectionTimerRef.current);
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (roomRef.current) {
        try {
          roomRef.current.disconnect();
        } catch (e) {
          console.error('Error disconnecting from room:', e);
        }
        roomRef.current = null;
      }
      
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [url, token, roomName, onMessage, reconnectAttempts, updateParticipants, attemptReconnection, MAX_RECONNECT_ATTEMPTS]);
  
  // Handle data messages
  useEffect(() => {
    if (!room) return;
    
    const handleDataReceived = (payload, participant) => {
      try {
        console.log("Received data from:", participant.identity);
        
        // Parse received data
        const messageData = parseDataMessage(payload);
        
        // Check if this is a text message
        if (messageData.type === 'text' && messageData.text) {
          console.log(`Message from ${participant.identity}:`, messageData.text);
          
          // If message is from AI, speak it
          if (participant.identity === 'ai-assistant') {
            handleAIResponse(messageData.text);
          }
          
          // Call the onMessage callback with the received message
          if (onMessage && typeof onMessage === 'function') {
            onMessage(messageData);
          }
        }
      } catch (e) {
        console.error('Error handling data message:', e);
        handleError(`Failed to process message: ${e.message}`);
      }
    };
    
    // Register data received handler
    room.on(RoomEvent.DataReceived, handleDataReceived);
    
    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room, onMessage]);
  
  // Render loading state while connecting
  if (connectionState === 'connecting') {
    return (
      <div className="connecting">
        <div className="connecting-spinner"></div>
        <div>Connecting to voice chat...</div>
        {reconnectAttempts > 0 && (
          <div className="reconnect-message">
            Reconnection attempt {reconnectAttempts}/{MAX_RECONNECT_ATTEMPTS}
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className={`livekit-component ${showDebug ? 'show-debug' : ''}`}>
      <div className="participants-container">
        {participants.map(participant => {
          // Identify if this is the AI participant
          const isAI = participant.identity === 'ai-assistant';
          const isLocal = participant instanceof LocalParticipant;
          
          if (isAI) {
            return <AIParticipant 
              key={participant.sid} 
              participant={participant}
              isSpeakingSynthesis={isSpeaking ? true : isProcessing ? null : false}
            />;
          } else {
            return (
              <UserParticipant 
                key={participant.sid} 
                participant={participant}
                isLocalParticipant={isLocal}
              />
            );
          }
        })}
      </div>
      
      {room && <RoomControls 
        room={room} 
        onSpeechInput={handleSpeechInput}
        onError={handleError}
      />}
      
      {connectionError && (
        <div className="connection-error">
          <div>{connectionError}</div>
          <button 
            onClick={() => {
              setReconnectAttempts(0);
              attemptReconnection();
            }} 
            className="reconnect-button"
          >
            Try Again
          </button>
        </div>
      )}
      
      {connectionState === 'disconnected' && !connectionError && (
        <div className="connection-error">
          <div>Voice chat disconnected</div>
          <button 
            onClick={() => {
              setReconnectAttempts(0);
              attemptReconnection();
            }} 
            className="reconnect-button"
          >
            Reconnect
          </button>
        </div>
      )}
      
      {/* Add debug toggle button */}
      <div className="debug-controls">
        <button 
          className="debug-toggle"
          onClick={() => setShowDebug(prev => !prev)}
        >
          {showDebug ? "Hide Diagnostics" : "Show Diagnostics"}
        </button>
      </div>
      
      {/* Add debug panel */}
      {showDebug && (
        <div className="debug-panel">
          <h4>Speech Diagnostics</h4>
          <div className="debug-item">
            <span className="debug-label">Speech Synthesis:</span>
            <span>{speechDiagnostics.speechSynthesisSupported ? '✅ Supported' : '❌ Not Supported'}</span>
          </div>
          <div className="debug-item">
            <span className="debug-label">Voices Available:</span>
            <span>{speechDiagnostics.voicesAvailable}</span>
          </div>
          <div className="debug-item">
            <span className="debug-label">API Call Status:</span>
            <span>{speechDiagnostics.apiCallStatus}</span>
          </div>
          <div className="debug-item">
            <span className="debug-label">Speaking State:</span>
            <span>{speechDiagnostics.speakingState || 'idle'}</span>
          </div>
          <div className="debug-item">
            <span className="debug-label">Last Response:</span>
            <span>{speechDiagnostics.lastResponse ? (speechDiagnostics.lastResponse.length > 30 ? 
              speechDiagnostics.lastResponse.substring(0, 30) + '...' : 
              speechDiagnostics.lastResponse) : 'None'}</span>
          </div>
          {speechDiagnostics.lastError && (
            <div className="debug-item">
              <span className="debug-label">Last Error:</span>
              <span>{speechDiagnostics.lastError}</span>
            </div>
          )}
        </div>
      )}
      
      {/* Display speech synthesis debug info */}
      <div className="speech-status" style={{
        fontSize: '10px', 
        color: '#666', 
        padding: '4px', 
        position: 'absolute',
        bottom: '4px',
        left: '4px',
        background: 'rgba(255,255,255,0.8)',
        borderRadius: '4px',
        opacity: 0.8,
        maxWidth: '180px',
        overflow: 'hidden'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>Speech Status</div>
        <div>Synthesis: {speechDiagnostics.speechSynthesisSupported ? '✅' : '❌'}</div>
        <div>Voices: {speechDiagnostics.voicesAvailable}</div>
        <div>State: {speechDiagnostics.speakingState || 'idle'}</div>
      </div>
    </div>
  );
});

LiveKitComponent.displayName = 'LiveKitComponent';

export default LiveKitComponent; 