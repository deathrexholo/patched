import { useState, useEffect } from 'react';
import './NetworkStatus.css';

const NetworkStatus = (): React.ReactElement | null => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showStatus, setShowStatus] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = (): void => {
      setIsOnline(true);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    };

    const handleOffline = (): void => {
      setIsOnline(false);
      setShowStatus(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showStatus && isOnline) return null;

  return (
    <div className={`network-status ${isOnline ? 'online' : 'offline'}`}>
      {isOnline ? (
        <span>🟢 Back online</span>
      ) : (
        <span>🔴 No internet connection</span>
      )}
    </div>
  );
};

export default NetworkStatus;
