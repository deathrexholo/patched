// Story Viewer - Full-screen story viewing component with navigation
import React, { useState, useEffect, useRef, useCallback, useMemo, FormEvent, ChangeEvent, TouchEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { StoriesService } from '../../services/api/storiesService';
import { X, Share, Heart, MessageCircle, MoreVertical, Download, Volume2, VolumeX, Trash2 } from 'lucide-react';
import StoryProgress from './StoryProgress';
import { db } from '../../lib/firebase';
import { addDoc, collection, query, where, getDocs, deleteDoc, doc, updateDoc, increment, arrayUnion, arrayRemove, Timestamp } from 'firebase/firestore';
import notificationService from '../../services/notificationService';
import CommentSection from '../../components/common/comments/CommentSection';
import SafeImage from '../../components/common/SafeImage';
import { Story } from '../../types/models/story';

interface UserStoriesGroup {
  userId: string;
  userDisplayName: string;
  userPhotoURL: string;
  stories: Story[];
  hasUnviewedStories: boolean;
}

interface StoryComment {
  id: string;
  storyId: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL: string;
  text: string;
  timestamp: Date;
}

interface StoryViewerProps {
  userStories: UserStoriesGroup;
  currentStoryIndex: number;
  onClose: () => void;
  onNavigate: (direction: 'next' | 'prev') => void;
}

export default function StoryViewer({ userStories, currentStoryIndex, onClose, onNavigate }: StoryViewerProps) {
  const { currentUser } = useAuth();
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [storyDuration, setStoryDuration] = useState<number>(0);
  const [showInfo, setShowInfo] = useState<boolean>(false);
  const [showShareMenu, setShowShareMenu] = useState<boolean>(false);
  const [showComments, setShowComments] = useState<boolean>(false);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [likesCount, setLikesCount] = useState<number>(0);
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [newComment, setNewComment] = useState<string>('');
  const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false);
  const [isMediaLoaded, setIsMediaLoaded] = useState<boolean>(false);
  const [isMediaLoading, setIsMediaLoading] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true); // Start muted due to browser autoplay policies
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const currentStory = useMemo(() => userStories.stories[currentStoryIndex], [userStories.stories, currentStoryIndex]);
  const isOwnStory = useMemo(() => currentStory?.userId === currentUser?.uid, [currentStory?.userId, currentUser?.uid]);
  const STORY_DURATION = useMemo(() => currentStory?.mediaType === 'video' ? 20000 : 10000, [currentStory?.mediaType]); // 20s for video, 10s for image

  // Update video muted state when isMuted changes
  useEffect(() => {
    if (videoRef.current && currentStory?.mediaType === 'video') {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted, currentStory?.mediaType]);

  useEffect(() => {
    if (!currentStory) return;

    // Reset loading state for new story
    setIsMediaLoaded(false);
    setIsMediaLoading(true);
    setStoryDuration(0);

    // Record story view
    if (currentUser && !isOwnStory) {
      StoriesService.viewStory(currentStory.id, currentUser.uid);
    }

    // Load likes and comments
    loadStoryEngagement();

    // DON'T start progress here - wait for media to load

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStoryIndex, currentStory, currentUser, isOwnStory]);

  // Start story progress only when media is fully loaded
  useEffect(() => {
    if (isMediaLoaded && !isPaused) {startStoryProgress();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMediaLoaded, isPaused]);

  const loadStoryEngagement = async (): Promise<void> => {
    if (!currentStory) return;

    try {
      // Load likes
      setLikesCount((currentStory as any).likesCount || 0);
      if (currentUser) {
        setIsLiked((currentStory as any).likes?.includes(currentUser.uid) || false);
      }

      // Load comments
      const commentsQuery = query(
        collection(db, 'storyComments'),
        where('storyId', '==', currentStory.id)
      );
      const commentsSnapshot = await getDocs(commentsQuery);
      const storyComments = commentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as StoryComment[];
      setComments(storyComments);
    } catch (error) {
      console.error('Error loading story engagement:', error);
    }
  };

  const handleLike = async (): Promise<void> => {
    if (!currentUser || isOwnStory) return;

    try {
      const storyRef = doc(db, 'stories', currentStory.id);
      
      if (isLiked) {
        // Unlike
        await updateDoc(storyRef, {
          likes: arrayRemove(currentUser.uid),
          likesCount: increment(-1)
        });
        setIsLiked(false);
        setLikesCount(prev => prev - 1);
      } else {
        // Like
        await updateDoc(storyRef, {
          likes: arrayUnion(currentUser.uid),
          likesCount: increment(1)
        });
        setIsLiked(true);
        setLikesCount(prev => prev + 1);

        // Send notification to story owner using notification service
        if (currentStory.userId !== currentUser.uid) {
          try {await notificationService.sendStoryLikeNotification(
              currentUser.uid,
              currentUser.displayName || 'Someone',
              currentUser.photoURL || '',
              currentStory.userId,
              currentStory.id,
              currentStory
            );
          } catch (notificationError) {
            console.error('Error sending story like notification:', notificationError);
          }
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const toggleMute = (): void => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    if (videoRef.current) {
      videoRef.current.muted = newMutedState;}
  };

  const handleDeleteComment = async (commentId: string, commentUserId: string): Promise<void> => {
    if (!currentUser) return;

    // Only allow users to delete their own comments
    if (commentUserId !== currentUser.uid) {
      alert('You can only delete your own comments');
      return;
    }

    try {
      await deleteDoc(doc(db, 'storyComments', commentId));
      
      // Update local state
      setComments(prev => prev.filter(comment => comment.id !== commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleCommentSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!currentUser || !newComment.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    
    try {
      const commentData: Omit<StoryComment, 'id'> = {
        storyId: currentStory.id,
        userId: currentUser.uid,
        userDisplayName: currentUser.displayName || 'Anonymous User',
        userPhotoURL: currentUser.photoURL || '',
        text: newComment.trim(),
        timestamp: new Date()
      };

      await addDoc(collection(db, 'storyComments'), commentData);
      
      // Add to local state
      setComments(prev => [...prev, { id: Date.now().toString(), ...commentData }]);
      setNewComment('');// Send notification to story owner (only if commenting on someone else's story)if (currentStory && currentStory.userId && currentStory.userId !== currentUser.uid) {
        try {console.log('📝 Story notification params:', {
            senderId: currentUser.uid,
            senderName: currentUser.displayName || 'Someone',
            receiverId: currentStory.userId,
            storyId: currentStory.id,
            commentText: newComment.trim()
          });
          
          await notificationService.sendStoryCommentNotification(
            currentUser.uid,
            currentUser.displayName || 'Someone',
            currentUser.photoURL || '',
            currentStory.userId,
            currentStory.id,
            newComment.trim(),
            currentStory
          );} catch (notificationError) {
          console.error('❌ Error sending story comment notification:', notificationError);
        }
      } else {}
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment. Please try again.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const startStoryProgress = useCallback((): void => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }

    if (isPaused || !isMediaLoaded) {return;
    }

    progressInterval.current = setInterval(() => {
      setStoryDuration(prev => {
        if (prev >= STORY_DURATION) {
          if (progressInterval.current) {
            clearInterval(progressInterval.current);
          }
          // Auto-advance to next story
          setTimeout(() => onNavigate('next'), 100);
          return STORY_DURATION;
        }
        return prev + 100;
      });
    }, 100);
  }, [isPaused, isMediaLoaded, STORY_DURATION, onNavigate]);

  useEffect(() => {
    if (isPaused) {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    } else {
      startStoryProgress();
    }

    // ✅ CRITICAL FIX: Always return cleanup function
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [isPaused, startStoryProgress]);

  const handlePauseResume = useCallback((): void => {
    setIsPaused(!isPaused);
  }, [isPaused]);

  const handlePrevious = useCallback((): void => {
    onNavigate('prev');
  }, [onNavigate]);

  const handleNext = useCallback((): void => {
    onNavigate('next');
  }, [onNavigate]);

  // Touch/swipe handlers
  const handleTouchStart = (e: TouchEvent<HTMLDivElement>): void => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: TouchEvent<HTMLDivElement>): void => {
    touchEndX.current = e.changedTouches[0].clientX;
    handleSwipe();
  };

  const handleSwipe = (): void => {
    const swipeThreshold = 50;
    const diff = touchStartX.current - touchEndX.current;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        // Swiped left - next story
        handleNext();
      } else {
        // Swiped right - previous story
        handlePrevious();
      }
    }
  };

  const handleShare = async (): Promise<void> => {
    if (!currentStory.sharingEnabled) {
      alert('Sharing is not enabled for this story');
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${userStories.userDisplayName}'s Story`,
          text: currentStory.caption || 'Check out this story on AmaPlayer!',
          url: currentStory.publicLink
        });
      } else {
        // Fallback - copy link
        await navigator.clipboard.writeText(currentStory.publicLink);
        alert('Story link copied to clipboard!');
      }
      setShowShareMenu(false);
    } catch (error) {
      console.error('Error sharing story:', error);
    }
  };

  const handleDownload = (): void => {
    if (isOwnStory) {
      // Download own story
      const link = document.createElement('a');
      link.href = currentStory.mediaUrl;
      const timestamp = currentStory.timestamp;
      const time = timestamp && typeof timestamp === 'object' && 'toDate' in timestamp 
        ? timestamp.toDate().getTime() 
        : Date.now();
      link.download = `story-${time}.${currentStory.mediaType === 'video' ? 'mp4' : 'jpg'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDeleteStory = async (): Promise<void> => {
    if (!isOwnStory || !currentStory || !currentUser) return;

    try {
      setIsDeleting(true);// Delete the story using StoriesService
      await StoriesService.deleteStory(currentStory.id, currentUser.uid);setShowDeleteConfirm(false);
      
      // Close the story viewer after deletion
      onClose();
    } catch (error) {
      console.error('❌ Error deleting story:', error);
      alert('Failed to delete story. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatTimestamp = (timestamp: Timestamp | Date | string | undefined): string => {
    if (!timestamp) return 'now';
    
    let storyTime: Date;
    if (timestamp instanceof Date) {
      storyTime = timestamp;
    } else if (typeof timestamp === 'object' && 'toDate' in timestamp) {
      storyTime = timestamp.toDate();
    } else {
      return 'now';
    }
    
    const now = new Date();
    const diffMs = now.getTime() - storyTime.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else if (diffMins > 0) {
      return `${diffMins}m ago`;
    } else {
      return 'now';
    }
  };

  if (!currentStory) {
    return null;
  }

  return (
    <div className="story-viewer">
      <div className="story-viewer-backdrop" onClick={onClose}></div>
      
      <div 
        className="story-viewer-container"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Progress Bars */}
        <StoryProgress
          stories={userStories.stories}
          currentIndex={currentStoryIndex}
          currentDuration={storyDuration}
          totalDuration={STORY_DURATION}
        />

        {/* Header */}
        <div className="story-viewer-header">
          <div className="story-user-info">
            <SafeImage 
              src={userStories.userPhotoURL || ''} 
              alt={userStories.userDisplayName}
              placeholder="avatar"
              className="story-user-avatar"
            />
            <div className="story-user-details">
              <span className="story-user-name">{userStories.userDisplayName}</span>
              <span className="story-timestamp">{formatTimestamp(currentStory.timestamp)}</span>
            </div>
          </div>

          <div className="story-header-actions">
            {isOwnStory && (
              <>
                <button 
                  className="story-action-btn story-delete-btn" 
                  onClick={() => setShowDeleteConfirm(true)}
                  title="Delete story"
                >
                  <Trash2 size={20} />
                </button>
                <button className="story-action-btn" onClick={() => setShowInfo(!showInfo)}>
                  <MoreVertical size={20} />
                </button>
              </>
            )}
            <button className="story-action-btn" onClick={onClose}>
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Story Content */}
        <div className="story-content" onClick={handlePauseResume}>
          {currentStory.mediaType === 'image' ? (
            <img 
              src={currentStory.mediaUrl} 
              alt="Story content"
              className="story-media"
              onLoad={() => {setIsMediaLoaded(true);
                setIsMediaLoading(false);
              }}
              onError={() => {setIsMediaLoading(false);
                setIsMediaLoaded(false);
              }}
            />
          ) : (
            <video 
              ref={videoRef}
              src={currentStory.mediaUrl}
              className="story-media"
              autoPlay
              muted={isMuted}
              loop={false}
              playsInline
              onEnded={handleNext}
              onLoadedData={() => {setIsMediaLoaded(true);
                setIsMediaLoading(false);
                // Ensure volume settings are applied
                if (videoRef.current) {
                  videoRef.current.muted = isMuted;
                  videoRef.current.volume = 1.0; // Full volume when unmuted
                }
              }}
              onError={() => {setIsMediaLoading(false);
                setIsMediaLoaded(false);
              }}
            />
          )}

          {/* Navigation Areas */}
          <div className="story-nav-area story-nav-prev" onClick={handlePrevious}></div>
          <div className="story-nav-area story-nav-next" onClick={handleNext}></div>

          {/* Loading Indicator */}
          {isMediaLoading && (
            <div className="story-loading-indicator">
              <div className="loading-spinner"></div>
              <p>Loading story...</p>
            </div>
          )}

          {/* Pause Indicator */}
          {isPaused && !isMediaLoading && (
            <div className="story-pause-indicator">
              <div className="pause-icon">❚❚</div>
            </div>
          )}
        </div>

        {/* Caption */}
        {currentStory.caption && (
          <div className="story-caption">
            <p>{currentStory.caption}</p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="story-viewer-footer">
          <div className="story-actions">
            {!isOwnStory && (
              <>
                <button 
                  className={`story-action-btn ${isLiked ? 'liked' : ''}`}
                  onClick={handleLike}
                >
                  <Heart size={24} fill={isLiked ? '#ff3040' : 'none'} />
                  {likesCount > 0 && <span className="action-count">{likesCount}</span>}
                </button>
                <button 
                  className="story-action-btn"
                  onClick={() => {
                    const newShowComments = !showComments;
                    setShowComments(newShowComments);
                    // Pause story when opening comments, resume when closing
                    setIsPaused(newShowComments);
                  }}
                >
                  <MessageCircle size={24} />
                  {comments.length > 0 && <span className="action-count">{comments.length}</span>}
                </button>
              </>
            )}
            
            {/* Mute/Unmute button for videos */}
            {currentStory?.mediaType === 'video' && (
              <button 
                className="story-action-btn"
                onClick={toggleMute}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
              </button>
            )}
            
            {currentStory.sharingEnabled && (
              <button 
                className="story-action-btn"
                onClick={() => setShowShareMenu(!showShareMenu)}
              >
                <Share size={24} />
              </button>
            )}

            {isOwnStory && (
              <button className="story-action-btn" onClick={handleDownload}>
                <Download size={24} />
              </button>
            )}
          </div>

          {/* Story Info (Own Stories) */}
          {showInfo && isOwnStory && (
            <div className="story-info-panel">
              <div className="story-stats">
                <div className="stat-item">
                  <span className="stat-value">{currentStory.viewCount || 0}</span>
                  <span className="stat-label">Views</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{userStories.stories.length}</span>
                  <span className="stat-label">Stories</span>
                </div>
              </div>
              
              {currentStory.viewers?.length > 0 && (
                <div className="story-viewers">
                  <h4>Viewed by:</h4>
                  <div className="viewers-list">
                    {currentStory.viewers.slice(0, 10).map(viewerId => (
                      <div key={viewerId} className="viewer-item">
                        👁️ {viewerId}
                      </div>
                    ))}
                    {currentStory.viewers.length > 10 && (
                      <div className="viewers-more">
                        +{currentStory.viewers.length - 10} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Share Menu */}
          {showShareMenu && (
            <div className="story-share-menu">
              <button className="share-option" onClick={handleShare}>
                <Share size={16} />
                Share Link
              </button>
              <button className="share-option" onClick={() => alert('Coming soon!')}>
                📱 Share to Social
              </button>
              <button className="share-option" onClick={() => alert('Coming soon!')}>
                💾 Save to Highlights
              </button>
            </div>
          )}
        </div>

        {/* Comments Modal - Using Centralized Real-Time System */}
        {showComments && currentStory && (
          <div className="story-comments-modal">
            <div className="comments-header">
              <h4>Comments</h4>
              <button
                className="close-comments-btn"
                onClick={() => {
                  setShowComments(false);
                  // Resume story when closing comments
                  setIsPaused(false);
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="comments-list">
              <CommentSection
                contentId={currentStory.id}
                contentType="story"
                className="story-comments"
              />
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="story-delete-modal">
            <div className="delete-modal-content">
              <h3>Delete Story?</h3>
              <p>This story will be permanently deleted and cannot be recovered.</p>
              <div className="delete-modal-actions">
                <button 
                  className="delete-cancel-btn"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button 
                  className="delete-confirm-btn"
                  onClick={handleDeleteStory}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
