import React, { useState, useEffect } from 'react';
import './App.css';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import CameraDetection from './components/CameraDetection';
import DetectionResults from './components/DetectionResults';
import Analytics from './components/Analytics';
import Footer from './components/Footer';
import ProfileModal from './components/ProfileModal';
import detectionStore from './services/detectionStore';

function App() {
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
            {currentView === 'detection' ? (
              <>
                <CameraDetection onDetectionUpdate={handleDetectionUpdate} />
                <DetectionResults detections={detections} />
              </>
            ) : (
              <Analytics />
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
}

export default App; 