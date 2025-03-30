// mediaStateService.js
// A service for sharing state between MediaPipeRecognition and AIAssistant

// Create a simple event emitter pattern
class MediaStateService {
  constructor() {
    this.listeners = {
      detectionStats: [],
      activityInsights: [],
      cameraStatus: []
    };
    
    // Initial state
    this.state = {
      detectionStats: {
        face: 0,
        pose: 0,
        gesture: 0,
        fps: 0
      },
      activityInsights: [],
      cameraRunning: false
    };
  }
  
  // Update detection stats
  updateDetectionStats(stats) {
    this.state.detectionStats = { ...stats };
    this.notifyListeners('detectionStats', this.state.detectionStats);
  }
  
  // Update activity insights
  updateActivityInsights(insights) {
    this.state.activityInsights = [...insights];
    this.notifyListeners('activityInsights', this.state.activityInsights);
  }
  
  // Update camera status
  updateCameraStatus(isRunning) {
    this.state.cameraRunning = isRunning;
    this.notifyListeners('cameraStatus', this.state.cameraRunning);
  }
  
  // Get current state
  getState() {
    return { ...this.state };
  }
  
  // Subscribe to changes
  subscribe(eventType, callback) {
    if (!this.listeners[eventType]) {
      this.listeners[eventType] = [];
    }
    this.listeners[eventType].push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners[eventType] = this.listeners[eventType].filter(
        cb => cb !== callback
      );
    };
  }
  
  // Notify listeners of changes
  notifyListeners(eventType, data) {
    if (this.listeners[eventType]) {
      this.listeners[eventType].forEach(callback => callback(data));
    }
  }
}

// Create a singleton instance
const mediaStateService = new MediaStateService();

export default mediaStateService; 