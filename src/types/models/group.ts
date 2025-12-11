import { Timestamp } from 'firebase/firestore';

/**
 * Group privacy settings
 */
export type GroupPrivacy = 'public' | 'private' | 'secret';

/**
 * Group posting permissions
 */
export type GroupPostingPermissions = 'all' | 'admins' | 'approved';

/**
 * Core Group interface
 */
export interface Group {
  id: string;
  name: string;
  description: string;
  photoURL: string;
  privacy: GroupPrivacy;
  memberCount: number;
  admins: string[];
  isAdmin: boolean;
  postingPermissions: GroupPostingPermissions;
  createdAt: Timestamp | Date | string;
  updatedAt: Timestamp | Date | string;
}

/**
 * Detailed group information
 */
export interface GroupDetails extends Group {
  members: string[];
}

/**
 * Data for creating a new group
 */
export interface CreateGroupData {
  name: string;
  description?: string;
  photoURL?: string;
  privacy?: GroupPrivacy;
  postingPermissions?: GroupPostingPermissions;
  admins?: string[];
  members?: string[];
}

/**
 * Data for updating a group
 */
export interface UpdateGroupData {
  name?: string;
  description?: string;
  photoURL?: string;
  privacy?: GroupPrivacy;
  postingPermissions?: GroupPostingPermissions;
}

/**
 * Group search options
 */
export interface GroupSearchOptions {
  skipCache?: boolean;
  includePrivate?: boolean;
}

/**
 * Group member
 */
export interface GroupMember {
  userId: string;
  displayName: string;
  photoURL: string;
  isAdmin: boolean;
  joinedAt: Timestamp | Date | string;
}
