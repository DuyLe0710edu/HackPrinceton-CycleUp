// Simple data store for detection history
class DetectionStore {
  constructor() {
    this.detections = [];
    this.startTime = Date.now();
  }

  addDetections(detections) {
    const timestamp = Date.now();
    // Add timestamp to each detection
    const timestampedDetections = detections.map(detection => ({
      ...detection,
      timestamp,
      relativeTime: (timestamp - this.startTime) / 1000 // in seconds
    }));
    
    this.detections = [...this.detections, ...timestampedDetections];
    
    // Keep only last 1000 detections to avoid memory issues
    if (this.detections.length > 1000) {
      this.detections = this.detections.slice(this.detections.length - 1000);
    }
  }

  getDetections() {
    return this.detections;
  }

  getDetectionsByClass() {
    // Group detections by class
    return this.detections.reduce((acc, detection) => {
      if (!acc[detection.class]) {
        acc[detection.class] = [];
      }
      acc[detection.class].push(detection);
      return acc;
    }, {});
  }

  getDetectionCountsByClass() {
    const detectionsByClass = this.getDetectionsByClass();
    return Object.keys(detectionsByClass).reduce((acc, className) => {
      acc[className] = detectionsByClass[className].length;
      return acc;
    }, {});
  }

  getAverageConfidenceByClass() {
    const detectionsByClass = this.getDetectionsByClass();
    return Object.keys(detectionsByClass).reduce((acc, className) => {
      const detections = detectionsByClass[className];
      const totalConfidence = detections.reduce((sum, detection) => sum + detection.confidence, 0);
      acc[className] = detections.length > 0 ? totalConfidence / detections.length : 0;
      return acc;
    }, {});
  }

  getTimeSeriesData(timeWindowSeconds = 60) {
    // Group by class and time (in bins of 1 second)
    const now = Date.now();
    const timeWindowStart = now - (timeWindowSeconds * 1000);
    
    // Filter recent detections
    const recentDetections = this.detections.filter(d => d.timestamp >= timeWindowStart);
    
    // Group by second
    const secondBins = {};
    
    for (let i = 0; i < timeWindowSeconds; i++) {
      const timeKey = i;
      secondBins[timeKey] = {
        glass: 0,
        metal: 0,
        paper: 0,
        plastic: 0,
        undefined: 0
      };
    }
    
    // Count detections per class per second
    recentDetections.forEach(detection => {
      const secondsAgo = Math.floor((now - detection.timestamp) / 1000);
      const timeKey = timeWindowSeconds - secondsAgo - 1;
      if (timeKey >= 0 && timeKey < timeWindowSeconds) {
        if (secondBins[timeKey][detection.class] !== undefined) {
          secondBins[timeKey][detection.class]++;
        }
      }
    });
    
    // Convert to chart.js format
    return {
      labels: Array.from({ length: timeWindowSeconds }, (_, i) => `-${timeWindowSeconds - i}s`),
      datasets: [
        {
          label: 'Glass',
          data: Object.values(secondBins).map(bin => bin.glass),
          borderColor: 'rgba(0, 255, 0, 0.8)',
          backgroundColor: 'rgba(0, 255, 0, 0.2)',
        },
        {
          label: 'Metal',
          data: Object.values(secondBins).map(bin => bin.metal),
          borderColor: 'rgba(255, 0, 0, 0.8)',
          backgroundColor: 'rgba(255, 0, 0, 0.2)',
        },
        {
          label: 'Paper',
          data: Object.values(secondBins).map(bin => bin.paper),
          borderColor: 'rgba(0, 0, 255, 0.8)',
          backgroundColor: 'rgba(0, 0, 255, 0.2)',
        },
        {
          label: 'Plastic',
          data: Object.values(secondBins).map(bin => bin.plastic),
          borderColor: 'rgba(255, 255, 0, 0.8)',
          backgroundColor: 'rgba(255, 255, 0, 0.2)',
        },
        {
          label: 'Undefined',
          data: Object.values(secondBins).map(bin => bin.undefined),
          borderColor: 'rgba(255, 0, 255, 0.8)',
          backgroundColor: 'rgba(255, 0, 255, 0.2)',
        }
      ]
    };
  }

  clear() {
    this.detections = [];
    this.startTime = Date.now();
  }
}

// Create a singleton instance
const detectionStore = new DetectionStore();
export default detectionStore; 