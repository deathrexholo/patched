// Advanced infinite scroll with performance optimization
import { useState, useEffect, useCallback, useRef } from 'react';
import { useDebounce } from './optimization';

// Custom hook for infinite scroll with performance optimizations
export const useInfiniteScroll = ({
  fetchMore,
  hasMore = true,
  threshold = 0.8,
  initialItems = [],
  pageSize = 20,
  loadingDelay = 300
}) => {
  const [items, setItems] = useState(initialItems);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMoreItems, setHasMoreItems] = useState(hasMore);
  const [page, setPage] = useState(1);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<boolean>(false);
  
  // Debounce loading to prevent rapid requests
  const debouncedLoading = useDebounce(loading, loadingDelay);

  // Load more items function
  const loadMoreItems = useCallback(async () => {
    if (loadingRef.current || !hasMoreItems) return;
    
    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);

      const newItems = await fetchMore(page, pageSize);
      
      if (newItems && newItems.length > 0) {
        setItems(prevItems => {
          // Prevent duplicates by checking IDs
          const existingIds = new Set(prevItems.map(item => item.id));
          const uniqueNewItems = newItems.filter(item => !existingIds.has(item.id));
          return [...prevItems, ...uniqueNewItems];
        });
        setPage(prevPage => prevPage + 1);
        
        // Check if we have more items
        if (newItems.length < pageSize) {
          setHasMoreItems(false);
        }
      } else {
        setHasMoreItems(false);
      }
    } catch (err) {
      console.error('Error loading more items:', err);
      setError(err.message || 'Failed to load more content');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [fetchMore, page, pageSize, hasMoreItems]);

  // Intersection Observer for scroll detection
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !loadingRef.current && hasMoreItems) {
          loadMoreItems();
        }
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0.1
      }
    );

    const loadingTrigger = containerRef.current?.querySelector('.loading-trigger');
    if (loadingTrigger) {
      observer.observe(loadingTrigger);
    }

    return () => {
      if (loadingTrigger) {
        observer.unobserve(loadingTrigger);
      }
    };
  }, [loadMoreItems, hasMoreItems]);

  // Refresh function to reset the feed
  const refresh = useCallback(async () => {
    setItems([]);
    setPage(1);
    setHasMoreItems(true);
    setError(null);
    loadingRef.current = false;
    await loadMoreItems();
  }, []);

  // Retry function for error recovery
  const retry = useCallback(() => {
    setError(null);
    loadMoreItems();
  }, [loadMoreItems]);

  return {
    items,
    loading: debouncedLoading,
    error,
    hasMore: hasMoreItems,
    loadMore: loadMoreItems,
    refresh,
    retry,
    containerRef
  };
};

// Intersection Observer hook for lazy loading individual items
export const useInViewport = (options = {}) => {
  const [inViewport, setInViewport] = useState(false);
  const [hasBeenInViewport, setHasBeenInViewport] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!elementRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isIntersecting = entry.isIntersecting;
        setInViewport(isIntersecting);
        
        if (isIntersecting && !hasBeenInViewport) {
          setHasBeenInViewport(true);
        }
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
        ...options
      }
    );

    observer.observe(elementRef.current);

    return () => {
      if (elementRef.current) {
        observer.unobserve(elementRef.current);
      }
    };
  }, [hasBeenInViewport, options]);

  return {
    elementRef,
    inViewport,
    hasBeenInViewport
  };
};

// Virtual list component for extremely large datasets
export const VirtualizedList = ({ 
  items, 
  itemHeight, 
  containerHeight = 600,
  renderItem,
  overscan = 5 
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + overscan,
    items.length
  );

  const visibleItems = items.slice(startIndex, endIndex);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        height: containerHeight,
        overflowY: 'auto',
        position: 'relative'
      }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map((item, index) => (
            <div key={item.id || startIndex + index} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};