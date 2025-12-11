/**
 * Profile Navigation Utilities
 * 
 * Centralized utilities for navigating to user profiles throughout the app.
 */

import { NavigateFunction } from 'react-router-dom';

/**
 * Navigate to a user's profile page
 * @param navigate - React Router navigate function
 * @param userId - The ID of the user whose profile to view
 * @param currentUserId - The current user's ID (optional, for optimization)
 */
export const navigateToProfile = (
  navigate: NavigateFunction, 
  userId: string, 
  currentUserId?: string
): void => {
  if (!userId) {
    console.warn('Cannot navigate to profile: userId is required');
    return;
  }

  // If viewing own profile, use the simpler route
  if (currentUserId && userId === currentUserId) {
    navigate('/profile');
  } else {
    // Navigate to another user's profile
    navigate(`/profile/${userId}`);
  }
};

/**
 * Get the profile URL for a user
 * @param userId - The ID of the user
 * @param currentUserId - The current user's ID (optional, for optimization)
 * @returns The profile URL path
 */
export const getProfileUrl = (userId: string, currentUserId?: string): string => {
  if (!userId) {
    return '/profile';
  }

  // If viewing own profile, use the simpler route
  if (currentUserId && userId === currentUserId) {
    return '/profile';
  } else {
    // Return another user's profile URL
    return `/profile/${userId}`;
  }
};

/**
 * Check if a profile URL is for the current user
 * @param userId - The user ID from the URL params
 * @param currentUserId - The current user's ID
 * @returns True if it's the current user's profile
 */
export const isOwnProfile = (userId: string | undefined, currentUserId: string | undefined): boolean => {
  // If no userId in URL, it's the current user's profile
  if (!userId) return true;
  
  // If no current user, it's not their profile
  if (!currentUserId) return false;
  
  // Compare the IDs
  return userId === currentUserId;
};