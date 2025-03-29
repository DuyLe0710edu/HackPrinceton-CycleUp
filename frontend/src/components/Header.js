import React from 'react';
import './Header.css';

function Header({ toggleSidebar, userProfile }) {
  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-toggle" onClick={toggleSidebar}>
          <span className="menu-icon">☰</span>
        </button>
        <h1 className="app-title">Cycle Up</h1>
      </div>
      <div className="header-center">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="Search..." />
        </div>
      </div>
      <div className="header-right">
        <a href="/recognition" className="cycle-up-button">
          CycleUp
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
