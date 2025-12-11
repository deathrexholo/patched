import { useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface UseUnsavedChangesOptions {
  hasUnsavedChanges: boolean;
  message?: string;
  onBeforeUnload?: () => void;
  onNavigateAway?: () => Promise<boolean>;
}

export const useUnsavedChanges = ({
  hasUnsavedChanges,
  message = 'You have unsaved changes. Are you sure you want to leave?',
  onBeforeUnload,
  onNavigateAway
}: UseUnsavedChangesOptions) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = useRef(location.pathname);

  // Handle browser refresh/close
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = message;
        onBeforeUnload?.();
        return message;
      }
    };

    if (hasUnsavedChanges) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, message, onBeforeUnload]);

  // Handle navigation within the app
  useEffect(() => {
    if (location.pathname !== currentPath.current) {
      currentPath.current = location.pathname;
    }
  }, [location.pathname]);

  const confirmNavigation = useCallback(async (): Promise<boolean> => {
    if (!hasUnsavedChanges) return true;

    if (onNavigateAway) {
      return await onNavigateAway();
    }

    return window.confirm(message);
  }, [hasUnsavedChanges, message, onNavigateAway]);

  const navigateWithConfirmation = useCallback(async (to: string) => {
    const canNavigate = await confirmNavigation();
    if (canNavigate) {
      navigate(to);
    }
  }, [navigate, confirmNavigation]);

  return {
    confirmNavigation,
    navigateWithConfirmation
  };
};