import { useState } from 'react';
import { Check, X, HelpCircle } from 'lucide-react';
import { ParticipationType } from '../../types/models/event';
import participationService from '../../services/api/participationService';

interface ParticipationButtonProps {
  eventId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  initialType?: ParticipationType | null;
  onParticipationChange?: (type: ParticipationType | null) => void;
  className?: string;
}

export const ParticipationButton: React.FC<ParticipationButtonProps> = ({
  eventId,
  userId,
  userName,
  userAvatar,
  initialType = null,
  onParticipationChange,
  className = ''
}) => {
  const [participationType, setParticipationType] = useState<ParticipationType | null>(initialType);
  const [loading, setLoading] = useState<boolean>(false);
  const [showOptions, setShowOptions] = useState<boolean>(false);

  const handleParticipate = async (type: ParticipationType) => {
    if (loading) return;

    try {
      setLoading(true);

      // If clicking the same type, remove participation
      if (participationType === type) {
        await participationService.leaveEvent(eventId, userId);
        setParticipationType(null);
        if (onParticipationChange) onParticipationChange(null);
      } else {
        // Otherwise, set or update participation
        await participationService.joinEvent(eventId, userId, userName, type, userAvatar);
        setParticipationType(type);
        if (onParticipationChange) onParticipationChange(type);
      }

      setShowOptions(false);
    } catch (error) {
      console.error('Error updating participation:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActiveButton = () => {
    if (!participationType) {
      return (
        <button
          className="participation-btn participation-btn-default"
          onClick={() => setShowOptions(!showOptions)}
          disabled={loading}
        >
          {loading ? 'Updating...' : 'Participate'}
        </button>
      );
    }

    const configs = {
      going: {
        label: 'Going',
        className: 'participation-btn-going',
        icon: <Check size={16} />
      },
      interested: {
        label: 'Interested',
        className: 'participation-btn-interested',
        icon: <StarIcon size={16} />
      },
      maybe: {
        label: 'Maybe',
        className: 'participation-btn-maybe',
        icon: <HelpCircle size={16} />
      }
    };

    const config = configs[participationType];

    return (
      <button
        className={`participation-btn participation-btn-active ${config.className}`}
        onClick={() => setShowOptions(!showOptions)}
        disabled={loading}
      >
        {config.icon}
        {config.label}
      </button>
    );
  };

  return (
    <div className={`participation-button-container ${className}`}>
      {getActiveButton()}

      {showOptions && (
        <div className="participation-options">
          <button
            className={`participation-option ${participationType === 'going' ? 'active' : ''}`}
            onClick={() => handleParticipate('going')}
            disabled={loading}
          >
            <Check size={16} />
            Going
          </button>
          <button
            className={`participation-option ${participationType === 'interested' ? 'active' : ''}`}
            onClick={() => handleParticipate('interested')}
            disabled={loading}
          >
            <StarIcon size={16} />
            Interested
          </button>
          <button
            className={`participation-option ${participationType === 'maybe' ? 'active' : ''}`}
            onClick={() => handleParticipate('maybe')}
            disabled={loading}
          >
            <HelpCircle size={16} />
            Maybe
          </button>
          {participationType && (
            <button
              className="participation-option participation-option-remove"
              onClick={() => handleParticipate(participationType)}
              disabled={loading}
            >
              <X size={16} />
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Star icon component
const StarIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

export default ParticipationButton;
