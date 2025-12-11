import React, { useState, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useMediaUpload } from '../../../hooks/useMediaUpload';
import { filterPostContent, getPostViolationMessage, logPostViolation } from '../../../utils/content/postContentFilter';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Image, Upload, X, Trash2 } from 'lucide-react';
import { User } from 'firebase/auth';
import SafeImage from '../../../components/common/SafeImage';
import './PostComposer.css';

interface PostComposerProps {
  currentUser: User | null;
  isGuest: boolean;
  onPostCreated?: () => void;
  disabled?: boolean;
}

interface PostViolation {
  isClean: boolean;
  shouldBlock: boolean;
  shouldWarn: boolean;
  shouldFlag: boolean;
  violations: string[];
  categories: string[];
}

/**
 * PostComposer Component
 * Handles post creation, media upload, and content validation
 */
const PostComposer: React.FC<PostComposerProps> = ({ 
  currentUser, 
  isGuest, 
  onPostCreated, 
  disabled = false 
}) => {
  // Local state for post composition
  const [postText, setPostText] = useState<string>('');
  const [postViolation, setPostViolation] = useState<PostViolation | null>(null);
  const [showPostWarning, setShowPostWarning] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Media upload hook
  const {
    selectedMedia,
    mediaPreview,
    uploading,
    uploadProgress,
    error: mediaError,
    selectMedia,
    removeMedia,
    uploadMedia,
    handleFileSelect,
    clearError,
    reset: resetMedia
  } = useMediaUpload();

  /**
   * Handle post text change with real-time content filtering
   */
  const handlePostTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setPostText(text);

    // Real-time content filtering
    if (text.trim().length > 3) {
      const filterResult = filterPostContent(text, {
        context: 'sports_post',
        languages: ['english', 'hindi']
      });

      if (!filterResult.isClean && filterResult.shouldBlock) {
        setPostViolation(filterResult);
        setShowPostWarning(true);
      } else {
        setPostViolation(null);
        setShowPostWarning(false);
      }
    } else {
      setPostViolation(null);
      setShowPostWarning(false);
    }
  }, []);

  /**
   * Handle media file selection
   */
  const handleMediaSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    selectMedia(file);
  }, [selectMedia]);

  /**
   * Remove selected media
   */
  const handleRemoveMedia = useCallback(() => {
    removeMedia();
  }, [removeMedia]);

  /**
   * Create and submit post
   */
  const handleCreatePost = useCallback(async () => {
    if (isGuest) {
      alert('Please sign up or log in to create posts');
      return;
    }

    if (!currentUser) {
      alert('You must be logged in to create posts');
      return;
    }

    const text = postText.trim();
    if (!text && !selectedMedia) {
      alert('Please write something or select media to share');
      return;
    }

    // Content filtering
    if (text) {
      const filterResult = filterPostContent(text, {
        context: 'sports_post',
        languages: ['english', 'hindi']
      });

      if (!filterResult.isClean) {
        setPostViolation(filterResult);
        setShowPostWarning(true);

        if (filterResult.shouldFlag) {
          await logPostViolation(currentUser.uid, text, filterResult.violations, 'home_post');
        }

        if (filterResult.shouldBlock || filterResult.shouldWarn) {
          const violationMsg = getPostViolationMessage(filterResult.violations, filterResult.categories);
          alert(`❌ You can't post this content: ${violationMsg}`);
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      let mediaUrl: string | null = null;
      let mediaType: 'image' | 'video' | null = null;

      // Upload media if selected
      if (selectedMedia) {
        mediaUrl = await uploadMedia(selectedMedia, currentUser.uid);
        mediaType = selectedMedia.type.startsWith('image/') ? 'image' : 'video';
      }

      // Get user profile data from localStorage with proper null handling
      const profileRole = localStorage.getItem('userRole') || 'athlete';
      // Map profile role to post role format
      const userRole = profileRole === 'parents' ? 'parent' : profileRole === 'coaches' ? 'coach' : profileRole;

      // Helper function to safely get localStorage value (avoids undefined/empty string)
      const getSafeValue = (key: string): string | null => {
        const value = localStorage.getItem(key);
        return value && value.trim() !== '' && value !== '[object Object]' ? value : null;
      };

      // Helper to extract string from object or string
      const extractString = (value: any): string | null => {
        if (!value) return null;
        if (typeof value === 'string') return value !== '[object Object]' ? value : null;
        if (typeof value === 'object' && value !== null && 'name' in value) return value.name;
        return null;
      };

      const userSport = getSafeValue('userSport');
      const userPosition = getSafeValue('userPosition');
      const userPlayerType = getSafeValue('userPlayerType');
      const userOrganizationType = getSafeValue('userOrganizationType');
      const userDisplayName = getSafeValue('userDisplayName') || currentUser.displayName || 'Anonymous User';
      const userSpecializationsStr = getSafeValue('userSpecializations');
      const userSpecializations = userSpecializationsStr
        ? JSON.parse(userSpecializationsStr)
        : null;

      // Create post document with all required fields
      const postData: any = {
        userId: currentUser.uid,
        userDisplayName: userDisplayName,
        userPhotoURL: currentUser.photoURL || null,
        userRole: userRole,
        caption: text,
        mediaUrl: mediaUrl,
        mediaType: mediaType,
        timestamp: serverTimestamp(),
        createdAt: new Date(),
        likes: [],
        comments: [],
        shares: [],
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        isActive: true,
        visibility: 'public'
      };

      // Only add optional fields if they have values
      if (userSport) postData.userSport = userSport;
      if (userPosition) postData.userPosition = userPosition;
      if (userPlayerType) postData.userPlayerType = userPlayerType;
      if (userOrganizationType) postData.userOrganizationType = userOrganizationType;
      if (userSpecializations) postData.userSpecializations = userSpecializations;

      await addDoc(collection(db, 'posts'), postData);

      // Reset form
      resetForm();

      // Notify parent component
      if (onPostCreated) {
        onPostCreated();
      }

      alert('Post created successfully!');
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isGuest, 
    postText, 
    selectedMedia, 
    currentUser, 
    uploadMedia, 
    onPostCreated
  ]);

  /**
   * Reset form to initial state
   */
  const resetForm = useCallback(() => {
    setPostText('');
    setPostViolation(null);
    setShowPostWarning(false);
    resetMedia();
    clearError();
  }, [resetMedia, clearError]);

  // Don't render for guest users
  if (isGuest) {
    return null;
  }

  const isFormDisabled = disabled || isSubmitting || uploading;
  const canSubmit = (postText.trim() || selectedMedia) && !showPostWarning && !isFormDisabled;

  return (
    <div className="post-composer">
      <div className="composer-header">
        <div className="composer-avatar">
          <SafeImage
            src={currentUser?.photoURL || ''}
            alt="Your avatar"
            placeholder="avatar"
            className="composer-avatar-image"
          />
        </div>
        <textarea
          className={`composer-input ${showPostWarning ? 'content-warning' : ''}`}
          placeholder="What's on your mind?"
          value={postText}
          onChange={handlePostTextChange}
          disabled={isFormDisabled}
          rows={3}
        />
      </div>

      {/* Content Warning */}
      {showPostWarning && postViolation && (
        <div className="composer-warning">
          <div className="warning-header">
            <Trash2 size={16} />
            Inappropriate Content Detected
          </div>
          <div className="warning-message">
            {getPostViolationMessage(postViolation.violations, postViolation.categories)}
          </div>
          <div className="warning-suggestion">
            💪 Try sharing your training progress, sports achievements, or positive team experiences!
          </div>
        </div>
      )}

      {/* Media Preview */}
      {mediaPreview && (
        <div className="media-preview">
          <button 
            className="remove-media-btn" 
            onClick={handleRemoveMedia}
            disabled={isFormDisabled}
          >
            <X size={20} />
          </button>
          {mediaPreview.type === 'image' ? (
            <img src={mediaPreview.url} alt="Preview" />
          ) : (
            <video src={mediaPreview.url} controls muted />
          )}
          <div className="media-info">
            <span>{mediaPreview.name}</span>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <span>{uploadProgress}% uploaded</span>
        </div>
      )}

      {/* Media Error */}
      {mediaError && (
        <div className="composer-error">
          <span>{mediaError}</span>
          <button onClick={clearError} className="clear-error-btn">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Composer Actions */}
      <div className="composer-actions">
        <div className="media-actions">
          <input
            type="file"
            id="media-upload"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            disabled={isFormDisabled}
          />
          <label htmlFor="media-upload" className={`media-btn ${isFormDisabled ? 'disabled' : ''}`}>
            <Image size={20} />
            Photo/Video
          </label>
        </div>

        <button
          className="post-btn"
          onClick={handleCreatePost}
          disabled={!canSubmit}
        >
          {isSubmitting || uploading ? (
            <>
              <Upload size={16} />
              {uploading ? 'Uploading...' : 'Posting...'}
            </>
          ) : (
            'Post'
          )}
        </button>
      </div>
    </div>
  );
};

export default PostComposer;