import { Trophy, Heart, Building2, Clipboard } from 'lucide-react';
import { ComponentType } from 'react';

/**
 * User role types available in the system
 */
export type UserRole = 'athlete' | 'parent' | 'organization' | 'coach';

/**
 * Role configuration interface defining visual and descriptive properties
 */
export interface RoleConfig {
  id: UserRole;
  label: string;
  description: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  colors: {
    light: {
      background: string;
      text: string;
      border: string;
    };
    dark: {
      background: string;
      text: string;
      border: string;
    };
  };
}

/**
 * Complete role configurations for all user types
 */
export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  athlete: {
    id: 'athlete',
    label: 'Player',
    description: 'Compete, train, and share your athletic journey',
    icon: Trophy,
    colors: {
      light: {
        background: '#dbeafe',
        text: '#1e40af',
        border: '#3b82f6',
      },
      dark: {
        background: '#1e3a8a',
        text: '#bfdbfe',
        border: '#3b82f6',
      },
    },
  },
  parent: {
    id: 'parent',
    label: 'Parent',
    description: 'Support and follow your athlete\'s progress',
    icon: Heart,
    colors: {
      light: {
        background: '#fed7aa',
        text: '#9a3412',
        border: '#f97316',
      },
      dark: {
        background: '#7c2d12',
        text: '#fed7aa',
        border: '#f97316',
      },
    },
  },
  organization: {
    id: 'organization',
    label: 'Organization',
    description: 'Manage teams, events, and athletic programs',
    icon: Building2,
    colors: {
      light: {
        background: '#e9d5ff',
        text: '#6b21a8',
        border: '#a855f7',
      },
      dark: {
        background: '#581c87',
        text: '#e9d5ff',
        border: '#a855f7',
      },
    },
  },
  coach: {
    id: 'coach',
    label: 'Coach',
    description: 'Train, mentor, and guide athletes to success',
    icon: Clipboard,
    colors: {
      light: {
        background: '#d1fae5',
        text: '#065f46',
        border: '#10b981',
      },
      dark: {
        background: '#064e3b',
        text: '#d1fae5',
        border: '#10b981',
      },
    },
  },
};

/**
 * Helper function to get role configuration by role ID
 * @param role - The user role to get configuration for
 * @returns Role configuration or undefined if role is invalid
 */
export const getRoleConfig = (role: UserRole | null | undefined): RoleConfig | undefined => {
  if (!role) return undefined;
  return ROLE_CONFIGS[role];
};

/**
 * Helper function to check if a string is a valid user role
 * @param role - The string to validate
 * @returns True if the string is a valid UserRole
 */
export const isValidRole = (role: string | null | undefined): role is UserRole => {
  if (!role) return false;
  return ['athlete', 'parent', 'organization', 'coach'].includes(role);
};
