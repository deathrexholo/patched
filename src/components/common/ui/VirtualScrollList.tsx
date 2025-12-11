import React, { useState, useEffect, useRef, useMemo, ReactNode } from 'react';
import { PerformanceTracker } from '../../../utils/performance/optimization';
import './VirtualScrollList.css';

interface VirtualScrollListProps<T = any> {
  items?: T[];
  itemHeight?: number;
  containerHeight?: number;
  renderItem: (item: T, index: number) => ReactNode;
  overscan?: number;
  onScroll?: (scrollTop: number) => void;
  className?: string;
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadMoreThreshold?: number;
}

const VirtualScrollList = <T,>({
  items = [],
  itemHeight = 200,
  containerHeight = 600,
  renderItem,
  overscan = 5,
  onScroll,
  className = '',
  loading = false,
  hasMore = false,
  onLoadMore,
  loadMoreThreshold = 200
}: VirtualScrollListProps<T>) => {
  const [scrollTop, setScrollTop] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  // Calculate visible items
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  // Get visible items
  const visibleItems = useMemo(() => {
    const result = [];
    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
      if (items[i]) {
        result.push({
          index: i,
          item: items[i],
          style: {
            position: 'absolute',
            top: i * itemHeight,
            left: 0,
            right: 0,
            height: itemHeight
          }
        });
      }
    }
    return result;
  }, [items, visibleRange, itemHeight]);

  // Optimized scroll handler using requestAnimationFrame
  const handleScroll = useMemo(() => {
    let rafId: number;
    return (event: Event) => {
      // Cancel previous animation frame
      if (rafId) {
        cancelAnimationFrame(rafId);
      }

      // Use requestAnimationFrame for smooth updates
      rafId = requestAnimationFrame(() => {
        const target = event.target as HTMLDivElement;
        const newScrollTop = target.scrollTop;

        // Only update if significantly different (reduces re-renders)
        setScrollTop(prev => {
          const diff = Math.abs(prev - newScrollTop);
          return diff > 10 ? newScrollTop : prev;
        });

        if (onScroll) {
          onScroll(newScrollTop);
        }

        // Check if we need to load more
        if (hasMore && onLoadMore && !loading) {
          const scrollHeight = target.scrollHeight;
          const clientHeight = target.clientHeight;
          const scrollBottom = scrollHeight - newScrollTop - clientHeight;

          if (scrollBottom < loadMoreThreshold) {
            onLoadMore();
          }
        }
      });
    };
  }, [onScroll, hasMore, onLoadMore, loading, loadMoreThreshold]);

  // Setup scroll listener
  useEffect(() => {
    const scrollElement = scrollElementRef.current;
    if (!scrollElement) return;

    scrollElement.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      scrollElement.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  // Total height for scrollbar
  const totalHeight = items.length * itemHeight;

  return (
    <div 
      ref={containerRef}
      className={`virtual-scroll-container ${className}`}
      style={{ height: containerHeight }}
    >
      <div
        ref={scrollElementRef}
        className="virtual-scroll-viewport"
        style={{ height: '100%', overflow: 'auto' }}
      >
        <div
          className="virtual-scroll-content"
          style={{ height: totalHeight, position: 'relative' }}
        >
          {visibleItems.map(({ index, item, style }) => (
            <div key={index} style={style} className="virtual-scroll-item">
              {renderItem(item, index)}
            </div>
          ))}
          
          {/* Loading indicator */}
          {loading && (
            <div 
              className="virtual-scroll-loading"
              style={{
                position: 'absolute',
                top: totalHeight,
                left: 0,
                right: 0,
                height: 60,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <div className="loading-spinner">Loading more...</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VirtualScrollList;