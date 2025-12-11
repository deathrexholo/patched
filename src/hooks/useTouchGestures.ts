import { useRef, useEffect, useCallback } from 'react';

interface TouchGestureOptions {
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onTap?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  minSwipeDistance?: number;
  maxTapDistance?: number;
  doubleTapDelay?: number;
  longPressDelay?: number;
  preventScroll?: boolean;
}

interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

/**
 * Custom hook for handling touch gestures on mobile devices
 * Supports swipe, tap, double tap, and long press gestures
 */
export const useTouchGestures = (options: TouchGestureOptions = {}) => {
  const {
    onSwipeUp,
    onSwipeDown,
    onSwipeLeft,
    onSwipeRight,
    onTap,
    onDoubleTap,
    onLongPress,
    minSwipeDistance = 50,
    maxTapDistance = 10,
    doubleTapDelay = 300,
    longPressDelay = 500,
    preventScroll = false
  } = options;

  const touchStartRef = useRef<TouchPoint | null>(null);
  const touchEndRef = useRef<TouchPoint | null>(null);
  const lastTapRef = useRef<TouchPoint | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleTouchStart = useCallback((event: TouchEvent) => {
    const touch = event.touches[0];
    if (!touch) return;

    const touchPoint: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    };

    touchStartRef.current = touchPoint;
    touchEndRef.current = null;
    isLongPressRef.current = false;

    // Start long press timer
    if (onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        onLongPress();
      }, longPressDelay);
    }

    // Prevent scroll if requested
    if (preventScroll) {
      event.preventDefault();
    }
  }, [onLongPress, longPressDelay, preventScroll]);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    const touch = event.touches[0];
    if (!touch || !touchStartRef.current) return;

    const currentPoint: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    };

    // Calculate distance moved
    const deltaX = Math.abs(currentPoint.x - touchStartRef.current.x);
    const deltaY = Math.abs(currentPoint.y - touchStartRef.current.y);
    const totalDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // If moved too far, cancel long press
    if (totalDistance > maxTapDistance) {
      clearLongPressTimer();
    }

    // Prevent scroll if requested and we're handling the gesture
    if (preventScroll && (deltaX > 10 || deltaY > 10)) {
      event.preventDefault();
    }
  }, [maxTapDistance, clearLongPressTimer, preventScroll]);

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    const touch = event.changedTouches[0];
    if (!touch || !touchStartRef.current) return;

    clearLongPressTimer();

    // If it was a long press, don't process other gestures
    if (isLongPressRef.current) {
      return;
    }

    const touchPoint: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    };

    touchEndRef.current = touchPoint;

    const deltaX = touchPoint.x - touchStartRef.current.x;
    const deltaY = touchPoint.y - touchStartRef.current.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const duration = touchPoint.timestamp - touchStartRef.current.timestamp;

    // Check for swipe gestures
    if (distance >= minSwipeDistance && duration < 500) {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (absX > absY) {
        // Horizontal swipe
        if (deltaX > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      } else {
        // Vertical swipe
        if (deltaY > 0) {
          onSwipeDown?.();
        } else {
          onSwipeUp?.();
        }
      }
      return;
    }

    // Check for tap gestures
    if (distance <= maxTapDistance && duration < 500) {
      const now = Date.now();
      
      // Check for double tap
      if (onDoubleTap && lastTapRef.current) {
        const timeSinceLastTap = now - lastTapRef.current.timestamp;
        const distanceFromLastTap = Math.sqrt(
          Math.pow(touchPoint.x - lastTapRef.current.x, 2) +
          Math.pow(touchPoint.y - lastTapRef.current.y, 2)
        );

        if (timeSinceLastTap <= doubleTapDelay && distanceFromLastTap <= maxTapDistance) {
          onDoubleTap();
          lastTapRef.current = null; // Reset to prevent triple tap
          return;
        }
      }

      // Store this tap for potential double tap
      lastTapRef.current = touchPoint;

      // Delay single tap to allow for double tap detection
      if (onTap) {
        setTimeout(() => {
          // Only trigger single tap if no double tap occurred
          if (lastTapRef.current === touchPoint) {
            onTap();
          }
        }, doubleTapDelay);
      }
    }
  }, [
    clearLongPressTimer,
    minSwipeDistance,
    maxTapDistance,
    doubleTapDelay,
    onSwipeUp,
    onSwipeDown,
    onSwipeLeft,
    onSwipeRight,
    onTap,
    onDoubleTap
  ]);

  const attachGestures = useCallback((element: HTMLElement | null) => {
    if (!element) return;

    // Add passive listeners for better performance
    const options = { passive: !preventScroll };
    
    element.addEventListener('touchstart', handleTouchStart, options);
    element.addEventListener('touchmove', handleTouchMove, options);
    element.addEventListener('touchend', handleTouchEnd, options);

    // Return cleanup function
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      clearLongPressTimer();
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, clearLongPressTimer, preventScroll]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearLongPressTimer();
    };
  }, [clearLongPressTimer]);

  return {
    attachGestures,
    clearLongPressTimer
  };
};

export default useTouchGestures;