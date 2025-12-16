import { Timestamp } from 'firebase/firestore';

/**
 * Announcement - Global announcement created by admins
 * Displayed to all users in notification dropdown
 */
export interface Announcement {
  id: string;
  title: string;                    // Max 100 characters
  message: string;                  // Max 500 characters
  createdAt: Timestamp | Date;      // When announcement was created
  expiresAt: Timestamp | Date;      // When announcement expires
  createdBy: string;                // Admin UID who created it
  createdByName: string;            // Admin display name
  isActive: boolean;                // Active/inactive toggle
  priority?: 'low' | 'normal' | 'high';  // Priority level (for future sorting)
  actionUrl?: string;               // Optional link for "Learn More" button
  dismissible?: boolean;            // Can users dismiss this? (for future enhancement)
}

/**
 * Data structure for creating a new announcement
 */
export interface CreateAnnouncementData {
  title: string;
  message: string;
  expiresAt: Date;
  actionUrl?: string;
  priority?: 'low' | 'normal' | 'high';
}
