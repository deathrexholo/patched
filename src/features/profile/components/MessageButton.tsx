import React, { useState, useEffect } from 'react';
import { MessageSquare, Link2, Loader, UserPlus, UserCheck, X } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import userService from '../../../services/api/userService';
import { useFriendRequest } from '../../../hooks/useFriendRequest';

interface MessageButtonProps {
  targetUserId: string;
  targetUserName: string;
  targetUserRole?: string;
  currentUserRole: string;
  connectionStatus: 'connected' | 'pending' | 'none';
  onConnectionRequest?: () => void;
  onOpenChat?: () => void;
}

/**
 * MessageButton Component
 * Displays the appropriate action button based on user roles and connection status
 * - For org→athlete or athlete→org: "Send Connection Request"
 * - For athlete→athlete friends: "Message"
 * - For approved connections: "Open Chat"
 */
const MessageButton: React.FC<MessageButtonProps> = ({
  targetUserId,
  targetUserName,
  targetUserRole = 'athlete',
  currentUserRole,
  connectionStatus,
  onConnectionRequest,
  onOpenChat
}) => {
  const { currentUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  // Use the unified friend request hook
  const { requestState, sendRequest, cancelRequest, acceptRequest } = useFriendRequest({
    currentUserId: currentUser?.uid || '',
    currentUserName: currentUser?.displayName || 'Unknown User',
    currentUserRole: currentUserRole,
    currentUserPhoto: currentUser?.photoURL || '',
    targetUserId: targetUserId,
    targetUserName: targetUserName,
    targetUserRole: targetUserRole,
    targetUserPhoto: '',
    onSuccess: (message) => {
      setError(null);
      if (onConnectionRequest) {
        onConnectionRequest();
      }
    },
    onError: (message) => {
      setError(message);
    }
  });

  // If accepted/connected: Show message/chat button
  if (requestState.status === 'accepted') {
    return (
      <button
        className="profile-action-btn message-btn"
        onClick={onOpenChat}
        disabled={requestState.loading}
        title="Message this user"
      >
        <MessageSquare size={18} />
        {currentUserRole === 'organization' || targetUserRole === 'organization' ? 'Open Chat' : 'Message'}
      </button>
    );
  }

  // If pending (sent by current user): Show "Request Pending" with cancel functionality
  if (requestState.status === 'pending_sent') {
    return (
      <>
        <button
          className="profile-action-btn pending-btn"
          onClick={cancelRequest}
          disabled={requestState.loading}
          title="Click to cancel your request"
        >
          <Loader size={18} className="spinning" />
          Request Pending
        </button>
        {error && <div className="message-btn-error">{error}</div>}
      </>
    );
  }

  // If pending (received from target user): Show "Accept Request"
  if (requestState.status === 'pending_received') {
    return (
      <>
        <button
          className="profile-action-btn accept-btn"
          onClick={acceptRequest}
          disabled={requestState.loading}
          title="Accept friend request"
        >
          <UserCheck size={18} />
          Accept Request
        </button>
        {error && <div className="message-btn-error">{error}</div>}
      </>
    );
  }

  // If loading status check
  if (requestState.status === 'loading') {
    return (
      <button
        className="profile-action-btn pending-btn"
        disabled={true}
        title="Checking connection status..."
      >
        <Loader size={18} className="spinning" />
        Loading...
      </button>
    );
  }

  // Default (no connection): Show "Send Request" button
  return (
    <>
      <button
        className="profile-action-btn connect-btn"
        onClick={sendRequest}
        disabled={requestState.loading}
        title={
          currentUserRole === 'organization' || targetUserRole === 'organization'
            ? 'Send connection request'
            : 'Send friend request'
        }
      >
        {requestState.loading ? (
          <>
            <Loader size={18} className="spinning" />
            Sending...
          </>
        ) : (
          <>
            <Link2 size={18} />
            {currentUserRole === 'organization' || targetUserRole === 'organization'
              ? 'Send Connection Request'
              : 'Send Friend Request'}
          </>
        )}
      </button>
      {error && <div className="message-btn-error">{error}</div>}
    </>
  );
};

export default MessageButton;
