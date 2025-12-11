import { memo, useState, useEffect, useCallback } from 'react';
import { X, MapPin, Calendar, Award, Users, Image, Video, Heart, MessageCircle } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import LazyImage from '../../../components/common/ui/LazyImage';
import { db } from '../../../lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore';
import '../styles/ProfileDetailModal.css';

interface ProfileDetailModalProps {
  userId: string;
  onClose: () => void;
}

interface ProfileStats {
  posts: number;
  followers: number;
  following: number;
}

interface SocialLinks {
  instagram: string | null;
  twitter: string | null;
}

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  coverPhotoURL: string;
  bio: string;
  location: string;
  joinDate: Date;
  isVerified: boolean;
  stats: ProfileStats;
  sports: string[];
  achievements: string[];
  role: string;
  website: string | null;
  socialLinks: SocialLinks;
}

interface PostStats {
  likes: number;
  comments: number;
  views: number;
}

interface Post {
  id: string;
  type: 'image' | 'video';
  mediaUrl: string;
  thumbnailUrl: string;
  caption: string;
  createdAt: Date;
  stats: PostStats;
}

type TabType = 'posts' | 'videos' | 'about';

const ProfileDetailModal = memo(({ userId, onClose }: ProfileDetailModalProps) => {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [followersCount, setFollowersCount] = useState<number>(0);

  // Mock API functions (replace with real API calls)
  const fetchUserProfile = useCallback(async (userUid: string): Promise<UserProfile> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return {
      uid: userUid,
      displayName: `Athlete ${userUid.slice(-3)}`,
      email: `user${userUid.slice(-3)}@example.com`,
      photoURL: `/assets/placeholders/default-avatar.svg`,
      coverPhotoURL: `/assets/placeholders/default-post.svg`,
      bio: 'Professional athlete passionate about sports and fitness. Sharing my journey to inspire others.',
      location: ['Mumbai, India', 'Delhi, India', 'Bangalore, India', 'Chennai, India'][Math.floor(Math.random() * 4)],
      joinDate: new Date('2022-01-15'),
      isVerified: Math.random() > 0.7,
      stats: {
        posts: Math.floor(Math.random() * 500) + 50,
        followers: Math.floor(Math.random() * 10000) + 1000,
        following: Math.floor(Math.random() * 1000) + 100
      },
      sports: ['Cricket', 'Football', 'Basketball', 'Tennis'].slice(0, Math.floor(Math.random() * 3) + 1),
      achievements: [
        'State Champion 2023',
        'Regional Tournament Winner',
        'Best Player Award 2022'
      ].slice(0, Math.floor(Math.random() * 3) + 1),
      role: ['athlete', 'coach', 'organization'][Math.floor(Math.random() * 3)],
      website: Math.random() > 0.5 ? 'https://example.com' : null,
      socialLinks: {
        instagram: Math.random() > 0.5 ? '@athlete_username' : null,
        twitter: Math.random() > 0.5 ? '@athlete_handle' : null
      }
    };
  }, []);

  const fetchUserPosts = useCallback(async (userUid: string): Promise<Post[]> => {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    return Array.from({ length: 12 }, (_, index) => ({
      id: `post-${userUid}-${index}`,
      type: (['image', 'video'][Math.floor(Math.random() * 2)] as 'image' | 'video'),
      mediaUrl: `/assets/placeholders/default-post.svg`,
      thumbnailUrl: `/assets/placeholders/default-post.svg`,
      caption: [
        'Training session complete! 💪',
        'Another day, another victory! 🏆',
        'Hard work pays off. Stay focused! 🎯',
        'Grateful for this journey. #blessed',
        'New personal best today! 🔥'
      ][index % 5],
      createdAt: new Date(Date.now() - Math.random() * 86400000 * 30),
      stats: {
        likes: Math.floor(Math.random() * 500),
        comments: Math.floor(Math.random() * 50),
        views: Math.floor(Math.random() * 2000)
      }
    }));
  }, []);

  const followUser = useCallback(async (userUid: string, following: boolean): Promise<{ success: boolean; following: boolean }> => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      if (following) {
        // Follow: add to follows collection
        await addDoc(collection(db, 'follows'), {
          followerId: currentUser.uid,
          followingId: userUid,
          followerName: currentUser.displayName || 'Anonymous User',
          followingName: profile?.displayName || 'Unknown User',
          timestamp: serverTimestamp()
        });} else {
        // Unfollow: remove from follows collection
        const q = query(
          collection(db, 'follows'),
          where('followerId', '==', currentUser.uid),
          where('followingId', '==', userUid)
        );

        const snapshot = await getDocs(q);
        snapshot.forEach(async (docSnapshot) => {
          await deleteDoc(doc(db, 'follows', docSnapshot.id));
        });}

      return { success: true, following };
    } catch (error) {
      console.error('Error updating follow status:', error);
      throw error;
    }
  }, [currentUser, profile?.displayName]);

  // Load profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (!userId) return;
      
      try {
        setLoading(true);
        const [profileData, postsData] = await Promise.all([
          fetchUserProfile(userId),
          fetchUserPosts(userId)
        ]);
        
        setProfile(profileData);
        setPosts(postsData);
        setFollowersCount(profileData.stats.followers);
        setIsFollowing(Math.random() > 0.5); // Mock following status
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [userId, fetchUserProfile, fetchUserPosts]);

  // Handle follow/unfollow
  const handleFollowToggle = useCallback(async () => {
    if (!profile) return;

    const newFollowingState = !isFollowing;
    setIsFollowing(newFollowingState);
    setFollowersCount(prev => newFollowingState ? prev + 1 : prev - 1);

    try {
      await followUser(profile.uid, newFollowingState);
    } catch (error) {
      // Revert on error
      setIsFollowing(!newFollowingState);
      setFollowersCount(prev => newFollowingState ? prev - 1 : prev + 1);
      console.error('Error following user:', error);
    }
  }, [profile, isFollowing, followUser]);

  const formatNumber = useCallback((num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  }, []);

  const formatDate = useCallback((date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long'
    }).format(new Date(date));
  }, []);

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="profile-modal loading" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div className="loading-skeleton" style={{ width: '150px', height: '24px' }} />
            <button className="close-btn" onClick={onClose}>
              <X size={24} />
            </button>
          </div>
          <div className="profile-loading">
            <div className="loading-skeleton" style={{ width: '100%', height: '200px' }} />
            <div className="loading-skeleton" style={{ width: '120px', height: '120px', borderRadius: '50%' }} />
            <div className="loading-skeleton" style={{ width: '200px', height: '20px' }} />
            <div className="loading-skeleton" style={{ width: '300px', height: '16px' }} />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="profile-modal error" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Profile not found</h3>
            <button className="close-btn" onClick={onClose}>
              <X size={24} />
            </button>
          </div>
          <div className="error-content">
            <p>This profile could not be loaded. It may have been deleted or made private.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h3>{profile.displayName}</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Cover Photo */}
        <div className="profile-cover">
          <LazyImage
            src={profile.coverPhotoURL}
            alt="Cover photo"
            className="cover-image"
            placeholder="/default-cover.jpg"
          />
        </div>

        {/* Profile Info */}
        <div className="profile-info">
          <div className="profile-avatar-container">
            <LazyImage
              src={profile.photoURL}
              alt={profile.displayName}
              className="profile-avatar large"
              placeholder="/default-avatar.jpg"
            />
            {profile.isVerified && (
              <div className="verified-badge" title="Verified">
                <Award size={16} />
              </div>
            )}
          </div>

          <div className="profile-details">
            <h2 className="profile-name">
              {profile.displayName}
              {profile.isVerified && <Award size={18} className="verified-icon" />}
            </h2>
            <p className="profile-role">{profile.role}</p>
            {profile.bio && <p className="profile-bio">{profile.bio}</p>}
            
            <div className="profile-meta">
              {profile.location && (
                <div className="meta-item">
                  <MapPin size={14} />
                  <span>{profile.location}</span>
                </div>
              )}
              <div className="meta-item">
                <Calendar size={14} />
                <span>Joined {formatDate(profile.joinDate)}</span>
              </div>
            </div>

            {profile.sports && profile.sports.length > 0 && (
              <div className="profile-sports">
                {profile.sports.map((sport, index) => (
                  <span key={index} className="sport-tag">{sport}</span>
                ))}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="profile-stats">
            <div className="stat">
              <span className="stat-number">{formatNumber(profile.stats.posts)}</span>
              <span className="stat-label">Posts</span>
            </div>
            <div className="stat">
              <span className="stat-number">{formatNumber(followersCount)}</span>
              <span className="stat-label">Followers</span>
            </div>
            <div className="stat">
              <span className="stat-number">{formatNumber(profile.stats.following)}</span>
              <span className="stat-label">Following</span>
            </div>
          </div>

          {/* Actions */}
          {currentUser && currentUser.uid !== profile.uid && (
            <div className="profile-actions">
              <button 
                className={`follow-btn ${isFollowing ? 'following' : ''}`}
                onClick={handleFollowToggle}
              >
                <Users size={18} />
                {isFollowing ? 'Following' : 'Follow'}
              </button>
              <button className="message-btn">
                <MessageCircle size={18} />
                Message
              </button>
            </div>
          )}
        </div>

        {/* Content Tabs */}
        <div className="profile-tabs">
          <button 
            className={`tab ${activeTab === 'posts' ? 'active' : ''}`}
            onClick={() => setActiveTab('posts')}
          >
            <Image size={16} />
            Posts ({profile.stats.posts})
          </button>
          <button 
            className={`tab ${activeTab === 'videos' ? 'active' : ''}`}
            onClick={() => setActiveTab('videos')}
          >
            <Video size={16} />
            Videos
          </button>
          <button 
            className={`tab ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => setActiveTab('about')}
          >
            <Award size={16} />
            About
          </button>
        </div>

        {/* Content */}
        <div className="profile-content">
          {activeTab === 'posts' && (
            <div className="posts-grid">
              {posts.map(post => (
                <div key={post.id} className="post-thumbnail">
                  <LazyImage
                    src={post.mediaUrl}
                    alt={post.caption}
                    className="post-image"
                  />
                  <div className="post-overlay">
                    <div className="post-stats">
                      <span>
                        <Heart size={14} />
                        {formatNumber(post.stats.likes)}
                      </span>
                      <span>
                        <MessageCircle size={14} />
                        {formatNumber(post.stats.comments)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'videos' && (
            <div className="videos-grid">
              {posts.filter(post => post.type === 'video').map(video => (
                <div key={video.id} className="video-thumbnail">
                  <LazyImage
                    src={video.thumbnailUrl}
                    alt={video.caption}
                    className="video-image"
                  />
                  <div className="video-overlay">
                    <div className="play-icon">
                      <Video size={24} />
                    </div>
                    <div className="video-stats">
                      <span>{formatNumber(video.stats.views)} views</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'about' && (
            <div className="about-content">
              {profile.achievements && profile.achievements.length > 0 && (
                <div className="achievements-section">
                  <h4>Achievements</h4>
                  <ul className="achievements-list">
                    {profile.achievements.map((achievement, index) => (
                      <li key={index}>
                        <Award size={16} />
                        {achievement}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="contact-section">
                <h4>Contact Information</h4>
                <div className="contact-info">
                  {profile.website && (
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="contact-link">
                      Website: {profile.website}
                    </a>
                  )}
                  {profile.socialLinks.instagram && (
                    <span className="social-link">Instagram: {profile.socialLinks.instagram}</span>
                  )}
                  {profile.socialLinks.twitter && (
                    <span className="social-link">Twitter: {profile.socialLinks.twitter}</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

ProfileDetailModal.displayName = 'ProfileDetailModal';

export default ProfileDetailModal;
