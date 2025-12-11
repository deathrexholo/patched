import React, { memo } from 'react';

export interface AvatarBadgeProps {
  type?: 'medal' | 'status' | 'custom';
  medal?: '🥇' | '🥈' | '🥉' | '⭐';
  status?: 'online' | 'offline' | 'away';
  children?: React.ReactNode;
  className?: string;
}

const statusEmojis = {
  online: '🟢',
  offline: '⚫',
  away: '🟡'
};

/**
 * Avatar Badge Component - for medals, status indicators, and custom badges
 */
const AvatarBadge: React.FC<AvatarBadgeProps> = memo(function AvatarBadge({
  type = 'custom',
  medal,
  status,
  children,
  className = ''
}) {
  if (type === 'medal' && medal) {
    return <span className={`avatar-badge avatar-badge--medal ${className}`}>{medal}</span>;
  }

  if (type === 'status' && status) {
    return (
      <span
        className={`avatar-badge avatar-badge--status avatar-badge--${status} ${className}`}
        title={status}
      >
        {statusEmojis[status]}
      </span>
    );
  }

  return <span className={`avatar-badge ${className}`}>{children}</span>;
});

export default AvatarBadge;
