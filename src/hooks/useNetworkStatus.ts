import { useState, useEffect, useCallback } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string;
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

interface NetworkConnection extends EventTarget {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
  type: string;
}

declare global {
  interface Navigator {
    connection?: NetworkConnection;
    mozConnection?: NetworkConnection;
    webkitConnection?: NetworkConnection;
  }
}

/**
 * Hook for monitoring network connectivity status
 * 
 * Provides real-time information about network connectivity,
 * connection quality, and data saving preferences.
 */
export const useNetworkStatus = () => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(() => {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    return {
      isOnline: navigator.onLine,
      isSlowConnection: connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g',
      connectionType: connection?.type || 'unknown',
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 0,
      rtt: connection?.rtt || 0,
      saveData: connection?.saveData || false
    };
  });

  const updateNetworkStatus = useCallback(() => {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    setNetworkStatus({
      isOnline: navigator.onLine,
      isSlowConnection: connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g',
      connectionType: connection?.type || 'unknown',
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 0,
      rtt: connection?.rtt || 0,
      saveData: connection?.saveData || false
    });
  }, []);

  useEffect(() => {
    // Listen for online/offline events
    const handleOnline = () => updateNetworkStatus();
    const handleOffline = () => updateNetworkStatus();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection changes
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      connection.addEventListener('change', updateNetworkStatus);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection) {
        connection.removeEventListener('change', updateNetworkStatus);
      }
    };
  }, [updateNetworkStatus]);

  const isGoodConnection = useCallback(() => {
    return networkStatus.isOnline && 
           !networkStatus.isSlowConnection && 
           networkStatus.effectiveType !== 'slow-2g' &&
           networkStatus.effectiveType !== '2g';
  }, [networkStatus]);

  const shouldReduceQuality = useCallback(() => {
    return !networkStatus.isOnline || 
           networkStatus.isSlowConnection || 
           networkStatus.saveData ||
           networkStatus.downlink < 1.5; // Less than 1.5 Mbps
  }, [networkStatus]);

  const getRecommendedVideoQuality = useCallback(() => {
    if (!networkStatus.isOnline) return 'offline';
    if (networkStatus.saveData) return 'low';
    if (networkStatus.isSlowConnection) return 'low';
    
    switch (networkStatus.effectiveType) {
      case 'slow-2g':
      case '2g':
        return 'low';
      case '3g':
        return 'medium';
      case '4g':
      default:
        return 'high';
    }
  }, [networkStatus]);

  return {
    networkStatus,
    isGoodConnection: isGoodConnection(),
    shouldReduceQuality: shouldReduceQuality(),
    recommendedVideoQuality: getRecommendedVideoQuality(),
    updateNetworkStatus
  };
};