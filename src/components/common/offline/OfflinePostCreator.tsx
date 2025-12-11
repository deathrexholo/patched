import React, { useState, useRef, ChangeEvent } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { createOfflinePost } from '../../../utils/caching/offlinePostManager';
import NetworkStatus from '../network/NetworkStatus';
import './OfflinePostCreator.css';

interface MediaPreview {
  url: string;
  type: 'image' | 'video';
}

interface OfflinePostCreatorProps {
  onPostCreated?: (post: any) => void;
  onCancel?: () => void;
  showOfflineIndicator?: boolean;
}

const OfflinePostCreator: React.FC<OfflinePostCreatorProps> = ({ 
  onPostCreated, 
  onCancel, 
  showOfflineIndicator = true 
}) => {
  const { currentUser: user } = useAuth();
  const [caption, setCaption] = useState<string>('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<MediaPreview | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMediaSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File size must be less than 10MB for offline posts');
      return;
    }

    setMediaFile(file);
    setError('');

    const reader = new FileReader();
    reader.onload = (e) => {
      setMediaPreview({
        url: e.target?.result as string,
        type: file.type.startsWith('video/') ? 'video' : 'image'
      });
    };
    reader.readAsDataURL(file);
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreatePost = async () => {
    if (!caption.trim() && !mediaFile) {
      setError('Please add a caption or select media');
      return;
    }

    if (!user) {
      setError('You must be logged in to create posts');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      let mediaUrl: string | null = null;
      let mediaType: string | null = null;

      if (mediaFile) {
        const base64Data = await convertFileToBase64(mediaFile);
        mediaUrl = base64Data;
        mediaType = mediaFile.type.startsWith('video/') ? 'video' : 'image';
      }

      const postData = {
        caption: caption.trim(),
        mediaUrl,
        mediaType,
        isOffline: true,
        originalFileName: mediaFile?.name || null,
        originalFileSize: mediaFile?.size || null
      };

      const offlinePost = await createOfflinePost(postData, user.uid);

      setShowConfirmation(true);
      
      setCaption('');
      setMediaFile(null);
      setMediaPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (onPostCreated) {
        onPostCreated(offlinePost);
      }

      setTimeout(() => {
        setShowConfirmation(false);
      }, 3000);

    } catch (error) {
      console.error('Failed to create offline post:', error);
      setError('Failed to create post. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const canCreateOffline = (): boolean => {
    return 'indexedDB' in window && !!user;
  };

  if (!canCreateOffline()) {
    return (
      <div className="offline-post-creator offline-unavailable">
        <div className="unavailable-message">
          <h3>Offline posting not available</h3>
          <p>Your browser doesn't support offline features or you're not logged in.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="offline-post-creator">
      {showOfflineIndicator && <NetworkStatus />}
      
      <div className="creator-header">
        <h3>
          {navigator.onLine ? '📝 Create Post' : '📱 Create Post (Offline)'}
        </h3>
        {!navigator.onLine && (
          <div className="offline-notice">
            <span className="offline-indicator">🔄 Will sync when online</span>
          </div>
        )}
      </div>

      {showConfirmation && (
        <div className="confirmation-banner">
          <div className="confirmation-content">
            <span className="success-icon">✅</span>
            <span>
              {navigator.onLine 
                ? 'Post created and queued for upload!' 
                : 'Post saved! It will sync when you\'re back online.'
              }
            </span>
          </div>
        </div>
      )}

      <div className="creator-body">
        <div className="caption-section">
          <textarea
            className="caption-input"
            placeholder={navigator.onLine 
              ? "What's happening in sports?" 
              : "What's happening? (will post when online)"
            }
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
            maxLength={500}
            disabled={isCreating}
          />
          <div className="character-count">
            {caption.length}/500
          </div>
        </div>

        {mediaPreview && (
          <div className="media-preview">
            {mediaPreview.type === 'video' ? (
              <video controls className="preview-media">
                <source src={mediaPreview.url} />
                Your browser does not support the video tag.
              </video>
            ) : (
              <img 
                src={mediaPreview.url} 
                alt="Preview" 
                className="preview-media"
              />
            )}
            <button 
              className="remove-media-btn"
              onClick={removeMedia}
              disabled={isCreating}
            >
              ✕
            </button>
          </div>
        )}

        <div className="media-upload-section">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleMediaSelect}
            className="media-input"
            id="offline-media-input"
            disabled={isCreating}
          />
          <label htmlFor="offline-media-input" className="media-upload-btn">
            {mediaFile ? '🔄 Change Media' : '📎 Add Media'}
          </label>
          <small className="media-hint">
            Images and videos up to 10MB
            {!navigator.onLine && ' (stored locally until online)'}
          </small>
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        <div className="creator-actions">
          <button
            className="create-btn"
            onClick={handleCreatePost}
            disabled={isCreating || (!caption.trim() && !mediaFile)}
          >
            {isCreating ? (
              <>
                <span className="loading-spinner"></span>
                Creating...
              </>
            ) : (
              <>
                {navigator.onLine ? '📤 Create Post' : '💾 Save Post'}
              </>
            )}
          </button>
          
          {onCancel && (
            <button
              className="cancel-btn"
              onClick={onCancel}
              disabled={isCreating}
            >
              Cancel
            </button>
          )}
        </div>

        {!navigator.onLine && (
          <div className="offline-info">
            <div className="info-item">
              <span className="info-icon">💾</span>
              <span>Post will be saved locally</span>
            </div>
            <div className="info-item">
              <span className="info-icon">🔄</span>
              <span>Automatic sync when online</span>
            </div>
            <div className="info-item">
              <span className="info-icon">📱</span>
              <span>Works completely offline</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OfflinePostCreator;
