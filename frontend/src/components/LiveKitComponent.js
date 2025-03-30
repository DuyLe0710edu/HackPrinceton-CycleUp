import React, { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react';
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

/**
 * Component to display AI participant
 */
const AIParticipant = ({ participant }) => {
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
    <div className="ai-participant">
      <div className="ai-avatar">
        <div className="ai-avatar-icon">👩‍🏫</div>
        <span className="ai-name">AI Teacher</span>
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
 * Room controls component
 */
const RoomControls = ({ room }) => {
  const [isMuted, setIsMuted] = useState(true);
  
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
      }
    } else {
      // Toggle existing microphone
      const shouldEnable = audioTracks.every(track => track.isMuted);
      try {
        await room.localParticipant.setMicrophoneEnabled(shouldEnable);
        setIsMuted(!shouldEnable);
      } catch (error) {
        console.error('Failed to toggle microphone:', error);
      }
    }
  };
  
  return (
    <div className="livekit-controls">
      <button 
        className={`mic-toggle ${isMuted ? 'muted' : ''}`}
        onClick={toggleMicrophone}
      >
        {isMuted ? '🎙️' : '🎤'}
      </button>
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
  const roomRef = useRef(null);
  
  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    sendMessage: (message, metadata = {}) => {
      if (!roomRef.current) return;
      
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
        });
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  }));
  
  // Connect to LiveKit room on component mount
  useEffect(() => {
    if (!url || !token || !roomName) return;
    
    const connectToRoom = async () => {
      try {
        setConnectionState('connecting');
        console.log(`Connecting to LiveKit at ${url} with room: ${roomName}`);
        
        // Create a new room with connection options
        const newRoom = new Room({
          adaptiveStream: true,
          dynacast: true,
          reconnect: true,         // Enable auto-reconnection
          maxRetries: 3            // Number of reconnection attempts
        });
        
        roomRef.current = newRoom;
        
        // Set up event listeners
        newRoom.on(RoomEvent.ParticipantConnected, (participant) => {
          console.log(`Participant connected: ${participant.identity}`);
          updateParticipants(newRoom);
        });
        
        newRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
          console.log(`Participant disconnected: ${participant.identity}`);
          updateParticipants(newRoom);
        });
        
        newRoom.on(RoomEvent.ConnectionStateChanged, (state) => {
          console.log(`Connection state changed: ${state}`);
          setConnectionState(state);
          
          // Handle reconnection attempts
          if (state === ConnectionState.Reconnecting) {
            console.log('Attempting to reconnect...');
          }
        });
        
        newRoom.on(RoomEvent.Reconnected, () => {
          console.log('Successfully reconnected to room');
        });
        
        newRoom.on(RoomEvent.Disconnected, () => {
          console.log('Disconnected from room');
        });
        
        newRoom.on(RoomEvent.DataReceived, (payload, participant, kind) => {
          try {
            console.log(`Data received from ${participant.identity}`);
            const message = parseDataMessage(payload);
            if (message && message.type === 'message' && onMessage) {
              onMessage({
                ...message,
                sender: participant.identity
              });
            }
          } catch (error) {
            console.error('Error parsing data message:', error);
          }
        });
        
        // Connect to the room with detailed error logging
        console.log('Connecting to LiveKit room...');
        await newRoom.connect(url, token, {
          autoSubscribe: true
        });
        console.log('Connected to LiveKit room:', roomName);
        
        // Set local audio (initially muted)
        await newRoom.localParticipant.setMicrophoneEnabled(false);
        
        // Update state
        setRoom(newRoom);
        updateParticipants(newRoom);
        
      } catch (error) {
        console.error('Failed to connect to LiveKit room:', error);
        console.error('Connection details:', { url, roomName });
        setConnectionState('disconnected');
      }
    };
    
    connectToRoom();
    
    // Cleanup on unmount
    return () => {
      if (roomRef.current) {
        console.log('Disconnecting from LiveKit room');
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, [url, token, roomName, onMessage]);
  
  // Helper to update participants list
  const updateParticipants = (room) => {
    if (!room) return;
    
    const allParticipants = [
      room.localParticipant,
      ...room.remoteParticipants.values()
    ];
    
    setParticipants(allParticipants);
  };
  
  // Render loading state while connecting
  if (connectionState === 'connecting') {
    return (
      <div className="connecting">
        <div className="connecting-spinner"></div>
        <div>Connecting to voice chat...</div>
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
            return <AIParticipant key={participant.sid} participant={participant} />;
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
      
      {room && <RoomControls room={room} />}
      
      {connectionState === 'disconnected' && (
        <div className="connection-error">
          Disconnected from voice chat. 
          <button 
            onClick={() => window.location.reload()} 
            style={{marginLeft: '8px', padding: '4px 8px'}}
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