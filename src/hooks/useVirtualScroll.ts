import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Virtual scroll data returned by the hook
 */
export interface VirtualScrollData {
  startIndex: number;
  endIndex: number;
  offsetY: number; // Height offset in viewport units (0-100 for 100vh items)
  totalHeight: number; // Total height in viewport units
  isInitialized: boolean;
}

/**
 * Configuration options for virtual scrolling
 */
export interface UseVirtualScrollOptions {
  containerRef: React.RefObject<HTMLDivElement>;
  itemHeight: number; // Height in viewport units (100 = 100vh)
  totalItems: number;
  bufferSize?: number; // Items to render above/below visible area
  throttleMs?: number; // Throttle scroll events (ms)
}

/**
 * Custom hook for virtual scrolling
 *
 * Calculates which items should be rendered based on scroll position
 * Reduces DOM nodes by only rendering visible items + buffer
 *
 * @param options - Configuration options
 * @returns Virtual scroll calculation data
 */
export const useVirtualScroll = ({
  containerRef,
  itemHeight,
  totalItems,
  bufferSize = 1,
  throttleMs = 16 // ~60fps
}: UseVirtualScrollOptions): VirtualScrollData => {
  const [virtualScroll, setVirtualScroll] = useState<VirtualScrollData>({
    startIndex: 0,
    endIndex: Math.min(bufferSize * 2 + 1, totalItems - 1),
    offsetY: 0,
    totalHeight: totalItems * itemHeight,
    isInitialized: false
  });

  const lastScrollPositionRef = useRef(0);
  const throttleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Calculate visible items based on scroll position
  const calculateVirtualScroll = useCallback(() => {
    if (!containerRef.current) return;

    const scrollTop = containerRef.current.scrollTop;
    const containerHeight = containerRef.current.clientHeight;

    // Calculate which items are visible
    // Start: scroll position / item height
    const startIndex = Math.max(0, Math.floor(scrollTop / (itemHeight * window.innerHeight)));

    // How many items fit in viewport + buffer
    const visibleCount = Math.ceil(containerHeight / (itemHeight * window.innerHeight)) + bufferSize * 2;
    const endIndex = Math.min(startIndex + visibleCount, totalItems - 1);

    // Spacer height: how much space above the visible items
    const offsetY = startIndex;

    setVirtualScroll({
      startIndex,
      endIndex,
      offsetY,
      totalHeight: totalItems * itemHeight,
      isInitialized: true
    });

    lastScrollPositionRef.current = scrollTop;
  }, [containerRef, itemHeight, bufferSize, totalItems]);

  // Handle scroll events with throttling
  const handleScroll = useCallback(() => {
    // Clear existing throttle timer
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
    }

    // Check if scroll position has changed significantly
    if (!containerRef.current) return;
    const currentScroll = containerRef.current.scrollTop;

    // Only recalculate if scroll position changed by at least one item
    const minScrollChange = itemHeight * window.innerHeight * 0.5; // Half an item height
    if (Math.abs(currentScroll - lastScrollPositionRef.current) > minScrollChange) {
      calculateVirtualScroll();
    } else {
      // Schedule calculation with throttle
      throttleTimeoutRef.current = setTimeout(() => {
        calculateVirtualScroll();
      }, throttleMs);
    }
  }, [containerRef, itemHeight, calculateVirtualScroll, throttleMs]);

  // Attach scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Initial calculation
    calculateVirtualScroll();

    // Add scroll listener with passive flag for better performance
    container.addEventListener('scroll', handleScroll, { passive: true });

    // Handle window resize
    const handleResize = () => {
      calculateVirtualScroll();
    };
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
    };
  }, [containerRef, calculateVirtualScroll, handleScroll]);

  return virtualScroll;
};
