import React from 'react';
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'white' | 'inherit';
  className?: string;
  label?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = 'primary',
  className = '',
  label = 'Loading...'
}) => {
  return (
    <div 
      className={`loading-spinner loading-spinner-${size} loading-spinner-${color} ${className}`}
      role="status"
      aria-label={label}
    >
      <div className="spinner-circle">
        <div className="spinner-inner"></div>
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
};

export default LoadingSpinner;