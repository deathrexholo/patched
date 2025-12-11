/**
 * Sharing-related constants
 */

export type ShareType = 'public' | 'private' | 'friends' | 'custom';
export type PrivacyLevel = 'public' | 'private' | 'restricted';

export const SHARE_TYPES = {
  PUBLIC: 'public' as ShareType,
  PRIVATE: 'private' as ShareType,
  FRIENDS: 'friends' as ShareType,
  CUSTOM: 'custom' as ShareType
} as const;

export const PRIVACY_LEVELS = {
  PUBLIC: 'public' as PrivacyLevel,
  PRIVATE: 'private' as PrivacyLevel,
  RESTRICTED: 'restricted' as PrivacyLevel
} as const;

export const SHARING_PERMISSIONS = {
  VIEW: 'view',
  EDIT: 'edit',
  SHARE: 'share',
  DELETE: 'delete'
} as const;

export const DEFAULT_SHARING_SETTINGS = {
  shareType: SHARE_TYPES.PRIVATE,
  privacyLevel: PRIVACY_LEVELS.PRIVATE,
  allowComments: false,
  allowDownload: false,
  expiresAt: null
} as const;