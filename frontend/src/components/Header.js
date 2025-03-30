import React from 'react';
import './Header.css';

function Header({ toggleSidebar, userProfile }) {
  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-toggle" onClick={toggleSidebar}>
          <span className="menu-icon">☰</span>
        </button>
        <h1 className="app-title">
          <svg className="eco-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Tree with leaves SVG */}
            <path d="M12 2L9 7L7.5 6.5L7 9.5L4 12L7 14.5L6.5 18L9.5 17.5L12 22L14.5 17.5L17.5 18L17 14.5L20 12L17 9.5L16.5 6.5L15 7L12 2Z" fill="#4CAF50"/>
            <path d="M12 22V15" stroke="#2E7D32" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="9" r="2" fill="#81C784"/>
            <circle cx="9" cy="12" r="1.5" fill="#81C784"/>
            <circle cx="15" cy="12" r="1.5" fill="#81C784"/>
            <circle cx="12" cy="15" r="1.5" fill="#81C784"/>
          </svg>
          <span className="title-glow">Cycle</span> <span className="title-up">Up</span>
        </h1>
      </div>
      <div className="header-center">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="Search..." />
        </div>
      </div>
      <div className="header-right">
        <a href="/recognition" className="eco-button recognition-button">
          <span className="eco-button-icon">🎓</span>
          Learn with AI
        </a>
        <a href="/dashboard" className="eco-button community-button">
          <span className="eco-button-icon">🌱</span>
          Explore
        </a>
        <div className="user-button">
          {userProfile ? (
            <img 
              src={userProfile} 
              alt="User Profile" 
              className="user-profile-image" 
            />
          ) : (
            <div className="user-avatar">TD</div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header; 



//this is the header component for the cycle up app
//it is used to display the app title and the user profile image
//it also has a menu toggle button to open and close the sidebar
//it also has a search bar to search for a specific item
//it also has a cycle up button to go to the cycle up page
//it also has a user button to display the user profile image
