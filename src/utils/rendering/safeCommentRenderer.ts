// Ultimate Safe Comment Rendering System
// This module provides bulletproof comment rendering that will NEVER cause React error #31

import { Timestamp } from 'firebase/firestore';

export interface SafeComment {
  id: string;
  text: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL: string;
  timestamp: Timestamp | Date | null;
  likes: unknown[];
  likesCount: number;
  replies: unknown[];
  isValid: boolean;
}

/**
 * Safely converts any value to a string, preventing objects from being rendered
 * @param value - The value to convert
 * @param fallback - Fallback string if conversion fails
 * @returns Always returns a safe string
 */
export const safenizeString = (value: unknown, fallback = ''): string => {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return fallback;
  }
  
  // If it's already a string, return it
  if (typeof value === 'string') {
    return value;
  }
  
  // Handle numbers and booleans
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  
  // NEVER allow objects to be rendered - this prevents React error #31
  if (typeof value === 'object') {
    console.warn('🚨 OBJECT BLOCKED FROM RENDER:', value);
    console.warn('🚨 Using fallback string instead:', fallback);
    return fallback;
  }
  
  // For any other type, convert to string safely
  try {
    return String(value);
  } catch (error) {
    console.error('🚨 String conversion failed:', error);
    return fallback;
  }
};

/**
 * Ultra-safe comment data extraction with multiple validation layers
 * @param comment - Raw comment data from Firebase
 * @returns Always returns a safe comment object with string fields
 */
export const ultraSafeCommentData = (comment: unknown): SafeComment => {
  // console.log('🔍 Processing comment data:', comment); // Disabled to prevent performance issues
  
  // First layer: Handle non-objects
  if (!comment || typeof comment !== 'object') {
    console.warn('⚠️ Invalid comment data, using defaults');
    return {
      id: safenizeString('unknown-' + Date.now()),
      text: safenizeString(''),
      userId: safenizeString(''),
      userDisplayName: safenizeString('Unknown User'),
      userPhotoURL: safenizeString(''),
      timestamp: null,
      likes: [],
      likesCount: 0,
      replies: [],
      isValid: false
    };
  }
  
  // Second layer: Extract and sanitize each field
  const commentObj = comment as Record<string, unknown>;
  const safeComment: SafeComment = {
    id: safenizeString(commentObj.id || commentObj._id, 'comment-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)),
    text: safenizeString(commentObj.text, ''),
    userId: safenizeString(commentObj.userId, ''),
    userDisplayName: safenizeString(commentObj.userDisplayName, 'Unknown User'),
    userPhotoURL: safenizeString(commentObj.userPhotoURL, ''),
    timestamp: (commentObj.timestamp as Timestamp | Date) || null,
    likes: Array.isArray(commentObj.likes) ? commentObj.likes : [],
    likesCount: typeof commentObj.likesCount === 'number' ? commentObj.likesCount : (Array.isArray(commentObj.likes) ? commentObj.likes.length : 0),
    replies: Array.isArray(commentObj.replies) ? commentObj.replies : [],
    isValid: true
  };
  
  // Third layer: Final validation - ensure string fields are safe strings (skip arrays and numbers)
  (Object.keys(safeComment) as Array<keyof SafeComment>).forEach(key => {
    // Skip timestamp, isValid, likes, likesCount, and replies - these can be objects/arrays/numbers
    if (key !== 'timestamp' && key !== 'isValid' && key !== 'likes' && key !== 'likesCount' && key !== 'replies') {
      const value = safeComment[key];
      if (typeof value === 'object' && value !== null) {
        console.error(`🚨 CRITICAL: Object found in ${key}:`, value);
        (safeComment as any)[key] = safenizeString('', 'Safe Value');
      }
    }
  });
  
  // console.log('✅ Safe comment processed:', safeComment); // Disabled to prevent performance issues
  return safeComment;
};

/**
 * Safe timestamp formatter that never returns objects
 * @param timestamp - Firebase timestamp or Date
 * @returns Always returns a safe string representation
 */
export const safeFormatTimestamp = (timestamp: Timestamp | Date | string | number | null | undefined): string => {
  if (!timestamp) return 'now';
  
  try {
    // Handle Firebase timestamp
    if (timestamp && typeof (timestamp as any).toDate === 'function') {
      return (timestamp as any).toDate().toLocaleDateString();
    }
    
    // Handle Date object
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString();
    }
    
    // Handle string/number timestamps
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      return new Date(timestamp).toLocaleDateString();
    }
    
    // Fallback for any other type
    return 'now';
  } catch (error) {
    console.warn('⚠️ Timestamp formatting failed:', error);
    return 'now';
  }
};

/**
 * Validates that a comment array is safe for rendering
 * @param comments - Array of comments to validate
 * @returns Array of safe comment objects
 */
export const validateCommentsArray = (comments: unknown): SafeComment[] => {
  if (!Array.isArray(comments)) {
    console.warn('⚠️ Comments is not an array:', comments);
    return [];
  }
  
  return comments
    .map(comment => ultraSafeCommentData(comment))
    .filter(comment => comment.isValid);
};

/**
 * Emergency fallback component data for when everything fails
 */
export const getEmergencyComment = (): SafeComment => ({
  id: 'emergency-' + Date.now(),
  text: '[Comment could not be loaded safely]',
  userId: '',
  userDisplayName: 'System',
  userPhotoURL: '',
  timestamp: null,
  likes: [],
  likesCount: 0,
  replies: [],
  isValid: true
});

/**
 * Debug function to check if any comment data contains objects
 * @param comments - Comments to debug
 * @param location - Location identifier for debugging
 */
export const debugCommentData = (comments: unknown, location = 'unknown'): void => {
  if (!Array.isArray(comments)) return;
  
  comments.forEach((comment, index) => {
    if (typeof comment === 'object' && comment !== null) {
      Object.keys(comment).forEach(key => {
        const value = comment[key];
        if (typeof value === 'object' && value !== null && key !== 'timestamp') {
          console.error(`🚨 OBJECT DETECTED in comment[${index}].${key} at ${location}:`, value);
        }
      });
    }
  });
};