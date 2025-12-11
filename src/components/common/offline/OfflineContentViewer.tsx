import React, { useState, useEffect } from 'react';
import { idbStore } from '../../../utils/caching/indexedDB';
import { offlinePostManager } from '../../../utils/caching/offlinePostManager';
import './OfflineContentViewer.css';

interface CachedPost {
  id: string;
  userName?: string;
  userPhoto?: string;
  createdAt: number | string;
  mediaUrl?: string;
  mediaType?: string;
  caption?: string;
  content?: string;
  likesCount?: number;
  commentsCount?: number;
  sharesCount?: number;
  status?: string;
  retryCount?: number;
}

interface CachedUser {
  id: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  role?: string;
  location?: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  updatedAt: number | string;
}

interface StorageStats {
  [key: string]: {
    count: number;
    error?: string;
  };
}

interface SyncStatus {
  total?: number;
  posts?: number;
  likes?: number;
  comments?: number;
  follows?: number;
}

const OfflineContentViewer: React.FC = () => {
  const [cachedPosts, setCachedPosts] = useState<CachedPost[]>([]);
  const [cachedProfiles, setCachedProfiles] = useState<CachedUser[]>([]);
  const [offlinePosts, setOfflinePosts] = useState<CachedPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'cached' | 'pending' | 'profiles' | 'stats'>('cached');
  const [stats, setStats] = useState<StorageStats>({});
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({});

  useEffect(() => {
    loadOfflineContent();
    loadSyncStatus();
  }, []);

  const loadOfflineContent = async () => {
    setLoading(true);
    try {const [
        indexedDBPosts,
        cachedUsers,
        storageStats,
        pendingPosts
      ] = await Promise.all([
        idbStore.getAllOfflinePosts(),
        idbStore.getAllCachedUsers(),
        idbStore.getStorageStats(),
        offlinePostManager.getAllOfflinePosts()
      ]);

      setCachedPosts((indexedDBPosts as any) || []);
      setCachedProfiles((cachedUsers as any) || []);
      setOfflinePosts((pendingPosts as any) || []);
      setStats((storageStats as any) || {});} catch (error) {
      console.error('Failed to load offline content:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSyncStatus = async () => {
    try {
      const pendingCount = await offlinePostManager.getPendingSyncCount();
      setSyncStatus(pendingCount);
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  };

  const forceSync = async () => {
    if (!navigator.onLine) {
      alert('You are offline. Sync will happen automatically when you reconnect.');
      return;
    }

    try {
      setLoading(true);
      await offlinePostManager.attemptImmediateSync();
      await loadOfflineContent();
      await loadSyncStatus();
      alert('Sync completed successfully!');
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Sync failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearOfflineData = async () => {
    if (window.confirm('Are you sure you want to clear all offline data? This cannot be undone.')) {
      try {
        await offlinePostManager.clearAllOfflineData();
        await loadOfflineContent();
        await loadSyncStatus();
        alert('Offline data cleared successfully!');
      } catch (error) {
        console.error('Failed to clear offline data:', error);
        alert('Failed to clear offline data.');
      }
    }
  };

  const renderPostCard = (post: CachedPost, isOffline: boolean = false) => (
    <div key={post.id} className={`offline-post-card ${isOffline ? 'offline-pending' : 'cached'}`}>
      <div className="post-header">
        <div className="post-user-info">
          <div className="user-avatar">
            {post.userPhoto ? (
              <img src={post.userPhoto} alt={post.userName} />
            ) : (
              <div className="avatar-placeholder">
                {post.userName?.charAt(0) || 'U'}
              </div>
            )}
          </div>
          <div className="user-details">
            <h4>{post.userName || 'Unknown User'}</h4>
            <p className="post-time">
              {new Date(post.createdAt).toLocaleDateString()}
              {isOffline && <span className="offline-badge">Pending Sync</span>}
            </p>
          </div>
        </div>
        <div className="post-status">
          {isOffline && (
            <div className={`status-indicator ${post.status || 'pending'}`}>
              {post.status || 'pending'}
            </div>
          )}
        </div>
      </div>

      {post.mediaUrl && post.mediaUrl.trim() !== '' && (
        <div className="post-media">
          {post.mediaType === 'video' ? (
            <video controls>
              <source src={post.mediaUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          ) : (
            <img src={post.mediaUrl} alt="Post content" />
          )}
        </div>
      )}

      <div className="post-content">
        <p>{post.caption || post.content}</p>
      </div>

      <div className="post-actions">
        <div className="action-stats">
          <span>❤️ {post.likesCount || 0}</span>
          <span>💬 {post.commentsCount || 0}</span>
          <span>📤 {post.sharesCount || 0}</span>
        </div>
        {isOffline && (
          <div className="offline-actions">
            <span className="retry-count">
              Retries: {post.retryCount || 0}/3
            </span>
          </div>
        )}
      </div>
    </div>
  );

  const renderUserCard = (user: CachedUser) => (
    <div key={user.id} className="offline-user-card">
      <div className="user-profile-header">
        <div className="user-avatar-large">
          {user.photoURL ? (
            <img src={user.photoURL} alt={user.displayName} />
          ) : (
            <div className="avatar-placeholder-large">
              {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
            </div>
          )}
        </div>
        <div className="user-info">
          <h3>{user.displayName || user.email}</h3>
          <p className="user-role">{user.role || 'User'}</p>
          <p className="user-location">{user.location || 'Location not set'}</p>
        </div>
      </div>
      <div className="user-stats">
        <div className="stat">
          <span className="stat-number">{user.followersCount || 0}</span>
          <span className="stat-label">Followers</span>
        </div>
        <div className="stat">
          <span className="stat-number">{user.followingCount || 0}</span>
          <span className="stat-label">Following</span>
        </div>
        <div className="stat">
          <span className="stat-number">{user.postsCount || 0}</span>
          <span className="stat-label">Posts</span>
        </div>
      </div>
      <div className="user-cached-info">
        <small>Cached: {new Date(user.updatedAt).toLocaleString()}</small>
      </div>
    </div>
  );

  if (loading && cachedPosts.length === 0 && cachedProfiles.length === 0) {
    return (
      <div className="offline-content-viewer">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading offline content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="offline-content-viewer">
      <div className="offline-header">
        <h2>📱 Offline Mode</h2>
        <p className="offline-description">
          {navigator.onLine 
            ? 'Browsing your cached content (you are online)' 
            : 'You are offline - browsing cached content only'
          }
        </p>
        
        <div className="offline-stats">
          <div className="stat-item">
            <span className="stat-number">{cachedPosts.length}</span>
            <span className="stat-label">Cached Posts</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{offlinePosts.length}</span>
            <span className="stat-label">Pending Posts</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{cachedProfiles.length}</span>
            <span className="stat-label">Cached Profiles</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{syncStatus.total || 0}</span>
            <span className="stat-label">Pending Sync</span>
          </div>
        </div>

        <div className="offline-controls">
          {navigator.onLine && (
            <button 
              className="sync-button" 
              onClick={forceSync}
              disabled={loading}
            >
              🔄 Force Sync ({syncStatus.total || 0} pending)
            </button>
          )}
          <button 
            className="clear-button" 
            onClick={clearOfflineData}
            disabled={loading}
          >
            🗑️ Clear Offline Data
          </button>
          <button 
            className="refresh-button" 
            onClick={() => { loadOfflineContent(); loadSyncStatus(); }}
            disabled={loading}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      <div className="offline-tabs">
        <button 
          className={`tab-button ${activeTab === 'cached' ? 'active' : ''}`}
          onClick={() => setActiveTab('cached')}
        >
          Cached Posts ({cachedPosts.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Posts ({offlinePosts.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'profiles' ? 'active' : ''}`}
          onClick={() => setActiveTab('profiles')}
        >
          Cached Profiles ({cachedProfiles.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          Storage Stats
        </button>
      </div>

      <div className="offline-content">
        {activeTab === 'cached' && (
          <div className="cached-posts">
            {cachedPosts.length > 0 ? (
              cachedPosts.map(post => renderPostCard(post, false))
            ) : (
              <div className="empty-state">
                <p>No cached posts available</p>
                <small>Posts will be cached automatically as you browse</small>
              </div>
            )}
          </div>
        )}

        {activeTab === 'pending' && (
          <div className="pending-posts">
            {offlinePosts.length > 0 ? (
              offlinePosts.map(post => renderPostCard(post, true))
            ) : (
              <div className="empty-state">
                <p>No pending posts</p>
                <small>Posts created while offline will appear here</small>
              </div>
            )}
          </div>
        )}

        {activeTab === 'profiles' && (
          <div className="cached-profiles">
            {cachedProfiles.length > 0 ? (
              cachedProfiles.map(user => renderUserCard(user))
            ) : (
              <div className="empty-state">
                <p>No cached profiles available</p>
                <small>User profiles will be cached automatically as you browse</small>
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="storage-stats">
            <h3>Storage Statistics</h3>
            <div className="stats-grid">
              {Object.entries(stats).map(([storeName, stat]) => (
                <div key={storeName} className="stat-card">
                  <h4>{storeName.replace(/_/g, ' ').toUpperCase()}</h4>
                  <div className="stat-details">
                    <p>Items: {stat.count || 0}</p>
                    {stat.error && (
                      <p className="stat-error">Error: {stat.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="sync-breakdown">
              <h4>Pending Sync Breakdown</h4>
              <div className="sync-stats">
                <div className="sync-stat">
                  <span>Posts: {syncStatus.posts || 0}</span>
                </div>
                <div className="sync-stat">
                  <span>Likes: {syncStatus.likes || 0}</span>
                </div>
                <div className="sync-stat">
                  <span>Comments: {syncStatus.comments || 0}</span>
                </div>
                <div className="sync-stat">
                  <span>Follows: {syncStatus.follows || 0}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {!navigator.onLine && (
        <div className="offline-notice">
          <p>🌐 You're offline. Content will sync automatically when you reconnect.</p>
        </div>
      )}
    </div>
  );
};

export default OfflineContentViewer;
