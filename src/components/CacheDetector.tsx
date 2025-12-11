import { useEffect } from 'react';

const CacheDetector = (): null => {
  useEffect(() => {
    const detectAndClearCache = (): void => {
      const currentVersion = '2.1.0';
      const storedVersion = localStorage.getItem('amaplayer-version');
      const lastReload = localStorage.getItem('amaplayer-last-reload');
      const now = Date.now();
      
      // Prevent infinite reload - only reload once per 10 seconds
      if (lastReload && (now - parseInt(lastReload)) < 10000) {return;
      }
      
      // Only check if version is missing or different
      if (!storedVersion || storedVersion !== currentVersion) {// Just update the version without forcing reload
        try {
          localStorage.setItem('amaplayer-version', currentVersion);
        } catch (e) {
          // Silently fail if localStorage is not available
        }
        
        // Only reload if we're clearly on the wrong page
        setTimeout(() => {
          const title = document.title;
          const url = window.location.href;
          
          // Very specific check - only reload if we're definitely on old 3D page
          if (title === 'React App' || url.includes('landingpage3d')) {try {
              localStorage.setItem('amaplayer-last-reload', now.toString());
            } catch (e) {
              // Silently fail if localStorage is not available
            }
            window.location.reload();
          }
        }, 1000);
      } else {}
    };
    
    detectAndClearCache();
  }, []);
  
  return null; // This component doesn't render anything
};

export default CacheDetector;
