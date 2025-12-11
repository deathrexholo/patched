/**
 * Optimized Component Wrapper
 * Provides performance optimizations for React components
 */

import React, { memo, useMemo, useCallback, useRef, useEffect } from 'react';

interface OptimizedComponentProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  onScroll?: (event: React.UIEvent) => void;
  enableVirtualization?: boolean;
  debounceMs?: number;
}

// Debounce hook for performance
const useDebounce = (callback: Function, delay: number) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  return useCallback((...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => callback(...args), delay);
  }, [callback, delay]);
};

// Throttle hook for scroll events
const useThrottle = (callback: Function, delay: number) => {
  const lastRun = useRef(Date.now());
  
  return useCallback((...args: any[]) => {
    if (Date.now() - lastRun.current >= delay) {
      callback(...args);
      lastRun.current = Date.now();
    }
  }, [callback, delay]);
};

const OptimizedComponent: React.FC<OptimizedComponentProps> = memo(({
  children,
  className,
  style,
  onClick,
  onScroll,
  enableVirtualization = false,
  debounceMs = 300
}) => {
  // Optimize event handlers
  const debouncedClick = useDebounce(onClick || (() => {}), debounceMs);
  const throttledScroll = useThrottle(onScroll || (() => {}), 16); // 60fps

  // Memoize style object to prevent re-renders
  const memoizedStyle = useMemo(() => ({
    ...style,
    ...(enableVirtualization && {
      transform: 'translateZ(0)', // Force GPU acceleration
      willChange: 'transform'
    })
  }), [style, enableVirtualization]);

  // Optimize class name
  const memoizedClassName = useMemo(() => {
    const classes = [className];
    if (enableVirtualization) {
      classes.push('optimized-component');
    }
    return classes.filter(Boolean).join(' ');
  }, [className, enableVirtualization]);

  return (
    <div
      className={memoizedClassName}
      style={memoizedStyle}
      onClick={onClick ? debouncedClick : undefined}
      onScroll={onScroll ? throttledScroll : undefined}
    >
      {children}
    </div>
  );
});

OptimizedComponent.displayName = 'OptimizedComponent';

export default OptimizedComponent;