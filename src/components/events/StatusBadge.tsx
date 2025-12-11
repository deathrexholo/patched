import { EventStatus, EventType } from '../../types/models/event';
import { Trophy, Users, Star, Calendar } from 'lucide-react';

interface StatusBadgeProps {
  type: EventStatus | EventType | 'trending' | 'official';
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  type,
  size = 'medium',
  showIcon = false,
  className = ''
}) => {
  const getBadgeConfig = () => {
    switch (type) {
      case 'upcoming':
        return {
          label: 'UPCOMING',
          className: 'status-badge-upcoming',
          icon: <Calendar size={14} />
        };
      case 'live':
        return {
          label: 'LIVE',
          className: 'status-badge-live',
          icon: <div className="live-dot-small"></div>
        };
      case 'completed':
        return {
          label: 'COMPLETED',
          className: 'status-badge-completed',
          icon: <Trophy size={14} />
        };
      case 'trending':
        return {
          label: 'TRENDING',
          className: 'status-badge-trending',
          icon: '🔥'
        };
      case 'official':
        return {
          label: 'OFFICIAL',
          className: 'status-badge-official',
          icon: <Star size={14} />
        };
      case 'talent_hunt':
        return {
          label: 'TALENT HUNT',
          className: 'status-badge-talent-hunt',
          icon: <Star size={14} />
        };
      case 'community':
        return {
          label: 'COMMUNITY',
          className: 'status-badge-community',
          icon: <Users size={14} />
        };
      case 'tournament':
        return {
          label: 'TOURNAMENT',
          className: 'status-badge-tournament',
          icon: <Trophy size={14} />
        };
      default:
        return {
          label: 'EVENT',
          className: 'status-badge-default',
          icon: <Calendar size={14} />
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <div className={`status-badge status-badge-${size} ${config.className} ${className}`}>
      {showIcon && (
        <span className="status-badge-icon">
          {config.icon}
        </span>
      )}
      <span className="status-badge-label">{config.label}</span>
    </div>
  );
};

export default StatusBadge;
