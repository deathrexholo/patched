import React from 'react';
import SettingsMenuDemo from '../components/common/settings/SettingsMenuDemo';
import SettingsFunctionalityTest from '../components/common/settings/SettingsFunctionalityTest';
import SettingsAnimationTest from '../components/common/settings/SettingsAnimationTest';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * Settings Test Page
 * 
 * A comprehensive test page for all settings functionality.
 * This page helps verify that all settings features are working
 * properly after the Portal implementation.
 */
const SettingsTestPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f9fafb',
      padding: '20px 0'
    }}>
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '0 20px' 
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px', 
          marginBottom: '32px' 
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: '#e5e7eb',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '700' }}>
            Settings Test Page
          </h1>
        </div>

        {/* Description */}
        <div style={{ 
          marginBottom: '32px', 
          padding: '20px', 
          backgroundColor: '#dbeafe', 
          borderRadius: '8px',
          border: '1px solid #bfdbfe'
        }}>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '20px' }}>
            Settings Functionality Verification
          </h2>
          <p style={{ margin: 0, color: '#1e40af' }}>
            This page provides comprehensive testing tools for all settings functionality. 
            Use the components below to verify that the Portal implementation is working 
            correctly and all settings features are functional.
          </p>
        </div>

        {/* Test Components */}
        <div style={{ 
          display: 'grid', 
          gap: '32px',
          gridTemplateColumns: '1fr',
          marginBottom: '32px'
        }}>
          {/* Animation Test */}
          <SettingsAnimationTest />
          
          {/* Functionality Test */}
          <SettingsFunctionalityTest />
          
          {/* Modal Demo */}
          <SettingsMenuDemo />
        </div>

        {/* Navigation Links */}
        <div style={{ 
          display: 'flex', 
          gap: '16px', 
          justifyContent: 'center',
          marginTop: '32px'
        }}>
          <button
            onClick={() => navigate('/settings')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500'
            }}
          >
            Go to Settings Page
          </button>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500'
            }}
          >
            Go to Home
          </button>
        </div>

        {/* Footer */}
        <div style={{ 
          marginTop: '48px', 
          padding: '20px', 
          textAlign: 'center',
          color: '#6b7280',
          fontSize: '14px'
        }}>
          <p>
            Settings Portal Implementation Test Suite - 
            Verify all functionality is working as expected
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsTestPage;