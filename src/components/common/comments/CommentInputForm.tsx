import React, { useState, useCallback, useEffect } from 'react';
import { Send } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import CommentService, { ContentType } from '../../../services/api/commentService';
import userService from '../../../services/api/userService';
import { User } from '../../../types/models/user';
import ProfileAvatar from '../ui/ProfileAvatar';

interface CommentInputFormProps {
  contentId: string;
  contentType: ContentType;
  className?: string;
}

/**
 * Standalone Comment Input Form Component
 * Used in VideoComments modal to show form before comments list
 */
const CommentInputForm: React.FC<CommentInputFormProps> = ({
  contentId,
  contentType,
  className = ''
}) => {
  const { currentUser, isGuest } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);

  // Load user profile from Firestore
  useEffect(() => {
    if (currentUser && !isGuest()) {
      userService
        .getUserProfile(currentUser.uid)
        .then(profile => {
          setUserProfile(profile);
        })
        .catch(() => {
          setUserProfile(null);
        });
    }
  }, [currentUser, isGuest]);

  // Handle comment submission
  const handleSubmitComment = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser || !newComment.trim() || submitting) return;

    if (isGuest()) {
      setError('Please sign in to comment');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const displayName = userProfile?.displayName || currentUser.displayName || 'Anonymous User';
      const photoURL = userProfile?.photoURL || currentUser.photoURL || null;

      await CommentService.addComment(contentId, contentType, {
        text: newComment.trim(),
        userId: currentUser.uid,
        userDisplayName: displayName,
        userPhotoURL: photoURL
      });

      setNewComment('');
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Error submitting comment:', err);
      setError(err.message || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  }, [currentUser, isGuest, newComment, submitting, contentId, contentType, userProfile]);

  if (!currentUser) {
    return (
      <div className={`comment-login-prompt ${className}`}>
        <p>Sign in to join the conversation</p>
      </div>
    );
  }

  return (
    <div className={`comment-input-form-wrapper ${className}`}>
      {error && (
        <div className="comment-input-error" style={{ color: '#dc3545', fontSize: '12px', marginBottom: '8px' }}>
          {error}
        </div>
      )}
      <form className="comment-input-form" onSubmit={handleSubmitComment}>
        <div className="user-avatar-small-container">
          <ProfileAvatar
            src={userProfile?.photoURL || currentUser.photoURL}
            alt={userProfile?.displayName || currentUser.displayName || 'User'}
            size={36}
            className="user-avatar-small"
          />
        </div>
        <div className="comment-input-wrapper">
          <input
            type="text"
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={submitting}
            maxLength={500}
            className="comment-input"
          />
          <button
            type="submit"
            disabled={!newComment.trim() || submitting}
            className="send-btn"
            title="Send comment"
          >
            {submitting ? (
              <div className="spinner-small" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CommentInputForm;
