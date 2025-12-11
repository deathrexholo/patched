import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Options for scroll velocity tracking
 */
export interface UseScrollVelocityOptions {
  container?: HTMLElement | null;
  debounceMs?: number;
  calculateInterval?: number;
}

/**
 * Scroll velocity data
 */
export interface ScrollVelocityData {
  velocity: number; // pixels per second
  isScrolling: boolean;
  direction: 'up' | 'down' | 'idle';
  speed: 'slow' | 'medium' | 'fast'; // categorized speed
}

/**
 * Custom hook to detect scroll velocity
 * Useful for adaptive performance optimizations
 *
 * @param options - Configuration options
 * @returns Current scroll velocity data and helper methods
 */
export const useScrollVelocity = (
  options: UseScrollVelocityOptions = {}
): ScrollVelocityData => {
  const {
    container = typeof window !== 'undefined' ? window : null,
    debounceMs = 100,
    calculateInterval = 100 // Calculate velocity every 100ms
  } = options;

  const lastScrollYRef = useRef(0);
  const lastTimestampRef = useRef(Date.now());
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const velocityCalculationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [scrollVelocity, setScrollVelocity] = useState<ScrollVelocityData>({
    velocity: 0,
    isScrolling: false,
    direction: 'idle',
    speed: 'slow'
  });

  // Categorize speed based on velocity (pixels per second)
  const categorizeSpeed = useCallback((velocity: number): 'slow' | 'medium' | 'fast' => {
    const absVelocity = Math.abs(velocity);
    // Slow: < 300px/s, Medium: 300-800px/s, Fast: > 800px/s
    if (absVelocity < 300) return 'slow';
    if (absVelocity < 800) return 'medium';
    return 'fast';
  }, []);

  // Determine scroll direction
  const getDirection = useCallback((currentY: number, lastY: number): 'up' | 'down' => {
    return currentY > lastY ? 'down' : 'up';
  }, []);

  // Handle scroll event
  const handleScroll = useCallback(() => {
    if (!container) return;

    const currentScrollY = container === window
      ? (window.scrollY || (document.documentElement.scrollTop))
      : (container as HTMLElement).scrollTop;

    const currentTime = Date.now();

    // Set scrolling to true
    setScrollVelocity(prev => ({
      ...prev,
      isScrolling: true
    }));

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Set timeout to mark scrolling as complete after debounce period
    scrollTimeoutRef.current = setTimeout(() => {
      setScrollVelocity(prev => ({
        ...prev,
        isScrolling: false,
        velocity: 0,
        direction: 'idle',
        speed: 'slow'
      }));
    }, debounceMs);

    // Update refs for next calculation
    lastScrollYRef.current = currentScrollY;
    lastTimestampRef.current = currentTime;
  }, [container, debounceMs]);

  // Calculate velocity periodically
  useEffect(() => {
    if (!container) return;

    velocityCalculationRef.current = setInterval(() => {
      const currentScrollY = container === window
        ? (window.scrollY || document.documentElement.scrollTop)
        : (container as HTMLElement).scrollTop;

      const currentTime = Date.now();
      const timeDelta = (currentTime - lastTimestampRef.current) / 1000; // Convert to seconds
      const scrollDelta = currentScrollY - lastScrollYRef.current;

      if (timeDelta > 0) {
        const velocity = scrollDelta / timeDelta; // pixels per second
        const direction = scrollDelta === 0 ? 'idle' : getDirection(currentScrollY, lastScrollYRef.current);
        const speed = categorizeSpeed(velocity);

        setScrollVelocity({
          velocity: Math.abs(velocity),
          isScrolling: true,
          direction: direction as 'up' | 'down' | 'idle',
          speed
        });
      }
    }, calculateInterval);

    // Add scroll listener
    const target = container === window ? window : (container as HTMLElement);
    target.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      target.removeEventListener('scroll', handleScroll);
      if (velocityCalculationRef.current) {
        clearInterval(velocityCalculationRef.current);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [container, handleScroll, getDirection, categorizeSpeed, calculateInterval]);

  return scrollVelocity;
};
