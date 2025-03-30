import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import './App.css';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import CameraDetection from './components/CameraDetection';
import DetectionResults from './components/DetectionResults';
import Analytics from './components/Analytics';
import Footer from './components/Footer';
import ProfileModal from './components/ProfileModal';
import MediaPipeRecognition from './components/MediaPipeRecognition';
import MediaPipeWrapper from './components/MediaPipeWrapper';
import detectionStore from './services/detectionStore';
import LiveKitIntegrator from './components/LiveKitIntegrator';
import LandingPage from './components/LandingPage';
import Stories from './components/Stories';
import KindergartenAssistant from './components/KindergartenAssistant';

// Add styles for the components layer
const overlayStyles = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  zIndex: 10,
  backgroundColor: '#fff'
};

// Wrapped component that can use Router hooks
const RoutedAppLayout = ({ children }) => {
  const [detections, setDetections] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState('detection'); // 'detection', 'analytics', 'recognition', 'stories', or 'aiassistant'
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  
  // Track if MediaPipe has been initialized
  const [mediaPipeInitialized, setMediaPipeInitialized] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Update currentView based on current route
  useEffect(() => {
    if (location.pathname === '/recognition') {
      setCurrentView('recognition');
      setMediaPipeInitialized(true);
    } else if (location.pathname === '/dashboard') {
      setCurrentView('detection');
    } else if (location.pathname === '/stories') {
      setCurrentView('stories');
    } else if (location.pathname === '/aiassistant') {
      setCurrentView('aiassistant');
    }
  }, [location.pathname]);

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
    
    // Handle navigation between routes
    if (view === 'detection') {
      navigate('/dashboard');
    } else if (view === 'analytics') {
      // Keep on same route but change view
      navigate('/dashboard');
    } else if (view === 'recognition') {
      setMediaPipeInitialized(true);
      navigate('/recognition');
    } else if (view === 'stories') {
      navigate('/stories');
    } else if (view === 'aiassistant') {
      navigate('/aiassistant');
    }
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
          <div className="content-wrapper" style={{ position: 'relative' }}>
            {/* Always render MediaPipeWrapper after it's been initialized */}
            {mediaPipeInitialized && (currentView === 'recognition' || currentView === 'aiassistant') && (
              <div style={currentView === 'aiassistant' ? { position: 'relative', zIndex: 1 } : {}}>
                <LiveKitIntegrator
                  onMessageReceived={(message) => {
                    console.log("Received message from LiveKit:", message);
                  }}
                >
                  <MediaPipeWrapper />
                </LiveKitIntegrator>
              </div>
            )}
            
            {/* Layer the Kindergarten Assistant on top */}
            {currentView === 'aiassistant' && (
              <div style={overlayStyles}>
                <KindergartenAssistant onSendMessage={(message) => {}} />
              </div>
            )}
          
            {/* Only show children for routes other than recognition and aiassistant */}
            {children && currentView !== 'recognition' && currentView !== 'aiassistant' && children}
            
            {/* Show these components only for views that don't have specific routes */}
            {!children && (
              currentView === 'detection' ? (
                <>
                  <CameraDetection onDetectionUpdate={handleDetectionUpdate} />
                  <DetectionResults detections={detections} />
                </>
              ) : currentView === 'analytics' ? (
                <Analytics />
              ) : (
                <div /> // This is a placeholder that will be replaced by router content
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
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<RoutedAppLayout />} />
        <Route path="/recognition" element={<RoutedAppLayout />} />
        <Route path="/stories" element={
          <RoutedAppLayout>
            <Stories />
          </RoutedAppLayout>
        } />
        <Route path="/aiassistant" element={<RoutedAppLayout />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App; 