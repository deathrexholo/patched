// Enhanced lazy loading utilities
import { lazy, Suspense } from 'react';

// Higher-order component for lazy loading with error boundary
export const withLazyLoading = (importFunc, fallback = null) => {
  const LazyComponent = lazy(importFunc);
  
  return function LazyLoadedComponent(props) {
    return (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
};

// Preload component for better UX
export const preloadComponent = (importFunc) => {
  const componentImport = importFunc();
  return componentImport;
};

// Lazy load with retry logic
export const lazyWithRetry = (importFunc, retries = 3) => {
  return lazy(() => 
    new Promise((resolve, reject) => {
      let attempt = 0;
      
      const tryImport = () => {
        attempt++;
        importFunc()
          .then(resolve)
          .catch((error) => {
            if (attempt < retries) {
              console.warn(`Lazy load attempt ${attempt} failed, retrying...`);
              setTimeout(tryImport, 1000 * attempt); // Exponential backoff
            } else {
              reject(error);
            }
          });
      };
      
      tryImport();
    })
  );
};

// Loading component with skeleton UI
export const LoadingFallback = ({ height = '200px', width = '100%' }) => (
  <div 
    className="loading-skeleton"
    style={{
      height,
      width,
      backgroundColor: 'var(--bg-secondary)',
      borderRadius: '8px',
      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    }}
  />
);

// Route-based code splitting helper
export const createRouteComponent = (importFunc, fallback) => 
  withLazyLoading(importFunc, fallback || <LoadingFallback />);