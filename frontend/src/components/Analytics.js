import React, { useState, useEffect } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import detectionStore from '../services/detectionStore';
import './Analytics.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

function Analytics() {
  const [timeSeriesData, setTimeSeriesData] = useState(null);
  const [countData, setCountData] = useState(null);
  const [confidenceData, setConfidenceData] = useState(null);
  const [timeWindow, setTimeWindow] = useState(60); // 60 seconds
  
  useEffect(() => {
    // Update data initially
    updateData();
    
    // Set interval to update data every second
    const interval = setInterval(updateData, 1000);
    
    return () => clearInterval(interval);
  }, [timeWindow]);
  
  const updateData = () => {
    // Update time series data
    setTimeSeriesData(detectionStore.getTimeSeriesData(timeWindow));
    
    // Update count data
    const counts = detectionStore.getDetectionCountsByClass();
    setCountData({
      labels: Object.keys(counts),
      datasets: [
        {
          label: 'Detection Count',
          data: Object.values(counts),
          backgroundColor: [
            'rgba(0, 255, 0, 0.8)',  // Glass
            'rgba(255, 0, 0, 0.8)',  // Metal
            'rgba(0, 0, 255, 0.8)',  // Paper
            'rgba(255, 255, 0, 0.8)', // Plastic
            'rgba(255, 0, 255, 0.8)'  // Undefined
          ]
        }
      ]
    });
    
    // Update confidence data
    const confidences = detectionStore.getAverageConfidenceByClass();
    setConfidenceData({
      labels: Object.keys(confidences),
      datasets: [
        {
          label: 'Average Confidence',
          data: Object.values(confidences).map(conf => conf * 100), // Convert to percentage
          backgroundColor: [
            'rgba(0, 255, 0, 0.8)',  // Glass
            'rgba(255, 0, 0, 0.8)',  // Metal
            'rgba(0, 0, 255, 0.8)',  // Paper
            'rgba(255, 255, 0, 0.8)', // Plastic
            'rgba(255, 0, 255, 0.8)'  // Undefined
          ]
        }
      ]
    });
  };
  
  const handleTimeWindowChange = (e) => {
    setTimeWindow(parseInt(e.target.value));
  };

  return (
    <div className="analytics">
      <div className="analytics-header">
        <h2>Trash Detection Analytics</h2>
        <div className="time-controls">
          <label htmlFor="timeWindow">Time Window:</label>
          <select id="timeWindow" value={timeWindow} onChange={handleTimeWindowChange}>
            <option value="30">30 seconds</option>
            <option value="60">1 minute</option>
            <option value="300">5 minutes</option>
            <option value="600">10 minutes</option>
          </select>
        </div>
      </div>
      
      <div className="charts-container">
        <div className="chart-card">
          <h3>Detection Count Over Time</h3>
          <div className="chart-wrapper">
            {timeSeriesData && <Line 
              data={timeSeriesData} 
              options={{
                responsive: true,
                scales: {
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'Number of Detections'
                    }
                  },
                  x: {
                    title: {
                      display: true,
                      text: 'Time (seconds ago)'
                    }
                  }
                },
                plugins: {
                  legend: {
                    position: 'top',
                  },
                  title: {
                    display: true,
                    text: 'Detections by Type Over Time'
                  }
                }
              }}
            />}
          </div>
        </div>
        
        <div className="chart-row">
          <div className="chart-card half">
            <h3>Total Detections by Type</h3>
            <div className="chart-wrapper">
              {countData && <Doughnut 
                data={countData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'right',
                    },
                    title: {
                      display: true,
                      text: 'Detection Distribution'
                    }
                  }
                }}
              />}
            </div>
          </div>
          
          <div className="chart-card half">
            <h3>Average Confidence by Type</h3>
            <div className="chart-wrapper">
              {confidenceData && <Bar 
                data={confidenceData}
                options={{
                  responsive: true,
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                      title: {
                        display: true,
                        text: 'Confidence %'
                      }
                    }
                  },
                  plugins: {
                    legend: {
                      display: false
                    },
                    title: {
                      display: true,
                      text: 'Detection Confidence'
                    }
                  }
                }}
              />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics; 