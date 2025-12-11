import React from 'react';
import { SportPositionPair } from '../types/MultiSportProfile';
import '../styles/ProfileSportTags.css';

interface ProfileSportTagsProps {
  sportPositions: SportPositionPair[];
  maxVisible?: number;
  showPrimaryBadge?: boolean;
  size?: 'small' | 'medium' | 'large';
  layout?: 'horizontal' | 'vertical';
}

const ProfileSportTags: React.FC<ProfileSportTagsProps> = ({
  sportPositions,
  maxVisible = 3,
  showPrimaryBadge = true,
  size = 'medium',
  layout = 'horizontal'
}) => {
  if (!sportPositions || sportPositions.length === 0) {
    return null;
  }

  // Sort by primary first, then alphabetically
  const sortedSportPositions = [...sportPositions].sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return a.sport.name.localeCompare(b.sport.name);
  });

  const visibleSports = sortedSportPositions.slice(0, maxVisible);
  const hiddenCount = Math.max(0, sportPositions.length - maxVisible);

  const formatSportPosition = (sp: SportPositionPair): string => {
    return `${sp.sport.name} ${sp.position.name}`;
  };

  return (
    <div className={`profile-sport-tags ${layout} ${size}`}>
      {visibleSports.map((sp, index) => (
        <div 
          key={`${sp.sport.id}-${sp.position.id}`}
          className={`sport-tag ${sp.isPrimary ? 'primary' : 'secondary'}`}
          title={formatSportPosition(sp)}
        >
          <span className="sport-position-text">
            {formatSportPosition(sp)}
          </span>
          {showPrimaryBadge && sp.isPrimary && (
            <span className="primary-indicator">★</span>
          )}
        </div>
      ))}
      
      {hiddenCount > 0 && (
        <div className="sport-tag overflow" title={`+${hiddenCount} more sports`}>
          +{hiddenCount}
        </div>
      )}
    </div>
  );
};

export default ProfileSportTags;

// Helper component for profile headers
export const ProfileHeader: React.FC<{
  name: string;
  sportPositions: SportPositionPair[];
  avatar?: string;
}> = ({ name, sportPositions, avatar }) => {
  const primarySport = sportPositions.find(sp => sp.isPrimary);
  
  return (
    <div className="profile-header-with-sports">
      <div className="profile-basic-info">
        {avatar && (
          <img src={avatar} alt={name} className="profile-avatar" />
        )}
        <div className="profile-text">
          <h2 className="profile-name">{name}</h2>
          {primarySport && (
            <p className="primary-sport-subtitle">
              {primarySport.sport.name} {primarySport.position.name}
            </p>
          )}
        </div>
      </div>
      
      <ProfileSportTags 
        sportPositions={sportPositions}
        maxVisible={2}
        size="small"
        layout="horizontal"
      />
    </div>
  );
};