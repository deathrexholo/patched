import { useState, useCallback } from 'react';
import { ToastProps, ToastType } from '@components/common/ui/Toast';

interface ToastOptions {
  type?: ToastType;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface UseToastReturn {
  toasts: ToastProps[];
  showToast: (title: string, message?: string, options?: ToastOptions) => string;
  showSuccess: (title: string, message?: string, duration?: number) => string;
  showError: (title: string, message?: string, duration?: number) => string;
  showWarning: (title: string, message?: string, duration?: number) => string;
  showInfo: (title: string, message?: string, duration?: number) => string;
  dismissToast: (id: string) => void;
  dismissAll: () => void;
}

export const useToast = (): UseToastReturn => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const showToast = useCallback((
    title: string, 
    message?: string, 
    options: ToastOptions = {}
  ): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const { type = 'info', duration = 5000, action } = options;

    const newToast: ToastProps = {
      id,
      type,
      title,
      message,
      duration,
      onClose: dismissToast,
      action
    };

    setToasts(prev => [...prev, newToast]);
    return id;
  }, [dismissToast]);

  const showSuccess = useCallback((title: string, message?: string, duration = 5000): string => {
    return showToast(title, message, { type: 'success', duration });
  }, [showToast]);

  const showError = useCallback((title: string, message?: string, duration = 7000): string => {
    return showToast(title, message, { type: 'error', duration });
  }, [showToast]);

  const showWarning = useCallback((title: string, message?: string, duration = 6000): string => {
    return showToast(title, message, { type: 'warning', duration });
  }, [showToast]);

  const showInfo = useCallback((title: string, message?: string, duration = 5000): string => {
    return showToast(title, message, { type: 'info', duration });
  }, [showToast]);

  return {
    toasts,
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    dismissToast,
    dismissAll
  };
};