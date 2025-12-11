import React, { useState } from 'react';
import { Settings, Play, RotateCcw } from 'lucide-react';
import SettingsMenu from './SettingsMenu';

/**
 * Settings Animation Test Component
 * 
 * This component helps test and verify that the settings modal
 * animation works properly without the initial positioning issue.
 */
const SettingsAnimationTest: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [testCount, setTestCount] = useState(0);

  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
    setTestCount(prev => prev + 1);
  };

  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
  };

  const handleReset = () => {
    setIsSettingsOpen(false);
    setTestCount(0);
  };

  return (
    <div style={{ 
      padding: '20px', 
      textAlign: 'center',
      minHeight: '300px',
      border: '2px solid #e5e7eb',
      borderRadius: '8px',
      margin: '20px',
      backgroundColor: '#f9fafb'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        gap: '12px',
        marginBottom: '20px'
      }}>
        <Settings size={24} />
        <h3 style={{ margin: 0 }}>Settings Animation Test</h3>
      </div>

      <p style={{ marginBottom: '20px', color: '#6b7280' }}>
        Test the settings modal animation to ensure it opens smoothly without jumping to the top first.
      </p>

      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        justifyContent: 'center',
        marginBottom: '20px'
      }}>
        <button
          onClick={handleOpenSettings}
          disabled={isSettingsOpen}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            backgroundColor: isSettingsOpen ? '#9ca3af' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: isSettingsOpen ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: '500'
          }}
        >
          <Play size={16} />
          Test Animation
        </button>

        <button
          onClick={handleReset}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500'
          }}
        >
          <RotateCcw size={16} />
          Reset
        </button>
      </div>

      <div style={{ 
        marginBottom: '20px', 
        padding: '12px', 
        backgroundColor: '#e0f2fe', 
        borderRadius: '6px',
        fontSize: '14px'
      }}>
        <strong>Test Count: {testCount}</strong>
        <br />
        <span style={{ color: '#0369a1' }}>
          {isSettingsOpen ? 'Modal is currently open' : 'Modal is closed'}
        </span>
      </div>

      <div style={{ 
        padding: '16px', 
        backgroundColor: '#f0fdf4', 
        borderRadius: '6px',
        fontSize: '14px',
        textAlign: 'left'
      }}>
        <strong style={{ color: '#15803d' }}>✅ Expected Behavior:</strong>
        <ul style={{ margin: '8px 0', paddingLeft: '20px', color: '#166534' }}>
          <li>Modal should appear smoothly from slightly above center</li>
          <li>No jumping or repositioning after initial appearance</li>
          <li>Overlay should fade in simultaneously</li>
          <li>Animation should be smooth and consistent on repeated tests</li>
        </ul>
        
        <strong style={{ color: '#dc2626' }}>❌ Issues to Watch For:</strong>
        <ul style={{ margin: '8px 0', paddingLeft: '20px', color: '#dc2626' }}>
          <li>Modal appearing at top of screen first, then moving to center</li>
          <li>Flickering or jumping during animation</li>
          <li>Inconsistent animation on repeated opens</li>
          <li>Overlay appearing before or after modal</li>
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

export default SettingsAnimationTest;