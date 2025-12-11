import { useState, useEffect } from 'react';
import { Users, Check, HelpCircle } from 'lucide-react';
import participationService, { ParticipationCounts } from '../../services/api/participationService';

interface ParticipantCounterProps {
  eventId: string;
  showBreakdown?: boolean;
  className?: string;
}

export const ParticipantCounter: React.FC<ParticipantCounterProps> = ({
  eventId,
  showBreakdown = false,
  className = ''
}) => {
  const [counts, setCounts] = useState<ParticipationCounts>({
    going: 0,
    interested: 0,
    maybe: 0,
    total: 0
  });
  const [loading, setLoading] = useState<boolean>(true);

  const loadCounts = async () => {
    try {
      setLoading(true);
      const participationCounts = await participationService.getParticipationCounts(eventId);
      setCounts(participationCounts);
    } catch (error) {
      console.error('Error loading participation counts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load counts immediately
    loadCounts();

    // Set up interval to refresh every 30 seconds
    const intervalId = setInterval(() => {
      loadCounts();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [eventId]);

  if (loading) {
    return (
      <div className={`participant-counter participant-counter-loading ${className}`}>
        <Users size={16} />
        <span>Loading...</span>
      </div>
    );
  }

  if (!showBreakdown) {
    return (
      <div className={`participant-counter ${className}`}>
        <Users size={16} />
        <span className="participant-count">{counts.total}</span>
        <span className="participant-label">
          {counts.total === 1 ? 'participant' : 'participants'}
        </span>
      </div>
    );
  }

  return (
    <div className={`participant-counter-detailed ${className}`}>
      <div className="participant-counter-header">
        <Users size={18} />
        <span className="participant-total">{counts.total} Participants</span>
      </div>
      <div className="participant-breakdown">
        {counts.going > 0 && (
          <div className="participant-breakdown-item going">
            <Check size={14} />
            <span className="count">{counts.going}</span>
            <span className="label">Going</span>
          </div>
        )}
        {counts.interested > 0 && (
          <div className="participant-breakdown-item interested">
            <StarIcon size={14} />
            <span className="count">{counts.interested}</span>
            <span className="label">Interested</span>
          </div>
        )}
        {counts.maybe > 0 && (
          <div className="participant-breakdown-item maybe">
            <HelpCircle size={14} />
            <span className="count">{counts.maybe}</span>
            <span className="label">Maybe</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Star icon component
const StarIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

export default ParticipantCounter;
