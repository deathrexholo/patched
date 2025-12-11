import React from 'react';
import { Loader2 } from 'lucide-react';
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  message?: string;
  overlay?: boolean;
  className?: string;
}

/**
 * Loading Spinner Component
 * 
 * Displays a loading spinner with optional message and overlay.
 * Used for indicating loading states throughout the application.
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color,
  message,
  overlay = false,
  className = ''
}) => {
  const sizeMap = {
    small: 16,
    medium: 24,
    large: 48
  };

  const spinnerSize = sizeMap[size];

  const content = (
    <div className={`loading-spinner-content ${className}`}>
      <Loader2 
        size={spinnerSize} 
        className="loading-spinner-icon"
        style={{ color }}
      />
      {message && (
        <p className="loading-spinner-message">{message}</p>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="loading-spinner-overlay">
        {content}
      </div>
    );
  }

  return content;
};

export default LoadingSpinner;