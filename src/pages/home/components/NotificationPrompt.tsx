import React from 'react';
import './NotificationPrompt.css';

interface NotificationPromptProps {
  visible: boolean;
  onEnable: () => void;
  onDismiss: () => void;
  loading?: boolean;
  error?: string | null;
}

/**
 * NotificationPrompt component - displays a notification permission request prompt
 */
const NotificationPrompt: React.FC<NotificationPromptProps> = ({ 
  visible, 
  onEnable, 
  onDismiss, 
  loading = false,
  error = null 
}) => {
  if (!visible) return null;

  return (
    <div className="notification-prompt">
      <div className="notification-prompt-header">
        <span className="notification-prompt-icon">🔔</span>
        <h3 className="notification-prompt-title">Stay Updated!</h3>
      </div>
      
      <p className="notification-prompt-message">
        Get notified when someone likes your posts or interacts with your content.
      </p>
      
      {error && (
        <div className="notification-prompt-error">
          {error}
        </div>
      )}
      
      <div className="notification-prompt-actions">
        <button
          onClick={onEnable}
          disabled={loading}
          className="notification-prompt-enable-btn"
          aria-label="Enable notifications"
        >
          {loading ? 'Enabling...' : 'Enable'}
        </button>
        <button
          onClick={onDismiss}
          disabled={loading}
          className="notification-prompt-dismiss-btn"
          aria-label="Dismiss notification prompt"
        >
          Maybe Later
        </button>
      </div>
    </div>
  );
};

export default NotificationPrompt;