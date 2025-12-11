import React, { useState, useEffect, ReactNode } from 'react';
import OfflinePage from './OfflinePage';

interface OfflineWrapperProps {
  children: ReactNode;
  showOfflineForCriticalOperations?: boolean;
}

const OfflineWrapper: React.FC<OfflineWrapperProps> = ({ children, showOfflineForCriticalOperations = false }) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showOfflinePage, setShowOfflinePage] = useState<boolean>(false);
  
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflinePage(false);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      if (showOfflineForCriticalOperations) {
        setShowOfflinePage(true);
      }
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showOfflineForCriticalOperations]);
  
  if (showOfflinePage && !isOnline) {
    return <OfflinePage />;
  }
  
  return <>{children}</>;
};

export default OfflineWrapper;
