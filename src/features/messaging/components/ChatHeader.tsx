import React from 'react';
import { ArrowLeft, MoreVertical, Phone, Video, Circle } from 'lucide-react';
import ProfileAvatar from '../../../components/common/ui/ProfileAvatar';
import '../styles/ChatHeader.css';

interface Friend {
  id: string;
  displayName?: string;
  photoURL?: string;
  friendshipId: string;
  isOnline?: boolean;
}

interface ChatHeaderProps {
  friend: Friend;
  onBack: () => void;
  onMoreOptions?: () => void;
  onCall?: () => void;
  onVideoCall?: () => void;
}

export default function ChatHeader({ 
  friend, 
  onBack, 
  onMoreOptions, 
  onCall, 
  onVideoCall 
}: ChatHeaderProps) {
  return (
    <div className="chat-header-enhanced">
      <div className="chat-header-left">
        <button 
          className="back-btn-enhanced" 
          onClick={onBack}
          aria-label="Go back to friends list"
        >
          <ArrowLeft size={20} />
        </button>
        
        <div className="chat-user-info">
          <div className="chat-avatar-container">
            <ProfileAvatar
              src={friend.photoURL}
              alt={friend.displayName || 'Anonymous User'}
              size={48}
              className="chat-avatar"
            />
            {friend.isOnline && (
              <div className="chat-online-indicator" aria-label="Online">
                <Circle size={6} fill="currentColor" />
              </div>
            )}
          </div>
          
          <div className="chat-user-details">
            <h3 className="chat-user-name">
              {friend.displayName || 'Anonymous User'}
            </h3>
            <div className="chat-user-status">
              {friend.isOnline ? (
                <span className="status-online">
                  <Circle size={4} fill="currentColor" />
                  Online
                </span>
              ) : (
                <span className="status-offline">Last seen recently</span>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="chat-header-actions">
        {onCall && (
          <button 
            className="header-action-btn" 
            onClick={onCall}
            aria-label="Voice call"
            title="Voice call"
          >
            <Phone size={18} />
          </button>
        )}
        
        {onVideoCall && (
          <button 
            className="header-action-btn" 
            onClick={onVideoCall}
            aria-label="Video call"
            title="Video call"
          >
            <Video size={18} />
          </button>
        )}
        
        {onMoreOptions && (
          <button 
            className="header-action-btn" 
            onClick={onMoreOptions}
            aria-label="More options"
            title="More options"
          >
            <MoreVertical size={18} />
          </button>
        )}
      </div>
    </div>
  );
}