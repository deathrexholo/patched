import { Timestamp } from 'firebase/firestore';

/**
 * Event submission status
 */
export type SubmissionStatus = 'draft' | 'submitted';

/**
 * Event submission with video
 */
export interface EventSubmission {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  videoUrl: string;
  thumbnail?: string;
  title: string;
  description?: string;
  uploadedAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  status: SubmissionStatus;
  rank?: 1 | 2 | 3 | 4 | 5;
  prize?: string;
  scores?: {
    time?: number;
    quality?: number;
    difficulty?: number;
  };
}

/**
 * Data for creating a submission
 */
export interface CreateSubmissionData {
  eventId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  videoUrl: string;
  thumbnail?: string;
  title: string;
  description?: string;
  status: SubmissionStatus;
}

/**
 * Data for updating a submission
 */
export interface UpdateSubmissionData {
  videoUrl?: string;
  thumbnail?: string;
  title?: string;
  description?: string;
  status?: SubmissionStatus;
  rank?: 1 | 2 | 3 | 4 | 5;
  prize?: string;
  scores?: {
    time?: number;
    quality?: number;
    difficulty?: number;
  };
}
