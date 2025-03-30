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
  // Check if speech synthesis is available
  if (!window.speechSynthesis) {
    console.error('Speech synthesis not supported in this browser');
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
  
  // Use a female voice if available (for the teacher character)
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    // Try to find a good female voice
    const femaleVoice = voices.find(voice => 
      (voice.name.includes('female') || voice.name.includes('woman') || 
       voice.name.includes('girl') || voice.name.includes('Samantha') ||
       voice.name.includes('Karen')) && voice.lang.includes('en')
    );
    
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    } else {
      // Default to first English voice
      const englishVoice = voices.find(voice => voice.lang.includes('en'));
      if (englishVoice) utterance.voice = englishVoice;
    }
  }
  
  // Speak the text
  window.speechSynthesis.speak(utterance);
  
  // Add event listeners
  utterance.onstart = () => {
    if (options.onStart) options.onStart();
  };
  
  utterance.onend = () => {
    if (options.onEnd) options.onEnd();
  };
  
  return utterance;
};

// Function to ensure voices are loaded
const ensureVoicesLoaded = () => {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }
    
    // If voices aren't loaded yet, wait for them
    window.speechSynthesis.onvoiceschanged = () => {
      resolve(window.speechSynthesis.getVoices());
    };
  });
};

// Load voices when component is imported
if (typeof window !== 'undefined' && window.speechSynthesis) {
  ensureVoicesLoaded();
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
  
  // Configure speech recognition
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  
  // Set up event handlers
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    console.log('Speech recognized:', transcript);
    if (callback && typeof callback === 'function') {
      callback(transcript);
    }
  };
  
  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    
    // Customize error message based on error type
    let errorMessage;
    switch (event.error) {
      case 'network':
        errorMessage = 'Network error: Unable to connect to speech recognition service. Please check your internet connection and try again.';
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
    
    if (errorCallback) errorCallback(errorMessage, event.error);
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
      </div>
      <div className="audio-indicator">
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
  const recognitionRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  
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
      },
      (error, type) => {
        setIsListening(false);
        setPermissionError(error);
        setErrorType(type);
        if (onError) onError(error);
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
  }, [onSpeechInput, onError]);
  
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
            if (onError) onError('Microphone permission denied');
          } else {
            setPermissionError(`Failed to enable microphone: ${error.message}`);
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
          if (onError) onError(`Microphone toggle error: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('General microphone error:', error);
      setPermissionError(`Microphone error: ${error.message}`);
      if (onError) onError(`Microphone error: ${error.message}`);
    }
  };
  
  // Start listening for speech
  const startListening = () => {
    setPermissionError(null);
    setErrorType(null);
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    if (!recognitionRef.current) {
      setPermissionError('Speech recognition not available in this browser');
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
      if (onError) onError(`Speech recognition error: ${error.message}`);
    }
  };
  
  // Helper to retry after network error
  const retryAfterNetworkError = () => {
    // Clear any existing retry timers
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    
    // Start a new retry timer (3 seconds)
    retryTimeoutRef.current = setTimeout(() => {
      startListening();
    }, 3000);
  };
  
  // Determine if we're showing a special network error
  const isNetworkError = errorType === 'network';
  
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
          className={`speech-button ${isListening ? 'listening' : ''} ${isNetworkError ? 'network-error' : ''}`}
          onClick={startListening}
          disabled={isListening}
          title="Click to speak to the AI"
        >
          {isListening ? '🔴 Listening...' : isNetworkError ? '🔄 Retry' : '🗣️ Speak'}
        </button>
      </div>
      
      {permissionError && (
        <div className={`permission-error ${isNetworkError ? 'network-error' : ''}`}>
          {permissionError}
          {isNetworkError && (
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
  const [room, setRoom] = useState(null);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [participants, setParticipants] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const roomRef = useRef(null);
  const connectionTimerRef = useRef(null);
  const MAX_RECONNECT_ATTEMPTS = 3;
  
  // Handle errors
  const handleError = (error) => {
    console.error('LiveKit error:', error);
    // We don't set connectionError here to avoid UI flickering
    // for minor errors that don't affect the connection
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
  
  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      // Ensure voices are loaded
      ensureVoicesLoaded().then(voices => {
        console.log(`Loaded ${voices.length} speech synthesis voices`);
      });
    } else {
      console.warn('Speech synthesis not supported in this browser');
    }
    
    // Clean up any ongoing speech synthesis when component unmounts
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
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
  }, [reconnectAttempts, token, url, setConnectionState, setReconnectAttempts]);
  
  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    sendMessage: (message, metadata = {}) => {
      if (!roomRef.current) {
        console.error('Cannot send message: not connected to room');
        return;
      }
      
      if (roomRef.current.state !== 'connected') {
        console.error(`Cannot send message: room is in ${roomRef.current.state} state`);
        return;
      }
      
      try {
        const payload = JSON.stringify({
          type: 'message',
          content: message,
          timestamp: Date.now(),
          ...metadata
        });
        
        roomRef.current.localParticipant.publishData(
          new TextEncoder().encode(payload),
          DataPacket_Kind.RELIABLE
        );
        
        // Call API for voice response
        fetch('/api/voice-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message,
            ...metadata
          })
        })
        .then(response => response.json())
        .then(data => {
          if (data.success && data.response) {
            // Use speech synthesis to speak the response
            setIsSpeaking(true);
            speakText(data.response, {
              onStart: () => setIsSpeaking(true),
              onEnd: () => setIsSpeaking(false)
            });
            
            if (onMessage) {
              onMessage({
                type: 'ai-message',
                content: data.response,
                timestamp: Date.now()
              });
            }
          }
        })
        .catch(error => {
          console.error('Error getting voice response:', error);
          handleError('Failed to get AI response');
        });
      } catch (error) {
        console.error('Error sending message:', error);
        handleError('Failed to send message');
      }
    },
    
    // Add a method to speak text directly
    speakText: (text) => {
      setIsSpeaking(true);
      speakText(text, {
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false)
      });
    },
    
    // Add a reconnect method that can be called from outside
    reconnect: () => {
      setReconnectAttempts(0);
      attemptReconnection();
    }
  }));
  
  // Helper to update participants list
  const updateParticipants = useCallback((room) => {
    if (!room) return;
    
    const allParticipants = [
      room.localParticipant,
      ...room.remoteParticipants.values()
    ];
    
    setParticipants(allParticipants);
  }, []);
  
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
                  speakText(message.content, {
                    onStart: () => setIsSpeaking(true),
                    onEnd: () => setIsSpeaking(false)
                  });
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
          
          // Save room reference
          roomRef.current = newRoom;
          setRoom(newRoom);
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
    
    connectToRoom();
    
    // Cleanup on unmount
    return () => {
      if (connectionTimerRef.current) {
        clearTimeout(connectionTimerRef.current);
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
  }, [url, token, roomName, onMessage, reconnectAttempts, updateParticipants, attemptReconnection]);
  
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
    <div className="livekit-component">
      <div className="participants-container">
        {participants.map(participant => {
          // Identify if this is the AI participant
          const isAI = participant.identity === 'ai-assistant';
          const isLocal = participant instanceof LocalParticipant;
          
          if (isAI) {
            return <AIParticipant 
              key={participant.sid} 
              participant={participant}
              isSpeakingSynthesis={isSpeaking}
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
    </div>
  );
});

LiveKitComponent.displayName = 'LiveKitComponent';

export default LiveKitComponent; 