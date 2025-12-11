import React, { useState, useEffect } from 'react';
import { Post } from '../types/ProfileTypes';
import '../styles/PostManagementModal.css';

interface PostManagementModalProps {
  post?: Post; // undefined for new post, defined for editing
  isOpen: boolean;
  onClose: () => void;
  onSave: (postData: Omit<Post, 'id' | 'createdDate' | 'likes' | 'comments'>) => void;
}

const PostManagementModal: React.FC<PostManagementModalProps> = ({
  post,
  isOpen,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState({
    type: 'text' as Post['type'],
    title: '',
    content: '',
    mediaUrls: [] as string[],
    thumbnailUrl: '',
    isPublic: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (post) {
      setFormData({
        type: post.type,
        title: post.title || '',
        content: post.content,
        mediaUrls: post.mediaUrls,
        thumbnailUrl: post.thumbnailUrl || '',
        isPublic: post.isPublic
      });
    } else {
      setFormData({
        type: 'text',
        title: '',
        content: '',
        mediaUrls: [],
        thumbnailUrl: '',
        isPublic: true
      });
    }
    setErrors({});
  }, [post, isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.content.trim()) {
      newErrors.content = 'Content is required';
    }

    if (formData.type !== 'text' && formData.mediaUrls.length === 0) {
      newErrors.mediaUrls = 'At least one media URL is required for this post type';
    }

    if (formData.type === 'video' && formData.mediaUrls.length > 0) {
      const videoUrl = formData.mediaUrls[0];
      if (!videoUrl.match(/\.(mp4|webm|ogg)$/i)) {
        newErrors.mediaUrls = 'Please provide a valid video URL (.mp4, .webm, or .ogg)';
      }
    }

    if (formData.type === 'photo' && formData.mediaUrls.length > 0) {
      const invalidUrls = formData.mediaUrls.filter(url => 
        !url.match(/\.(jpg|jpeg|png|gif|webp)$/i)
      );
      if (invalidUrls.length > 0) {
        newErrors.mediaUrls = 'Please provide valid image URLs (.jpg, .jpeg, .png, .gif, or .webp)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSave(formData);
      onClose();
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleMediaUrlsChange = (urls: string) => {
    const urlArray = urls.split('\n').filter(url => url.trim()).map(url => url.trim());
    handleInputChange('mediaUrls', urlArray);
  };

  const getPostTypeLabel = (type: Post['type']) => {
    switch (type) {
      case 'photo':
        return 'Photo Post';
      case 'video':
        return 'Video Post';
      case 'text':
        return 'Text Post';
      case 'mixed':
        return 'Mixed Media Post';
      default:
        return 'Post';
    }
  };

  return (
    <div 
      className="post-management-modal-overlay"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-management-title"
    >
      <div className="post-management-modal">
        <div className="post-management-header">
          <h2 id="post-management-title">
            {post ? 'Edit Post' : 'Create New Post'}
          </h2>
          <button
            className="close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="post-management-form">
          <div className="form-group">
            <label htmlFor="post-type" className="form-label">
              Post Type
            </label>
            <select
              id="post-type"
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value as Post['type'])}
              className="form-select"
            >
              <option value="text">Text Post</option>
              <option value="photo">Photo Post</option>
              <option value="video">Video Post</option>
              <option value="mixed">Mixed Media Post</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="post-title" className="form-label">
              Title (Optional)
            </label>
            <input
              id="post-title"
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="form-input"
              placeholder="Enter post title..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="post-content" className="form-label">
              Content *
            </label>
            <textarea
              id="post-content"
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              className={`form-textarea ${errors.content ? 'error' : ''}`}
              placeholder="What's on your mind?"
              rows={4}
              required
            />
            {errors.content && (
              <span className="error-message">{errors.content}</span>
            )}
          </div>

          {formData.type !== 'text' && (
            <div className="form-group">
              <label htmlFor="media-urls" className="form-label">
                Media URLs * (one per line)
              </label>
              <textarea
                id="media-urls"
                value={formData.mediaUrls.join('\n')}
                onChange={(e) => handleMediaUrlsChange(e.target.value)}
                className={`form-textarea ${errors.mediaUrls ? 'error' : ''}`}
                placeholder={
                  formData.type === 'video' 
                    ? 'https://example.com/video.mp4'
                    : formData.type === 'photo'
                    ? 'https://example.com/image1.jpg\nhttps://example.com/image2.jpg'
                    : 'https://example.com/media1.jpg\nhttps://example.com/video.mp4'
                }
                rows={3}
              />
              {errors.mediaUrls && (
                <span className="error-message">{errors.mediaUrls}</span>
              )}
            </div>
          )}

          {(formData.type === 'video' || formData.type === 'mixed') && (
            <div className="form-group">
              <label htmlFor="thumbnail-url" className="form-label">
                Thumbnail URL (Optional)
              </label>
              <input
                id="thumbnail-url"
                type="url"
                value={formData.thumbnailUrl}
                onChange={(e) => handleInputChange('thumbnailUrl', e.target.value)}
                className="form-input"
                placeholder="https://example.com/thumbnail.jpg"
              />
            </div>
          )}

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.isPublic}
                onChange={(e) => handleInputChange('isPublic', e.target.checked)}
                className="form-checkbox"
              />
              <span className="checkbox-text">Make this post public</span>
            </label>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={onClose}
              className="cancel-btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="save-btn"
            >
              {post ? 'Update Post' : 'Create Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostManagementModal;