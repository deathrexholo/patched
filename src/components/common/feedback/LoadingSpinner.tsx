import React, { memo } from 'react';
import { Loader2 } from 'lucide-react';
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'white';
  text?: string;
  className?: string;
}

const LoadingSpinner = memo<LoadingSpinnerProps>(({
  size = 'medium',
  color = 'primary',
  text,
  className = ''
}) => {
  const sizeMap = {
    small: 16,
    medium: 24,
    large: 32
  };

  return (
    <div className={`loading-spinner-container ${size} ${color} ${className}`}>
      <Loader2 
        size={sizeMap[size]} 
        className="loading-spinner-icon" 
      />
      {text && <span className="loading-text">{text}</span>}
    </div>
  );
});

LoadingSpinner.displayName = 'LoadingSpinner';

export default LoadingSpinner;