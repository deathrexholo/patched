import React from 'react';
import './OfflinePage.css';

const OfflinePage: React.FC = () => (
  <div className="offline-page">
    <div className="offline-content">
      <div className="offline-icon">📡</div>
      <h2>You're Offline</h2>
      <p>Check your connection and try again.</p>
      <button 
        onClick={() => window.location.reload()}
        className="retry-button"
      >
        Retry
      </button>
    </div>
  </div>
);

export default OfflinePage;
