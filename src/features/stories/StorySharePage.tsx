import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ArrowLeft, Download, User } from 'lucide-react';
import './Stories.css';

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
  viewCount: number;
  thumbnail?: string;
}

export default function StorySharePage() {
  const { storyId } = useParams<{ storyId: string }>();
  const navigate = useNavigate();
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStory = async () => {
      try {
        if (!storyId) {
          setError('Story ID is missing');
          return;
        }const storyRef = doc(db, 'stories', storyId);
        const storyDoc = await getDoc(storyRef);

        if (!storyDoc.exists()) {
          setError('Story not found');
          return;
        }

        const storyData = storyDoc.data() as Omit<Story, 'id'>;
        
        // Check if story has expired
        const now = new Date();
        const expiresAt = storyData.expiresAt?.toDate();
        
        if (expiresAt && now > expiresAt && !storyData.isHighlight) {
          setError('This story has expired');
          return;
        }

        // Check if sharing is enabled
        if (!storyData.sharingEnabled) {
          setError('This story is not available for sharing');
          return;
        }

        setStory({ id: storyDoc.id, ...storyData });
        
      } catch (error) {
        console.error('❌ Error fetching story:', error);
        setError('Failed to load story');
      } finally {
        setLoading(false);
      }
    };

    fetchStory();
  }, [storyId]);

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
    if (!timestamp?.toDate) return 'recently';
    
    const storyTime = timestamp.toDate();
    return storyTime.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="story-share-page">
        <div className="story-share-loading">
          <div className="loading-spinner"></div>
          <p>Loading story...</p>
        </div>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="story-share-page">
        <div className="story-share-error">
          <div className="error-content">
            <h2>Story Unavailable</h2>
            <p>{error || 'This story could not be found'}</p>
            <button className="home-btn" onClick={() => navigate('/')}>
              <ArrowLeft size={16} />
              Go to AmaPlayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="story-share-page">
      {/* Header */}
      <div className="story-share-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={20} />
        </button>
        <div className="story-share-title">
          <h1>AmaPlayer Story</h1>
        </div>
        <button className="download-btn" onClick={handleDownload}>
          <Download size={20} />
        </button>
      </div>

      {/* Story Content */}
      <div className="story-share-content">
        <div className="shared-story">
          {/* User Info */}
          <div className="story-user-header">
            <div className="user-avatar">
              {story.userPhotoURL ? (
                <img src={story.userPhotoURL} alt={story.userDisplayName} />
              ) : (
                <User size={24} />
              )}
            </div>
            <div className="user-info">
              <h3>{story.userDisplayName}</h3>
              <p>Shared on {formatTimestamp(story.timestamp)}</p>
            </div>
          </div>

          {/* Media */}
          <div className="story-media-container">
            {story.mediaType === 'image' ? (
              <img 
                src={story.mediaUrl} 
                alt="Shared story"
                className="shared-story-media"
              />
            ) : (
              <video 
                src={story.mediaUrl}
                className="shared-story-media"
                controls
                poster={story.thumbnail}
              />
            )}
          </div>

          {/* Caption */}
          {story.caption && (
            <div className="story-caption-section">
              <p>{story.caption}</p>
            </div>
          )}

          {/* Stats */}
          <div className="story-stats-section">
            <div className="stat-item">
              <span className="stat-number">{story.viewCount || 0}</span>
              <span className="stat-label">Views</span>
            </div>
            {story.isHighlight && (
              <div className="highlight-badge">
                ✨ Saved to Highlights
              </div>
            )}
          </div>

          {/* Call to Action */}
          <div className="story-cta">
            <h4>Join AmaPlayer</h4>
            <p>Create and share your own sports stories</p>
            <button className="join-btn" onClick={() => navigate('/login')}>
              Sign Up Now
            </button>
            <button className="browse-btn" onClick={() => navigate('/')}>
              Browse Stories
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="story-share-footer">
        <div className="app-info">
          <h3>AmaPlayer</h3>
          <p>The ultimate sports social media platform</p>
          <div className="app-links">
            <button onClick={() => navigate('/')}>Home</button>
            <button onClick={() => navigate('/login')}>Sign Up</button>
          </div>
        </div>
      </div>
    </div>
  );
}
