import React, { useState, useEffect } from 'react';
import { MessageCircle, Circle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { navigateToProfile } from '../../../utils/navigation/profileNavigation';
import ProfileAvatar from '../../../components/common/ui/ProfileAvatar';
import '../styles/FriendsList.css';

interface Friend {
  id: string;
  displayName?: string;
  photoURL?: string;
  friendshipId: string;
  isOnline?: boolean;
}

interface FriendsListProps {
  friends: Friend[];
  onSelectFriend: (friend: Friend) => void;
  loading?: boolean;
}

// Stagger delay in milliseconds between loading each avatar to avoid 429 rate limits
const AVATAR_STAGGER_DELAY = 100;

export default function FriendsList({ friends, onSelectFriend, loading }: FriendsListProps) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loadedFriendIds, setLoadedFriendIds] = useState<Set<string>>(new Set());

  // Stagger avatar loading to prevent simultaneous requests to Google CDN
  useEffect(() => {
    if (friends.length === 0) return;

    // Load first avatar immediately
    setLoadedFriendIds(new Set([friends[0].id]));

    // Load remaining avatars with staggered delays
    const timeouts: NodeJS.Timeout[] = [];
    friends.slice(1).forEach((friend, index) => {
      const delay = (index + 1) * AVATAR_STAGGER_DELAY;
      const timeoutId = setTimeout(() => {
        setLoadedFriendIds(prev => new Set(prev).add(friend.id));
      }, delay);
      timeouts.push(timeoutId);
    });

    // Cleanup timeouts on unmount or when friends change
    return () => {
      timeouts.forEach(id => clearTimeout(id));
    };
  }, [friends]);

  const handleProfileClick = (e: React.MouseEvent, friendId: string) => {
    e.stopPropagation(); // Prevent triggering the chat selection
    navigateToProfile(navigate, friendId, currentUser?.uid);
  };
  if (loading) {
    return (
      <div className="friends-list-container">
        <div className="friends-list-loading">
          <div className="loading-skeleton">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="friend-card-skeleton">
                <div className="friend-avatar-skeleton" />
                <div className="friend-info-skeleton">
                  <div className="friend-name-skeleton" />
                  <div className="friend-status-skeleton" />
                </div>
                <div className="friend-action-skeleton" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="friends-list-container">
        <div className="friends-empty-state">
          <MessageCircle size={48} className="empty-icon" />
          <h3>No Friends Yet</h3>
          <p>Accept friend requests to start chatting!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="friends-list-container">
      <div className="friends-list-header">
        <h3>Friends ({friends.length})</h3>
        <p>Tap a friend to start chatting</p>
      </div>
      
      <div className="friends-list-grid">
        {friends.map((friend) => {
          // Only load avatar if this friend is in the staggered loading queue
          const shouldLoadAvatar = loadedFriendIds.has(friend.id);

          return (
          <div
            key={friend.id}
            className="friend-card-enhanced"
            onClick={() => onSelectFriend(friend)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectFriend(friend);
              }
            }}
            title="Open chat"
            aria-label={`Start chat with ${friend.displayName || 'Anonymous User'}`}
          >
            <div
              className="friend-avatar-container"
              onClick={(e) => {
                e.stopPropagation();
                handleProfileClick(e, friend.id);
              }}
              role="button"
              tabIndex={-1}
              title="View profile"
              aria-label={`View ${friend.displayName || 'user'}'s profile`}
            >
              <ProfileAvatar
                src={shouldLoadAvatar ? friend.photoURL : undefined}
                alt={friend.displayName || 'Anonymous User'}
                size={48}
                className="friend-avatar"
              />
              {friend.isOnline && (
                <div className="online-status-indicator" aria-label="Online">
                  <Circle size={8} fill="currentColor" />
                </div>
              )}
            </div>
            
            <div className="friend-info-enhanced">
              <div className="friend-name">
                {friend.displayName || 'Anonymous User'}
              </div>
              <div
                className="friend-status"
                onClick={() => onSelectFriend(friend)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectFriend(friend);
                  }
                }}
                title="Open chat"
                aria-label={`Start chat with ${friend.displayName || 'Anonymous User'}`}
              >
                {friend.isOnline ? (
                  <span className="status-online">
                    <Circle size={6} fill="currentColor" />
                    Online
                  </span>
                ) : (
                  <span className="status-offline">Offline</span>
                )}
              </div>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}