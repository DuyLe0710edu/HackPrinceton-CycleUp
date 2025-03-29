import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import CameraDetection from './components/CameraDetection';
import DetectionResults from './components/DetectionResults';
import Analytics from './components/Analytics';
import Footer from './components/Footer';
import ProfileModal from './components/ProfileModal';
import detectionStore from './services/detectionStore';

// We'll create a recognition component
const RecognitionPage = () => {
  return (
    <div className="recognition-page">
      <h2>Gesture & Pose Recognition</h2>
      <div className="recognition-content">
        <p>This page will feature MediaPipe-based gesture, face, and pose recognition.</p>
        <div className="recognition-placeholder">
          <div className="recognition-loading">Coming Soon</div>
        </div>
      </div>
    </div>
  );
};

// Main application layout component
const AppLayout = ({ children }) => {
  const [detections, setDetections] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState('detection'); // 'detection' or 'analytics'
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  // Load user profile from localStorage
  useEffect(() => {
    const savedProfile = localStorage.getItem('userProfileSketch');
    if (savedProfile) {
      setUserProfile(savedProfile);
    }
  }, []);

  const handleDetectionUpdate = (newDetections) => {
    setDetections(newDetections);
    // Also add to our detection store for analytics
    detectionStore.addDetections(newDetections);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  const navigateTo = (view) => {
    setCurrentView(view);
  };
  
  const openProfileModal = () => {
    setProfileModalOpen(true);
  };
  
  const closeProfileModal = () => {
    setProfileModalOpen(false);
  };
  
  const handleProfileSave = (imageData) => {
    setUserProfile(imageData);
  };

  return (
    <div className="App">
      <Header toggleSidebar={toggleSidebar} userProfile={userProfile} />
      <div className="app-container">
        <Sidebar 
          isOpen={sidebarOpen} 
          onNavigate={navigateTo} 
          currentView={currentView}
          onCreateProfile={openProfileModal}
        />
        <main className={`main-content ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
          <div className="content-wrapper">
            {children || (
              currentView === 'detection' ? (
                <>
                  <CameraDetection onDetectionUpdate={handleDetectionUpdate} />
                  <DetectionResults detections={detections} />
                </>
              ) : (
                <Analytics />
              )
            )}
          </div>
        </main>
      </div>
      <Footer />
      
      <ProfileModal 
        isOpen={profileModalOpen}
        onClose={closeProfileModal}
        onSave={handleProfileSave}
        currentProfile={userProfile}
      />
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppLayout />} />
        <Route path="/recognition" element={
          <AppLayout>
            <RecognitionPage />
          </AppLayout>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App; 