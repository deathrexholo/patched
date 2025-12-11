/**
 * Smart Feed Component
 * Automatically chooses between progressive loading and virtualization
 * based on data size and performance requirements
 */

import React, { memo, useMemo } from 'react';
import { Post as PostType } from '../../types/models';
import { User } from 'firebase/auth';

// Import existing components
import PostsFeed from '../../pages/home/components/PostsFeed';
import VirtualizedFeed from './VirtualizedFeed';

interface SmartFeedProps {
  posts?: PostType[];
  loading?: boolean;
  hasMore?: boolean;
  error?: string | null;
  currentUser?: User | null;
  isGuest?: boolean;
  onLoadMore?: () => void;
  onRefresh?: () => void;
  onLike?: (postId: string, likes: string[], isSample: boolean, post: PostType) => void;
  onEditPost?: (postId: string, newCaption: string) => void;
  onSharePost?: (postId: string, post: PostType) => void;
  onDeletePost?: (postId: string, post: PostType) => void;
  onCommentSubmit?: (postId: string, commentText: string) => void;
  onDeleteComment?: (postId: string, index: number) => void;
  onEditComment?: (postId: string, index: number, newText: string) => void;
  onLikeComment?: (postId: string, index: number) => void;
  onUserClick?: (userId: string) => void;
  
  // Smart feed specific props
  forceVirtualization?: boolean;
  virtualizationThreshold?: number;
  itemHeight?: number;
  containerHeight?: number;
}

/**
 * Smart Feed Decision Logic:
 * 
 * 1. Small datasets (< 50 posts): Use progressive loading (better UX)
 * 2. Medium datasets (50-200 posts): Use progressive loading (good balance)
 * 3. Large datasets (200+ posts): Use virtualization (better performance)
 * 4. Force virtualization: Always use virtualization if specified
 */
const SmartFeed: React.FC<SmartFeedProps> = memo(({
  posts = [],
  forceVirtualization = false,
  virtualizationThreshold = 200,
  itemHeight = 400,
  containerHeight = 600,
  ...feedProps
}) => {
  // Decision logic for which component to use
  const feedStrategy = useMemo(() => {
    const postCount = posts.length;
    
    // Force virtualization if requested
    if (forceVirtualization) {
      return 'virtualized';
    }
    
    // Use virtualization for large datasets
    if (postCount >= virtualizationThreshold) {
      return 'virtualized';
    }
    
    // Use progressive loading for smaller datasets
    return 'progressive';
  }, [posts.length, forceVirtualization, virtualizationThreshold]);

  // Performance metrics for development
  if (process.env.NODE_ENV === 'development') {}

  // Render progressive loading feed (your existing optimized component)
  if (feedStrategy === 'progressive') {
    return (
      <PostsFeed
        {...feedProps}
        posts={posts}
      />
    );
  }

  // Render virtualized feed for large datasets
  const renderVirtualizedPost = (post: PostType, index: number) => {
    if (!post) return null;

    return (
      <div className="virtualized-post-item">
        {/* This would use your existing Post component */}
        <div className="post-placeholder">
          <h4>{post.caption || 'Post content'}</h4>
          <p>Post ID: {post.id}</p>
          <p>Index: {index}</p>
          {/* Add your full Post component here */}
        </div>
      </div>
    );
  };

  const handleVirtualizedLoadMore = async () => {
    if (feedProps.onLoadMore) {
      feedProps.onLoadMore();
    }
  };

  return (
    <div className="smart-feed-container">
      {process.env.NODE_ENV === 'development' && (
        <div className="feed-strategy-indicator">
          <small style={{ 
            color: 'var(--text-secondary)', 
            fontSize: '11px',
            padding: '4px 8px',
            background: 'var(--bg-secondary)',
            borderRadius: '4px',
            margin: '4px 0'
          }}>
            🚀 Virtualized mode: {posts.length} posts
          </small>
        </div>
      )}
      
      <VirtualizedFeed
        items={posts}
        itemHeight={itemHeight}
        containerHeight={containerHeight}
        renderItem={renderVirtualizedPost}
        hasNextPage={feedProps.hasMore || false}
        isNextPageLoading={feedProps.loading || false}
        loadNextPage={handleVirtualizedLoadMore}
        className="smart-feed-virtualized"
      />
    </div>
  );
});

SmartFeed.displayName = 'SmartFeed';

export default SmartFeed;