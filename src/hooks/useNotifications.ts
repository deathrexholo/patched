import { useState, useEffect, useCallback } from 'react';
import notificationService from '../services/notificationService';
import { User } from '../types/models';

interface UseNotificationsReturn {
  showPrompt: boolean;
  loading: boolean;
  error: string | null;
  enableNotifications: () => Promise<boolean>;
  dismissPrompt: (permanent?: boolean) => void;
  getPermissionStatus: () => NotificationPermission;
  isSupported: () => boolean;
  resetDismissedState: () => void;
  clearError: () => void;
  showPromptManually: () => void;
  wasDismissed: () => boolean;
}

/**
 * Custom hook for handling notification permission and prompt logic
 * Extracts notification-related logic from Home component
 */
export const useNotifications = (currentUser: User | null, isGuest: boolean): UseNotificationsReturn => {
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  /**
   * Check if notification prompt should be shown
   */
  useEffect(() => {
    if (currentUser && !isGuest && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      // Check if user has already dismissed the prompt
      const dismissed = localStorage.getItem('notificationPromptDismissed');
      if (!dismissed) {
        // Show prompt after 3 seconds to let user settle in
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [currentUser, isGuest]);

  /**
   * Enable notifications for the current user
   * @returns {Promise<boolean>} Success status
   */
  const enableNotifications = useCallback(async (): Promise<boolean> => {
    if (!currentUser) {
      setError('User must be logged in to enable notifications');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const success = await notificationService.enableNotifications(currentUser.uid);
      
      if (success) {
        setShowPrompt(false);
        // Clear the dismissed flag since user actively enabled notifications
        localStorage.removeItem('notificationPromptDismissed');
        return true;
      } else {
        setError('Notifications could not be enabled. Please check your browser settings.');
        return false;
      }
    } catch (err: any) {
      setError('Error enabling notifications. Please try again.');
      console.error('Error enabling notifications:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  /**
   * Dismiss the notification prompt
   * @param {boolean} permanent - Whether to permanently dismiss (store in localStorage)
   */
  const dismissPrompt = useCallback((permanent: boolean = true): void => {
    setShowPrompt(false);
    setError(null);
    
    if (permanent) {
      // Don't show again for this session and future sessions
      localStorage.setItem('notificationPromptDismissed', 'true');
    }
  }, []);

  /**
   * Check current notification permission status
   * @returns {string} Permission status ('default', 'granted', 'denied')
   */
  const getPermissionStatus = useCallback((): NotificationPermission => {
    return typeof Notification !== 'undefined' ? Notification.permission : 'default';
  }, []);

  /**
   * Check if notifications are supported by the browser
   * @returns {boolean} Whether notifications are supported
   */
  const isSupported = useCallback((): boolean => {
    return 'Notification' in window;
  }, []);

  /**
   * Reset the dismissed state (useful for testing or admin purposes)
   */
  const resetDismissedState = useCallback((): void => {
    localStorage.removeItem('notificationPromptDismissed');
  }, []);

  /**
   * Clear any existing errors
   */
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  /**
   * Manually show the prompt (useful for settings page)
   */
  const showPromptManually = useCallback((): void => {
    if (currentUser && !isGuest) {
      setShowPrompt(true);
    }
  }, [currentUser, isGuest]);

  /**
   * Check if user has previously dismissed the prompt
   * @returns {boolean} Whether prompt was dismissed
   */
  const wasDismissed = useCallback((): boolean => {
    return localStorage.getItem('notificationPromptDismissed') === 'true';
  }, []);

  return {
    showPrompt,
    loading,
    error,
    enableNotifications,
    dismissPrompt,
    getPermissionStatus,
    isSupported,
    resetDismissedState,
    clearError,
    showPromptManually,
    wasDismissed
  };
};
