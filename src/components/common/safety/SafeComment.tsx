// Safe Comment Component - Bulletproof comment rendering
import React, { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Edit2, Check, X, Heart } from 'lucide-react';
import ProfileAvatar from '../ui/ProfileAvatar';
import ErrorBoundary from './ErrorBoundary';
import {
  ultraSafeCommentData,
  safenizeString,
  safeFormatTimestamp,
  SafeComment as SafeCommentData
} from '../../../utils/rendering/safeCommentRenderer';
import './SafeComment.css';

interface SafeCommentProps {
  comment: unknown;
  index: number;
  currentUserId: string | null;
  onDelete?: (index: number, commentId: string) => void;
  onEdit?: (index: number, commentId: string, newText: string) => void;
  onLike?: (index: number, commentId: string) => void;
  context?: string;
}

/**
 * Bulletproof comment rendering component that prevents React error #31
 */
const SafeComment = memo(function SafeComment({
  comment,
  index,
  currentUserId,
  onDelete,
  onEdit,
  onLike,
  context = 'unknown'
}: SafeCommentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');

  // First layer of protection: Safe data extraction
  const safeComment = ultraSafeCommentData(comment);

  // Second layer: Emergency fallback for invalid comments
  if (!safeComment.isValid) {
    return (
      <div className="comment error-comment">
        <p className="error-message">Comment could not be loaded safely</p>
      </div>
    );
  }

  // Third layer: Individual field protection with emergency fallbacks
  const displayName = safenizeString(safeComment.userDisplayName, 'Unknown User');
  const commentText = safenizeString(safeComment.text, 'No text');
  const userPhoto = safenizeString(safeComment.userPhotoURL, '');
  const userId = safenizeString(safeComment.userId, '');
  const commentId = safenizeString(safeComment.id, `comment-${index}`);

  const handleEditClick = () => {
    setEditText(commentText);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (editText.trim() && onEdit) {
      onEdit(index, commentId, editText.trim());
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText('');
  };
  
  // Debug logging for production issues
  // Disabled to prevent console flooding on every render
  // if (process.env.NODE_ENV === 'development') {
  //   const logger = require('../../../utils/logging/LoggingManager').default;
  //   logger.rendering(`Rendering safe comment in ${context}:`, {
  //     id: commentId,
  //     displayName,
  //     textLength: commentText.length,
  //     hasPhoto: !!userPhoto,
  //     canDelete: userId === currentUserId
  //   });
  // }
  
  return (
    <ErrorBoundary name={`SafeComment-${context}-${index}`}>
      <div className="comment" data-comment-id={commentId}>
        <Link
          to={`/profile/${userId}`}
          className="comment-avatar-link"
          title={`View ${displayName}'s profile`}
        >
          <div className="comment-avatar">
            <ProfileAvatar
              src={userPhoto}
              alt={`${displayName} avatar`}
              size={32}
            />
          </div>
        </Link>

        <div className="comment-content">
          <div className="comment-header">
            <Link
              to={`/profile/${userId}`}
              className="comment-author-link"
              title={`View ${displayName}'s profile`}
            >
              <strong className="comment-author">
                {displayName}
              </strong>
            </Link>
            <span className="comment-time">
              {safeFormatTimestamp(safeComment.timestamp)}
            </span>
          </div>

          {isEditing ? (
            <div className="comment-edit-container">
              <textarea
                className="comment-edit-input"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                autoFocus
                rows={2}
              />
              <div className="comment-edit-actions">
                <button
                  className="save-edit-btn"
                  onClick={handleSaveEdit}
                  title="Save"
                  aria-label="Save edit"
                >
                  <Check size={14} />
                </button>
                <button
                  className="cancel-edit-btn"
                  onClick={handleCancelEdit}
                  title="Cancel"
                  aria-label="Cancel edit"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="comment-text">
                {commentText}
                {(safeComment as any).edited && <span className="edited-indicator"> (edited)</span>}
              </p>

              {/* Like button for all comments */}
              {onLike && (() => {
                // Check if user has liked - handle both string[] and object[] formats
                const likes = (safeComment as any).likes || [];

                // Debug logging - disabled to prevent console flooding
                // if (process.env.NODE_ENV === 'development') {
                //   console.log('SafeComment - Like check:', {
                //     commentId,
                //     currentUserId,
                //     likes,
                //     likesType: typeof likes[0],
                //     isArray: Array.isArray(likes)
                //   });
                // }

                const hasLiked = Array.isArray(likes) && currentUserId && likes.length > 0
                  ? typeof likes[0] === 'string'
                    ? likes.includes(currentUserId)
                    : likes.some((like: any) => like?.userId === currentUserId)
                  : false;

                // if (process.env.NODE_ENV === 'development') {
                //   console.log('SafeComment - hasLiked:', hasLiked);
                // }

                return (
                  <div className="comment-like-section">
                    <button
                      className={`comment-like-btn ${hasLiked ? 'liked' : ''}`}
                      onClick={() => {onLike(index, commentId);
                      }}
                      aria-label={`${hasLiked ? 'Unlike' : 'Like'} comment`}
                    >
                      <Heart
                        size={14}
                        fill={hasLiked ? 'currentColor' : 'none'}
                      />
                      {(safeComment as any).likesCount > 0 && (
                        <span className="like-count">{(safeComment as any).likesCount}</span>
                      )}
                    </button>
                  </div>
                );
              })()}
            </>
          )}
        </div>

        {userId === currentUserId && !isEditing && (
          <div className="comment-actions-btns">
            {onEdit && (
              <button
                className="edit-comment-btn"
                onClick={handleEditClick}
                title="Edit comment"
                aria-label={`Edit comment by ${displayName}`}
              >
                <Edit2 size={14} />
              </button>
            )}
            {onDelete && (
              <button
                className="delete-comment-btn"
                onClick={() => onDelete(index, commentId)}
                title="Delete comment"
                aria-label={`Delete comment by ${displayName}`}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
});

interface SafeCommentsListProps {
  comments: unknown;
  currentUserId: string | null;
  onDelete?: (index: number, commentId: string) => void;
  onEdit?: (index: number, commentId: string, newText: string) => void;
  onLike?: (index: number, commentId: string) => void;
  context?: string;
  emptyMessage?: string;
}

/**
 * Safe Comments List Component - Renders multiple comments safely
 */
export const SafeCommentsList = memo(function SafeCommentsList({
  comments,
  currentUserId,
  onDelete,
  onEdit,
  onLike,
  context = 'unknown',
  emptyMessage = 'No comments yet. Be the first to comment!'
}: SafeCommentsListProps) {
  // Validate and sanitize comments array
  if (!Array.isArray(comments)) {
    console.warn('⚠️ Comments prop is not an array:', comments);
    return (
      <div className="comments-list">
        <p className="no-comments error">Invalid comments data</p>
      </div>
    );
  }
  
  // Filter out any invalid comments
  const safeComments = comments
    .map(comment => ultraSafeCommentData(comment))
    .filter(comment => comment.isValid);
  
  if (safeComments.length === 0) {
    return (
      <div className="comments-list">
        <p className="no-comments">{emptyMessage}</p>
      </div>
    );
  }
  
  return (
    <div className="comments-list">
      {safeComments.map((comment: SafeCommentData, index: number) => {
        // Generate stable key to prevent re-renders
        const timestampMillis = comment.timestamp && typeof comment.timestamp === 'object' && 'toMillis' in comment.timestamp
          ? (comment.timestamp as { toMillis: () => number }).toMillis()
          : Date.now();
        const stableKey = comment.id || 
          `${comment.userId || 'unknown'}-${timestampMillis}-${index}`;
        
        return (
          <SafeComment
            key={`${context}-${stableKey}`}
            comment={comment}
            index={index}
            currentUserId={currentUserId}
            onDelete={onDelete}
            onEdit={onEdit}
            onLike={onLike}
            context={context}
          />
        );
      })}
    </div>
  );
});

export default SafeComment;
