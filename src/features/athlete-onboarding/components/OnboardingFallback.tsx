import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Home, RefreshCw } from 'lucide-react';
import OnboardingRecovery from './OnboardingRecovery';
import { hasOnboardingBackups } from '../utils/backupUtils';
import '../styles/OnboardingFallback.css';

interface OnboardingFallbackProps {
  error?: Error;
  resetError?: () => void;
}

const OnboardingFallback: React.FC<OnboardingFallbackProps> = ({ 
  error, 
  resetError 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showRecovery, setShowRecovery] = useState(false);
  const [hasBackups, setHasBackups] = useState(false);

  useEffect(() => {
    // Check if there are any backups available
    setHasBackups(hasOnboardingBackups());
  }, []);

  const handleGoBack = () => {
    try {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        navigate('/athlete-onboarding/sport');
      }
    } catch (navError) {
      console.error('Navigation error:', navError);
      window.location.href = '/athlete-onboarding/sport';
    }
  };

  const handleGoHome = () => {
    try {
      navigate('/');
    } catch (navError) {
      console.error('Navigation error:', navError);
      window.location.href = '/';
    }
  };

  const handleStartOver = () => {
    try {
      // Clear any existing onboarding data
      localStorage.removeItem('athlete-onboarding-storage');
      sessionStorage.removeItem('athlete-onboarding-temp');
      
      navigate('/athlete-onboarding/sport');
    } catch (navError) {
      console.error('Navigation error:', navError);
      window.location.href = '/athlete-onboarding/sport';
    }
  };

  const handleRetry = () => {
    if (resetError) {
      resetError();
    }
    
    try {
      // Try to reload the current page
      window.location.reload();
    } catch (reloadError) {
      console.error('Reload error:', reloadError);
      navigate('/athlete-onboarding/sport');
    }
  };

  const handleShowRecovery = () => {
    setShowRecovery(true);
  };

  const handleRecoveryComplete = () => {
    setShowRecovery(false);
  };

  const getErrorMessage = (): string => {
    if (error) {
      if (error.message.includes('ChunkLoadError')) {
        return 'Failed to load application resources. This might be due to a network issue or an app update.';
      }
      
      if (error.message.includes('Network')) {
        return 'Network connection error. Please check your internet connection and try again.';
      }
      
      if (error.message.includes('404') || error.message.includes('Not Found')) {
        return 'The page you\'re looking for doesn\'t exist or has been moved.';
      }
      
      if (error.message.includes('permission') || error.message.includes('auth')) {
        return 'You don\'t have permission to access this page. Please check your authentication status.';
      }
    }
    
    // Check for route-specific errors
    const path = location.pathname;
    if (path.includes('/athlete-onboarding/')) {
      return 'There was an issue loading the athlete onboarding page. This might be due to invalid parameters or a temporary issue.';
    }
    
    return 'Something went wrong while loading this page. We\'re working to fix this issue.';
  };

  const getErrorTitle = (): string => {
    if (error?.message.includes('404') || error?.message.includes('Not Found')) {
      return 'Page Not Found';
    }
    
    if (error?.message.includes('Network')) {
      return 'Connection Error';
    }
    
    if (error?.message.includes('permission') || error?.message.includes('auth')) {
      return 'Access Denied';
    }
    
    return 'Something Went Wrong';
  };

  if (showRecovery) {
    return (
      <OnboardingRecovery 
        onRecoveryComplete={handleRecoveryComplete}
        showFullInterface={true}
      />
    );
  }

  return (
    <div className="onboarding-fallback">
      <div className="fallback-container">
        <div className="fallback-icon">
          <AlertTriangle size={48} />
        </div>
        
        <div className="fallback-content">
          <h1>{getErrorTitle()}</h1>
          <p className="fallback-message">
            {getErrorMessage()}
          </p>
          
          {error && process.env.NODE_ENV === 'development' && (
            <details className="error-details">
              <summary>Technical Details (Development Only)</summary>
              <div className="error-debug">
                <p><strong>Error:</strong> {error.message}</p>
                <p><strong>Location:</strong> {location.pathname}</p>
                {error.stack && (
                  <pre className="error-stack">{error.stack}</pre>
                )}
              </div>
            </details>
          )}
        </div>
        
        <div className="fallback-actions">
          <div className="primary-actions">
            <button 
              className="retry-button primary"
              onClick={handleRetry}
            >
              <RefreshCw size={20} />
              Try Again
            </button>
            
            {hasBackups && (
              <button 
                className="recovery-button secondary"
                onClick={handleShowRecovery}
              >
                <RefreshCw size={20} />
                Restore Progress
              </button>
            )}
          </div>
          
          <div className="secondary-actions">
            <button 
              className="back-button secondary"
              onClick={handleGoBack}
            >
              <ArrowLeft size={20} />
              Go Back
            </button>
            
            <button 
              className="start-over-button secondary"
              onClick={handleStartOver}
            >
              Start Over
            </button>
            
            <button 
              className="home-button secondary"
              onClick={handleGoHome}
            >
              <Home size={20} />
              Go Home
            </button>
          </div>
        </div>
        
        <div className="fallback-footer">
          <p>
            If this problem persists, please try refreshing the page or contact support.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingFallback;