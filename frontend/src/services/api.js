import io from 'socket.io-client';

const API_URL = 'http://localhost:8000';

// Create a socket connection to the backend
export const connectToSocket = (onDetectionUpdate) => {
  const socket = io(API_URL);
  
  socket.on('connect', () => {
    console.log('Connected to backend');
  });
  
  socket.on('detection_update', (data) => {
    onDetectionUpdate(data);
  });
  
  socket.on('disconnect', () => {
    console.log('Disconnected from backend');
  });
  
  socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
  });
  
  return socket;
};

// Start detection on the backend
export const startDetection = async () => {
  try {
    const response = await fetch(`${API_URL}/api/start-detection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error starting detection:', error);
    throw error;
  }
};

// Stop detection on the backend
export const stopDetection = async () => {
  try {
    const response = await fetch(`${API_URL}/api/stop-detection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error stopping detection:', error);
    throw error;
  }
};

// Get backend info
export const getBackendInfo = async () => {
  try {
    const response = await fetch(`${API_URL}/api/info`);
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting backend info:', error);
    throw error;
  }
}; 