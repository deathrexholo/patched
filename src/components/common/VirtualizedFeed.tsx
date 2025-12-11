/**
 * Enhanced Virtualized Feed Component
 * 
 * Built on top of your existing VirtualizedList with additional features:
 * - Infinite loading support
 * - Loading states and skeletons
 * - Better TypeScript support
 * - Compatible with your existing progressive loading system
 */

import React, { memo, useCallback, useState } from 'react';
import { VirtualizedList } from '../../utils/performance/infiniteScroll';

interface VirtualizedFeedProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactElement;
  hasNextPage: boolean;
  isNextPageLoading: boolean;
  loadNextPage: () => Promise<void> | void;
  className?: string;
  overscan?: number;
}

function VirtualizedFeed<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  hasNextPage,
  isNextPageLoading,
  loadNextPage,
  className = '',
  overscan = 5
}: VirtualizedFeedProps<T>) {
  const [isLoading, setIsLoading] = useState(false);

  // Enhanced render function with loading states
  const enhancedRenderItem = useCallback((item: T, index: number) => {
    // If we're at the end and need to load more
    if (index === items.length - 1 && hasNextPage && !isLoading) {
      // Trigger load more when we render the last item
      setTimeout(() => {
        if (!isLoading) {
          setIsLoading(true);
          Promise.resolve(loadNextPage()).finally(() => {
            setIsLoading(false);
          });
        }
      }, 100);
    }

    return (
      <div key={`item-${index}`} className="virtualized-feed-item">
        {renderItem(item, index)}
      </div>
    );
  }, [items.length, hasNextPage, isLoading, loadNextPage, renderItem]);

  // Add loading items to the list if we're loading more
  const itemsWithLoading = React.useMemo(() => {
    if (hasNextPage && (isLoading || isNextPageLoading)) {
      // Add a few loading placeholders
      const loadingItems = Array.from({ length: 3 }, (_, i) => ({
        id: `loading-${i}`,
        isLoading: true
      } as any));
      return [...items, ...loadingItems];
    }
    return items;
  }, [items, hasNextPage, isLoading, isNextPageLoading]);

  // Enhanced render function that handles loading states
  const renderWithLoadingStates = useCallback((item: T | any, index: number) => {
    // Render loading skeleton for loading items
    if (item?.isLoading) {
      return (
        <div key={`loading-${index}`} className="feed-item-loading">
          <div className="loading-skeleton">
            <div className="skeleton-avatar"></div>
            <div className="skeleton-content">
              <div className="skeleton-line"></div>
              <div className="skeleton-line short"></div>
            </div>
          </div>
        </div>
      );
    }

    return enhancedRenderItem(item, index);
  }, [enhancedRenderItem]);

  return (
    <div className={`virtualized-feed-container ${className}`.trim()}>
      {/* Use your existing VirtualizedList component */}
      <VirtualizedList
        items={itemsWithLoading}
        itemHeight={itemHeight}
        containerHeight={containerHeight}
        renderItem={renderWithLoadingStates}
        overscan={overscan}
      />
      
      {/* Loading indicator at the bottom */}
      {(isLoading || isNextPageLoading) && hasNextPage && (
        <div className="virtualized-feed-loading">
          <div className="loading-spinner"></div>
          <span>Loading more items...</span>
        </div>
      )}
      
      {/* End of list indicator */}
      {!hasNextPage && items.length > 0 && (
        <div className="virtualized-feed-end">
          <span>You've reached the end! 🎉</span>
        </div>
      )}
    </div>
  );
}

export default memo(VirtualizedFeed) as <T>(props: VirtualizedFeedProps<T>) => React.ReactElement;