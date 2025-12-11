import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { navigateToProfile } from '../../../utils/navigation/profileNavigation';
import './UserAvatar.css';

interface UserAvatarProps {
  userId: string;
  displayName?: string;
  photoURL?: string;
  size?: 'small' | 'medium' | 'large';
  clickable?: boolean;
  showName?: boolean;
  className?: string;
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  userId,
  displayName,
  photoURL,
  size = 'medium',
  clickable = true,
  showName = false,
  className = ''
}) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const handleClick = () => {
    if (clickable && userId) {
      navigateToProfile(navigate, userId, currentUser?.uid);
    }
  };

  const avatarClasses = [
    'user-avatar',
    `user-avatar--${size}`,
    clickable ? 'user-avatar--clickable' : '',
    className
  ].filter(Boolean).join(' ');

  const initials = displayName 
    ? displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div className={avatarClasses} onClick={handleClick}>
      <div className="user-avatar__image">
        {photoURL ? (
          <img 
            src={photoURL} 
            alt={`${displayName || 'User'}'s avatar`}
            onError={(e) => {
              // Fallback to initials if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        ) : (
          <div className="user-avatar__initials" aria-label={`${displayName || 'User'}'s avatar`}>
            {initials}
          </div>
        )}
      </div>
      {showName && displayName && (
        <span className="user-avatar__name">{displayName}</span>
      )}
    </div>
  );
};

export default UserAvatar;