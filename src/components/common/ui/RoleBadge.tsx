import React from 'react';
import { UserRole } from '../../../types/models/user';
import { getRoleConfig } from '../../../constants/roles';
import './RoleBadge.css';

/**
 * Props for the RoleBadge component
 */
export interface RoleBadgeProps {
  /** The user role to display */
  role: UserRole | null | undefined;
  /** Size variant of the badge */
  size?: 'small' | 'medium' | 'large';
  /** Whether to show the role label text */
  showLabel?: boolean;
  /** Additional CSS class names */
  className?: string;
}

/**
 * RoleBadge component displays a visual badge for user roles
 * Returns null if role is invalid or not provided
 */
export const RoleBadge: React.FC<RoleBadgeProps> = ({
  role,
  size = 'medium',
  showLabel = true,
  className = '',
}) => {
  // Get role configuration
  const roleConfig = getRoleConfig(role);

  // Return null for invalid or missing roles
  if (!roleConfig) {
    return null;
  }

  const Icon = roleConfig.icon;
  const iconSizes = {
    small: 14,
    medium: 16,
    large: 20,
  };

  return (
    <div
      className={`role-badge role-badge--${size} role-badge--${roleConfig.id} ${className}`}
      role="img"
      aria-label={`${roleConfig.label} badge`}
    >
      <Icon size={iconSizes[size]} className="role-badge__icon" />
      {showLabel && <span className="role-badge__label">{roleConfig.label}</span>}
    </div>
  );
};

export default RoleBadge;
