// Advanced feed page with infinite scroll and performance optimizations
import React, { memo, useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useInfiniteScroll } from '../../utils/performance/infiniteScroll';
import { useDebounce } from '../../utils/performance/optimization';
import { usePostInteractions } from '../../hooks/usePostInteractions';
import { useRealtimeEngagementBatch } from '../../hooks/useRealtimeEngagement';
import { useToast } from '../../hooks/useToast';
import FeedCard, { TalentCard, ProfileCard } from '../../components/common/feed/FeedCard';
import ToastContainer from '../../components/common/ui/ToastContainer';
import { LoadingFallback } from '../../utils/performance/lazyLoading';
import { RefreshCw, Filter, Search, Plus, CheckCircle, AlertCircle } from 'lucide-react';
import { User } from '../../types/models/user';
import './FeedPage.css';

// Lazy-loaded components for better performance
const ProfileDetailModal = lazy(() => import('../../features/profile/components/ProfileDetailModal'));
const CommentModal = lazy(() => import('../../components/common/modals/CommentModal'));
const ShareModal = lazy(() => import('../../components/common/modals/ShareModal'));
const FilterModal = lazy(() => import('../../components/common/modals/FilterModal'));

// Feed item types
type FeedItemType = 'image' | 'video' | 'talent' | 'profile';

interface BaseFeedItem {
  id: string;
  type: FeedItemType;
  userId: string;
  userDisplayName: string;
  userPhotoURL: string;
  caption: string;
  mediaUrl: string;
  thumbnailUrl?: string | null;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked: boolean;
  createdAt: Date;
  shareState?: any;
  hasShared?: boolean;
  shareRateLimit?: any;
}

interface VideoFeedItem extends BaseFeedItem {
  type: 'video';
  views: number;
}

interface TalentFeedItem extends BaseFeedItem {
  type: 'talent';
  rating: number;
  category: string;
}

interface ProfileFeedItem extends BaseFeedItem {
  type: 'profile';
  followersCount: number;
  postsCount: number;
  isFollowing: boolean;
  bio: string;
}

type FeedItem = BaseFeedItem | VideoFeedItem | TalentFeedItem | ProfileFeedItem;

interface FeedFilters {
  [key: string]: any;
}

interface ShareNotification {
  type: 'success' | 'error';
  message: string;
  timestamp: number;
}

interface ShareData {
  type: string;
  [key: string]: any;
}

// Mock API functions (replace with real API calls)
const feedAPI = {
  fetchFeedItems: async (page: number, pageSize: number, filters: FeedFilters = {}): Promise<FeedItem[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Mock data generation
    const items: FeedItem[] = Array.from({ length: pageSize }, (_, index) => {
      const id = (page - 1) * pageSize + index;
      const types: FeedItemType[] = ['image', 'video', 'talent', 'profile'];
      const type = types[Math.floor(Math.random() * types.length)];
      
      const baseItem: BaseFeedItem = {
        id: `item-${id}`,
        type,
        userId: `user-${Math.floor(Math.random() * 100)}`,
        userDisplayName: `User ${Math.floor(Math.random() * 100)}`,
        userPhotoURL: `/assets/placeholders/default-avatar.svg`,
        caption: `This is a sample ${type} post #${id}`,
        mediaUrl: type === 'video' 
          ? `https://sample-videos.com/zip/10/mp4/SampleVideo_${Math.random() > 0.5 ? '720x480' : '1280x720'}_1mb.mp4`
          : `/assets/placeholders/default-post.svg`,
        thumbnailUrl: type === 'video' ? `/assets/placeholders/default-post.svg` : null,
        likesCount: Math.floor(Math.random() * 1000),
        commentsCount: Math.floor(Math.random() * 100),
        sharesCount: Math.floor(Math.random() * 50),
        isLiked: Math.random() > 0.7,
        createdAt: new Date(Date.now() - Math.random() * 86400000 * 7), // Within last week
      };

      if (type === 'video') {
        return {
          ...baseItem,
          type: 'video',
          views: Math.floor(Math.random() * 10000)
        } as VideoFeedItem;
      } else if (type === 'talent') {
        return {
          ...baseItem,
          type: 'talent',
          rating: Math.round((Math.random() * 2 + 3) * 10) / 10,
          category: ['Sports', 'Music', 'Dance', 'Art'][Math.floor(Math.random() * 4)]
        } as TalentFeedItem;
      } else if (type === 'profile') {
        return {
          ...baseItem,
          type: 'profile',
          followersCount: Math.floor(Math.random() * 10000),
          postsCount: Math.floor(Math.random() * 500),
          isFollowing: Math.random() > 0.5,
          bio: 'This is a sample bio for the profile card.'
        } as ProfileFeedItem;
      }
      
      return baseItem;
    });
    
    return items;
  },
  
  likePost: async (postId: string, liked: boolean): Promise<{ success: boolean; liked: boolean }> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return { success: true, liked };
  },
  
  followUser: async (userId: string, following: boolean): Promise<{ success: boolean; following: boolean }> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true, following };
  }
};

const FeedPage = memo(() => {
  const { currentUser } = useAuth();
  const { toasts, showToast, dismissToast } = useToast();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filters, setFilters] = useState<FeedFilters>({});
  const [activeModal, setActiveModal] = useState<'profile' | 'comment' | 'share' | 'filter' | null>(null);
  const [selectedItem, setSelectedItem] = useState<FeedItem | { userId: string } | null>(null);
  const [shareNotification, setShareNotification] = useState<ShareNotification | null>(null);
  const [loadingStates, setLoadingStates] = useState<{
    likes: Set<string>;
    comments: Set<string>;
  }>({
    likes: new Set(),
    comments: new Set()
  });
  const [scrollPosition, setScrollPosition] = useState<number>(0);
  
  const debouncedSearch = useDebounce(searchQuery, 500);
  
  // Initialize post interactions hook for sharing functionality
  const {
    sharePost,
    getShareState,
    clearShareState,
    updateShareCount,
    getShareRateLimit,
    hasUserSharedPost
  } = usePostInteractions();

  // Infinite scroll implementation
  const {
    items,
    loading,
    error,
    hasMore,
    refresh,
    retry,
    containerRef
  } = useInfiniteScroll({
    fetchMore: useCallback(async (page: number, pageSize: number) => {
      return await feedAPI.fetchFeedItems(page, pageSize, {
        search: debouncedSearch,
        ...filters
      });
    }, [debouncedSearch, filters]),
    pageSize: 10,
    hasMore: true
  });

  // Real-time engagement tracking for all posts in the feed
  // This listens to Firestore for updates to engagement counts (likes, comments, shares)
  const postIds = useMemo(() => items.map(item => item.id), [items]);
  const { engagement } = useRealtimeEngagementBatch('posts', postIds);

  // Memoized filtered items with real-time engagement data
  const itemsWithEngagement = useMemo(() => {
    return items.map(item => {
      const realtimeData = engagement[item.id];
      if (realtimeData) {
        return {
          ...item,
          likesCount: realtimeData.likesCount ?? item.likesCount,
          commentsCount: realtimeData.commentsCount ?? item.commentsCount,
          sharesCount: realtimeData.sharesCount ?? item.sharesCount
        };
      }
      return item;
    });
  }, [items, engagement]);

  const filteredItems = useMemo(() => {
    if (!debouncedSearch) return itemsWithEngagement;

    return itemsWithEngagement.filter(item =>
      item.caption?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      item.userDisplayName?.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [itemsWithEngagement, debouncedSearch]);

  // Save scroll position before modal interactions
  const saveScrollPosition = useCallback(() => {
    if (containerRef.current) {
      setScrollPosition(containerRef.current.scrollTop);
    } else {
      // Fallback to window scroll position
      setScrollPosition(window.scrollY);
    }
  }, [containerRef]);

  // Restore scroll position after modal interactions
  const restoreScrollPosition = useCallback(() => {
    if (containerRef.current && scrollPosition > 0) {
      containerRef.current.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
      });
    } else if (scrollPosition > 0) {
      // Fallback to window scroll position with smooth scrolling
      window.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
      });
    }
  }, [containerRef, scrollPosition]);

  // Event handlers
  const handleLike = useCallback(async (itemId: string, liked: boolean) => {
    // Set loading state
    setLoadingStates(prev => ({
      ...prev,
      likes: new Set([...prev.likes, itemId])
    }));

    try {
      await feedAPI.likePost(itemId, liked);
    } catch (error) {
      console.error('Error liking post:', error);
      throw error;
    } finally {
      // Clear loading state
      setLoadingStates(prev => ({
        ...prev,
        likes: new Set([...prev.likes].filter(id => id !== itemId))
      }));
    }
  }, []);

  const handleComment = useCallback((itemId: string) => {
    // Save scroll position before opening modal
    saveScrollPosition();
    
    // Set loading state
    setLoadingStates(prev => ({
      ...prev,
      comments: new Set([...prev.comments, itemId])
    }));

    setSelectedItem(items.find(item => item.id === itemId) || null);
    setActiveModal('comment');

    // Clear loading state after modal opens
    setTimeout(() => {
      setLoadingStates(prev => ({
        ...prev,
        comments: new Set([...prev.comments].filter(id => id !== itemId))
      }));
    }, 100);
  }, [items, saveScrollPosition]);

  const handleCommentAdded = useCallback((itemId: string) => {}, []);

  const handleShare = useCallback((itemId: string) => {
    // Save scroll position before opening modal
    saveScrollPosition();
    
    setSelectedItem(items.find(item => item.id === itemId) || null);
    setActiveModal('share');
  }, [items, saveScrollPosition]);

  // Handle share completion with success/error feedback
  const handleShareComplete = useCallback(async (shareData: ShareData) => {
    if (!currentUser || !selectedItem || !('id' in selectedItem)) return;

    try {
      // Execute the share using the post interactions hook
      const result = await sharePost(selectedItem.id, shareData.type as 'friends' | 'feeds' | 'groups', shareData.targets);
      
      // Update local share count optimistically
      updateShareCount(selectedItem.id, 1);
      
      // Show success notification
      setShareNotification({
        type: 'success',
        message: `Successfully shared to ${shareData.type}!`,
        timestamp: Date.now()
      });
      
      // Clear notification after 3 seconds
      setTimeout(() => {
        setShareNotification(null);
        clearShareState(selectedItem.id);
      }, 3000);
      
      // Close modal
      setActiveModal(null);
      setSelectedItem(null);
      
      return result;
    } catch (error) {
      console.error('Share failed:', error);
      
      // Show error notification
      setShareNotification({
        type: 'error',
        message: (error as Error).message || 'Failed to share post. Please try again.',
        timestamp: Date.now()
      });
      
      // Clear error notification after 5 seconds
      setTimeout(() => {
        setShareNotification(null);
        if ('id' in selectedItem) {
          clearShareState(selectedItem.id);
        }
      }, 5000);
      
      throw error;
    }
  }, [currentUser, selectedItem, sharePost, updateShareCount, clearShareState]);

  const handleUserClick = useCallback((userId: string) => {
    setSelectedItem({ userId });
    setActiveModal('profile');
  }, []);

  const handleFollow = useCallback(async (userId: string, following: boolean) => {
    try {
      await feedAPI.followUser(userId, following);
    } catch (error) {
      console.error('Error following user:', error);
      throw error;
    }
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setSelectedItem(null);

    // Restore scroll position after modal animation completes (300ms + 50ms buffer)
    setTimeout(() => {
      restoreScrollPosition();
    }, 350);
  }, [restoreScrollPosition]);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleRefresh = useCallback(() => {
    setSearchQuery('');
    setFilters({});
    refresh();
  }, [refresh]);

  const openFilters = useCallback(() => {
    setActiveModal('filter');
  }, []);

  const applyFilters = useCallback((newFilters: FeedFilters) => {
    setFilters(newFilters);
    refresh();
    closeModal();
  }, [refresh, closeModal]);

  // Render different card types
  const renderFeedCard = useCallback((item: FeedItem) => {
    // Get share state for this item
    const shareState = getShareState(item.id);
    const hasShared = hasUserSharedPost(item.id, currentUser?.uid);
    const rateLimitInfo = getShareRateLimit(currentUser?.uid);
    
    const commonProps = {
      key: item.id,
      item: {
        ...item,
        // Add share state information to item
        shareState,
        hasShared,
        shareRateLimit: rateLimitInfo
      },
      currentUserId: currentUser?.uid,
      onLike: handleLike,
      onComment: handleComment,
      onShare: handleShare,
      onUserClick: handleUserClick,
      onCommentAdded: handleCommentAdded,
      // Pass loading states
      isLikeLoading: loadingStates.likes.has(item.id),
      isCommentLoading: loadingStates.comments.has(item.id)
    };

    switch (item.type) {
      case 'profile':
        return (
          <ProfileCard
            {...commonProps}
            profile={{
              id: item.id,
              photoURL: item.userPhotoURL,
              displayName: item.userDisplayName,
              bio: (item as ProfileFeedItem).bio,
              followersCount: (item as ProfileFeedItem).followersCount,
              postsCount: (item as ProfileFeedItem).postsCount,
              isFollowing: (item as ProfileFeedItem).isFollowing
            }}
            onFollow={handleFollow}
          />
        );
      case 'talent':
        return <FeedCard {...commonProps} />;
      default:
        return <FeedCard {...commonProps} />;
    }
  }, [currentUser, handleLike, handleComment, handleShare, handleUserClick, handleFollow, getShareState, hasUserSharedPost, getShareRateLimit, loadingStates]);

  return (
    <div className="feed-page">
      {/* Toast Container */}
      <ToastContainer 
        toasts={toasts} 
        position="top-right"
      />
      
      {/* Header */}
      <div className="feed-header">
        <div className="feed-title">
          <h1>AmaPlayer Feed</h1>
          <button className="refresh-btn" onClick={handleRefresh} disabled={loading}>
            <RefreshCw size={20} className={loading ? 'spinning' : ''} />
          </button>
        </div>
        
        {/* Search and Filters */}
        <div className="feed-controls">
          <div className="search-container">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search posts, users, talents..."
              value={searchQuery}
              onChange={handleSearch}
              className="search-input"
            />
          </div>
          
          <button className="filter-btn" onClick={openFilters}>
            <Filter size={20} />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Share Notification */}
      {shareNotification && (
        <div className={`share-notification ${shareNotification.type}`}>
          <div className="notification-content">
            {shareNotification.type === 'success' ? (
              <CheckCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <span>{shareNotification.message}</span>
          </div>
        </div>
      )}

      {/* Feed Content */}
      <div className="feed-content" ref={containerRef}>
        {error && (
          <div className="error-state">
            <p>Failed to load feed content</p>
            <button onClick={retry} className="retry-btn">
              Try Again
            </button>
          </div>
        )}

        {!error && filteredItems.length === 0 && !loading && (
          <div className="empty-state">
            <div className="empty-icon">
              <Plus size={48} />
            </div>
            <h3>No Content Yet</h3>
            <p>Start following users or create your first post to see content here!</p>
          </div>
        )}

        {/* Feed Items */}
        <div className="feed-list">
          {filteredItems.map(renderFeedCard)}
          
          {/* Loading Trigger for Infinite Scroll */}
          {hasMore && (
            <div className="loading-trigger">
              {loading && (
                <div className="loading-more">
                  <div className="loading-spinner" />
                  <p>Loading more content...</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lazy-loaded Modals */}
      <Suspense fallback={<LoadingFallback />}>
        {activeModal === 'profile' && selectedItem && 'userId' in selectedItem && (
          <ProfileDetailModal
            userId={selectedItem.userId}
            onClose={closeModal}
          />
        )}
        
        {activeModal === 'comment' && selectedItem && 'id' in selectedItem && (
          <CommentModal
            post={selectedItem as any}
            onClose={closeModal}
            onCommentAdded={(comment) => {
              // Update the comment count in the feed item
              handleCommentAdded(selectedItem.id);
            }}
          />
        )}
        
        {activeModal === 'share' && selectedItem && 'id' in selectedItem && (
          <ShareModal
            post={selectedItem as any}
            currentUser={currentUser}
            onClose={closeModal}
            onShareComplete={handleShareComplete}
          />
        )}
        
        {activeModal === 'filter' && (
          <FilterModal
            currentFilters={filters}
            onApply={applyFilters}
            onClose={closeModal}
          />
        )}
      </Suspense>
    </div>
  );
});

export default FeedPage;
