import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  addDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  increment,
  Timestamp 
} from 'firebase/firestore';
import { Heart, MessageCircle, ArrowLeft, Share, Download, User } from 'lucide-react';
import ThemeToggle from '../../components/common/ui/ThemeToggle';
import LanguageSelector from '../../components/common/forms/LanguageSelector';
import LazyImage from '../../components/common/ui/LazyImage';
import SafeImage from '../../components/common/SafeImage';
import notificationService from '../../services/notificationService';
import { filterChatMessage, getChatViolationMessage, logChatViolation } from '../../utils/content/chatFilter';
import FooterNav from '../../components/layout/FooterNav';
import CommentSection from '../../components/common/comments/CommentSection';
import './StoryDetail.css';

interface Story {
  id: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  timestamp: Timestamp;
  expiresAt?: Timestamp;
  isHighlight: boolean;
  sharingEnabled: boolean;
  likes?: string[];
  likesCount: number;
  viewCount: number;
  thumbnail?: string;
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

export default function StoryDetail() {
  const { storyId } = useParams<{ storyId: string }>();
  const navigate = useNavigate();
  const { currentUser, isGuest } = useAuth();
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [likesCount, setLikesCount] = useState<number>(0);
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [newComment, setNewComment] = useState<string>('');
  const [isLiking, setIsLiking] = useState<boolean>(false);
  const [isCommenting, setIsCommenting] = useState<boolean>(false);

  useEffect(() => {
    loadStory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId]);

  const loadStory = async (): Promise<void> => {
    if (!storyId) return;
    
    try {
      setLoading(true);
      setError(null);const storyDoc = await getDoc(doc(db, 'stories', storyId));
      
      if (storyDoc.exists()) {
        const storyData = { id: storyDoc.id, ...storyDoc.data() } as Story;// Check if story has expired (and is not a highlight)
        const now = new Date();
        const expiresAt = storyData.expiresAt?.toDate();
        
        if (expiresAt && now > expiresAt && !storyData.isHighlight) {
          setError('This story has expired');
          return;
        }
        
        setStory(storyData);// Load engagement data
        await loadStoryEngagement(storyData);
        
      } else {
        console.error('❌ Story not found:', storyId);
        setError('Story not found');
      }
    } catch (error) {
      console.error('❌ Error loading story:', error);
      setError('Failed to load story');
    } finally {
      setLoading(false);
    }
  };

  const loadStoryEngagement = async (storyData: Story): Promise<void> => {
    try {
      // Load likes
      setLikesCount(storyData.likesCount || 0);
      if (currentUser) {
        setIsLiked(storyData.likes?.includes(currentUser.uid) || false);
      }

      // Load comments
      const commentsQuery = query(
        collection(db, 'storyComments'),
        where('storyId', '==', storyId)
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
    if (!currentUser || isLiking || !story) return;

    setIsLiking(true);
    
    try {
      const storyRef = doc(db, 'stories', story.id);
      
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

        // Send notification to story owner (unless it's own story)
        if (story.userId !== currentUser.uid) {
          try {await notificationService.sendStoryLikeNotification(
              currentUser.uid,
              currentUser.displayName || 'Someone',
              currentUser.photoURL || '',
              story.userId,
              story.id,
              story
            );
          } catch (notificationError) {
            console.error('Error sending story like notification:', notificationError);
          }
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleCommentSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    const commentText = newComment.trim();
    
    if (!commentText || !currentUser || isCommenting || !story) return;

    setIsCommenting(true);

    // Prevent guests from commenting
    if (isGuest()) {
      setIsCommenting(false);
      if (window.confirm('Please sign up or log in to comment on stories.\n\nWould you like to go to the login page?')) {
        navigate('/login');
      }
      return;
    }

    // Content filtering for comments
    const filterResult = filterChatMessage(commentText);
    
    if (!filterResult.isClean) {
      const violationMessage = getChatViolationMessage(filterResult.violations, (filterResult as any).categories);
      
      // Log the violation
      await logChatViolation(currentUser.uid, commentText, filterResult.violations, 'story_comment');
      
      // Show user-friendly error message
      alert(`You can't post this comment.\n\n${violationMessage}\n\nTip: Share positive sports content, training updates, or encouraging messages!`);
      setIsCommenting(false);
      return;
    }

    try {
      const commentData: Omit<StoryComment, 'id'> = {
        storyId: story.id,
        userId: currentUser.uid,
        userDisplayName: currentUser.displayName || 'Anonymous User',
        userPhotoURL: currentUser.photoURL || '',
        text: commentText,
        timestamp: new Date()
      };

      // Add comment to Firestore
      const docRef = await addDoc(collection(db, 'storyComments'), commentData);
      
      // Update local state
      setComments(prev => [...prev, { id: docRef.id, ...commentData }]);
      setNewComment('');

      // Send notification to story owner (only if commenting on someone else's story)
      if (story.userId && story.userId !== currentUser.uid) {
        try {await notificationService.sendStoryCommentNotification(
            currentUser.uid,
            currentUser.displayName || 'Someone',
            currentUser.photoURL || '',
            story.userId,
            story.id,
            commentText,
            story
          );
        } catch (notificationError) {
          console.error('Error sending story comment notification:', notificationError);
        }
      }

    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment. Please try again.');
    } finally {
      setIsCommenting(false);
    }
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

  const handleShare = async (): Promise<void> => {
    if (!story?.sharingEnabled) {
      alert('Sharing is not enabled for this story');
      return;
    }

    try {
      const shareUrl = `${window.location.origin}/story/${story.id}`;
      
      if (navigator.share) {
        await navigator.share({
          title: `${story.userDisplayName}'s Story`,
          text: story.caption || 'Check out this story on AmaPlayer!',
          url: shareUrl
        });
      } else {
        // Fallback - copy link
        await navigator.clipboard.writeText(shareUrl);
        alert('Story link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing story:', error);
    }
  };

  const handleDownload = (): void => {
    if (!story) return;
    
    const link = document.createElement('a');
    link.href = story.mediaUrl;
    link.download = `amaplayer-story-${story.timestamp?.toDate?.()?.getTime() || Date.now()}.${story.mediaType === 'video' ? 'mp4' : 'jpg'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTimestamp = (timestamp: Timestamp | undefined): string => {
    if (!timestamp?.toDate) return 'now';
    
    const now = new Date();
    const storyTime = timestamp.toDate();
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

  if (loading) {
    return (
      <div className="story-detail">
        <nav className="nav-bar">
          <div className="nav-content">
            <button onClick={() => navigate(-1)} className="back-btn">
              <ArrowLeft size={20} />
              Back
            </button>
            <h1>Story</h1>
            <div className="nav-links">
              <LanguageSelector />
              <ThemeToggle />
            </div>
          </div>
        </nav>
        
        <div className="main-content">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <span>Loading story...</span>
          </div>
        </div>
        
        <FooterNav />
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="story-detail">
        <nav className="nav-bar">
          <div className="nav-content">
            <button onClick={() => navigate(-1)} className="back-btn">
              <ArrowLeft size={20} />
              Back
            </button>
            <h1>Story</h1>
            <div className="nav-links">
              <LanguageSelector />
              <ThemeToggle />
            </div>
          </div>
        </nav>
        
        <div className="main-content">
          <div className="error-container">
            <h2>Story Unavailable</h2>
            <p>{error || 'This story could not be found or has expired.'}</p>
            <button onClick={() => navigate('/home')} className="home-btn">
              Go to Home
            </button>
          </div>
        </div>
        
        <FooterNav />
      </div>
    );
  }

  const isOwnStory = story.userId === currentUser?.uid;

  return (
    <div className="story-detail">
      <nav className="nav-bar">
        <div className="nav-content">
          <button onClick={() => navigate(-1)} className="back-btn">
            <ArrowLeft size={20} />
            Back
          </button>
          <h1>Story</h1>
          <div className="nav-links">
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <div className="main-content story-detail-content">
        <div className="story-detail-container">
          <div className="story">
            {/* Story Header */}
            <div className="story-header">
              <div className="story-user-info">
                <div className="story-user-avatar">
                  {story.userPhotoURL ? (
                    <LazyImage 
                      src={story.userPhotoURL} 
                      alt={story.userDisplayName}
                      width={40}
                      height={40}
                      style={{ borderRadius: '50%' }}
                    />
                  ) : (
                    <User size={24} />
                  )}
                </div>
                <div className="story-user-details">
                  <h3>{story.userDisplayName}</h3>
                  <span className="story-time">{formatTimestamp(story.timestamp)}</span>
                </div>
              </div>
              
              {/* Action buttons and views */}
              <div className="story-header-actions">
                <div className="story-views">
                  <span className="view-count">{story.viewCount || 0} views</span>
                </div>
                {story.sharingEnabled && (
                  <button className="story-action-btn" onClick={handleShare} title="Share story">
                    <Share size={20} />
                  </button>
                )}
                {isOwnStory && (
                  <button className="story-action-btn" onClick={handleDownload} title="Download story">
                    <Download size={20} />
                  </button>
                )}
              </div>
            </div>
            
            {/* Story Media */}
            <div className="story-media">
              {story.mediaType === 'video' ? (
                <div className="story-video-container">
                  <video 
                    src={story.mediaUrl}
                    poster={story.thumbnail}
                    controls
                    preload="metadata"
                    className="story-video"
                    style={{
                      width: '100%',
                      height: 'auto',
                      maxHeight: '70vh',
                      objectFit: 'contain'
                    }}
                  />
                </div>
              ) : (
                <div className="story-media-container">
                  <LazyImage 
                    src={story.mediaUrl} 
                    alt={story.caption || 'Story content'} 
                    className="story-media-content"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '70vh',
                      width: 'auto',
                      height: 'auto',
                      objectFit: 'contain'
                    }}
                  />
                </div>
              )}
            </div>
            
            {/* Story Actions */}
            <div className="story-actions">
              <button 
                onClick={handleLike}
                className={isLiked ? 'liked' : ''}
                disabled={!currentUser || isLiking}
              >
                <Heart 
                  size={20} 
                  fill={isLiked ? '#e74c3c' : 'none'}
                  color={isLiked ? '#e74c3c' : 'currentColor'}
                  className={isLiked ? 'heart-liked' : ''}
                />
                <span>{likesCount}</span>
                {isLiking && <span style={{marginLeft: '5px'}}>...</span>}
              </button>
              
              <button className="active">
                <MessageCircle size={20} />
                <span>{comments.length}</span>
              </button>
              
              {story.sharingEnabled && (
                <button onClick={handleShare}>
                  <Share size={20} />
                </button>
              )}
            </div>
            
            {/* Story Caption */}
            {story.caption && (
              <div className="story-caption">
                <strong>{story.userDisplayName}</strong> {story.caption}
              </div>
            )}

            {/* Story Stats */}
            {story.isHighlight && (
              <div className="story-stats">
                <div className="highlight-badge">
                  ✨ Saved to Highlights
                </div>
              </div>
            )}

            {/* Comments Section - Using Centralized Real-Time System */}
            <div className="comments-section">
              <CommentSection
                contentId={story.id}
                contentType="story"
                className="story-detail-comments"
              />
            </div>
          </div>
        </div>
      </div>
      
      <FooterNav />
    </div>
  );
}
