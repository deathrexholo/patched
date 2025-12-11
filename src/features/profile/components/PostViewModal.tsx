import React, { useState } from 'react';
import { Post } from '../types/ProfileTypes';
import '../styles/PostViewModal.css';

interface PostViewModalProps {
  post: Post;
  isOwner: boolean;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (post: Post) => void;
  onDelete?: (postId: string) => void;
}

const PostViewModal: React.FC<PostViewModalProps> = ({
  post,
  isOwner,
  isOpen,
  onClose,
  onEdit,
  onDelete
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  const handleDelete = () => {
    if (onDelete) {
      onDelete(post.id);
      onClose();
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(post);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatEngagementCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const getPostTypeLabel = (type: Post['type']) => {
    switch (type) {
      case 'photo':
        return 'Photo';
      case 'video':
        return 'Video';
      case 'text':
        return 'Text';
      case 'mixed':
        return 'Mixed Media';
      default:
        return 'Post';
    }
  };

  return (
    <div 
      className="post-view-modal-overlay"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-view-title"
    >
      <div className="post-view-modal">
        <div className="post-view-header">
          <div className="post-view-info">
            <span className="post-type-badge">{getPostTypeLabel(post.type)}</span>
            <span className="post-date">{formatDate(post.createdDate)}</span>
          </div>
          <div className="post-view-actions">
            {isOwner && (
              <>
                {onEdit && (
                  <button
                    className="post-action-btn edit-btn"
                    onClick={handleEdit}
                    aria-label="Edit post"
                  >
                    ✏️
                  </button>
                )}
                {onDelete && (
                  <button
                    className="post-action-btn delete-btn"
                    onClick={() => setShowDeleteConfirm(true)}
                    aria-label="Delete post"
                  >
                    🗑️
                  </button>
                )}
              </>
            )}
            <button
              className="post-action-btn close-btn"
              onClick={onClose}
              aria-label="Close post view"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="post-view-content">
          {post.title && (
            <h2 id="post-view-title" className="post-title">
              {post.title}
            </h2>
          )}

          {post.mediaUrls.length > 0 && (
            <div className="post-media">
              {post.type === 'video' ? (
                <video
                  controls
                  className="post-video"
                  poster={post.thumbnailUrl}
                  aria-label={`Video: ${post.title || 'Post video'}`}
                >
                  <source src={post.mediaUrls[0]} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="post-images">
                  {post.mediaUrls.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`${post.title || 'Post image'} ${index + 1}`}
                      className="post-image"
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="post-text-content">
            <p>{post.content}</p>
          </div>

          <div className="post-engagement-stats">
            <div className="engagement-stat">
              <span className="engagement-icon">❤️</span>
              <span className="engagement-count">{formatEngagementCount(post.likes)}</span>
              <span className="engagement-label">likes</span>
            </div>
            <div className="engagement-stat">
              <span className="engagement-icon">💬</span>
              <span className="engagement-count">{formatEngagementCount(post.comments)}</span>
              <span className="engagement-label">comments</span>
            </div>
          </div>
        </div>

        {showDeleteConfirm && (
          <div className="delete-confirmation">
            <div className="delete-confirmation-content">
              <h3>Delete Post</h3>
              <p>Are you sure you want to delete this post? This action cannot be undone.</p>
              <div className="delete-confirmation-actions">
                <button
                  className="cancel-btn"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="confirm-delete-btn"
                  onClick={handleDelete}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostViewModal;