import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import SettingsMenu from './SettingsMenu';

/**
 * Demo component to test SettingsMenu rendering in main display area
 * This component can be used to verify that the modal appears correctly
 * outside of the NavigationBar constraints.
 */
const SettingsMenuDemo: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleOpenSettings = () => {setIsSettingsOpen(true);
  };

  const handleCloseSettings = () => {setIsSettingsOpen(false);
  };

  return (
    <div style={{ 
      padding: '20px', 
      textAlign: 'center',
      minHeight: '200px',
      border: '2px dashed #ccc',
      borderRadius: '8px',
      margin: '20px'
    }}>
      <h3>Settings Menu Demo</h3>
      <p>Click the button below to test the Settings Menu modal.</p>
      <p>The modal should appear centered on the screen, not constrained by this container.</p>
      
      <button
        onClick={handleOpenSettings}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 24px',
          background: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          margin: '20px auto',
          fontSize: '16px'
        }}
      >
        <Settings size={20} />
        Open Settings Menu
      </button>

      <div style={{ 
        marginTop: '20px', 
        padding: '10px', 
        background: '#f8f9fa', 
        borderRadius: '4px',
        fontSize: '14px',
        color: '#666'
      }}>
        <strong>Expected behavior:</strong>
        <ul style={{ textAlign: 'left', margin: '10px 0' }}>
          <li>Modal appears centered on the entire screen</li>
          <li>Dark overlay covers the entire viewport</li>
          <li>Modal is not constrained by this demo container</li>
          <li>All settings options are functional</li>
          <li>Modal can be closed by clicking overlay or X button</li>
        </ul>
      </div>

      <SettingsMenu
        isOpen={isSettingsOpen}
        onClose={handleCloseSettings}
        isGuest={true}
        currentUser={null}
      />
    </div>
  );
};

export default SettingsMenuDemo;