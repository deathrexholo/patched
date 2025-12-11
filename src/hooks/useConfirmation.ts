import { useState, useCallback } from 'react';

export interface ConfirmationOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export interface ConfirmationState extends ConfirmationOptions {
  isOpen: boolean;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

interface UseConfirmationReturn {
  confirmationState: ConfirmationState;
  showConfirmation: (options: ConfirmationOptions) => Promise<boolean>;
  hideConfirmation: () => void;
}

export const useConfirmation = (): UseConfirmationReturn => {
  const [confirmationState, setConfirmationState] = useState<ConfirmationState>({
    isOpen: false,
    isLoading: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'warning',
    onConfirm: () => {},
    onCancel: () => {}
  });

  const hideConfirmation = useCallback(() => {
    setConfirmationState(prev => ({
      ...prev,
      isOpen: false,
      isLoading: false
    }));
  }, []);

  const showConfirmation = useCallback((options: ConfirmationOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      const handleConfirm = () => {
        setConfirmationState(prev => ({ ...prev, isLoading: true }));
        resolve(true);
        // Don't hide immediately - let the caller handle it
      };

      const handleCancel = () => {
        resolve(false);
        hideConfirmation();
      };

      setConfirmationState({
        isOpen: true,
        isLoading: false,
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        variant: options.variant || 'warning',
        onConfirm: handleConfirm,
        onCancel: handleCancel
      });
    });
  }, [hideConfirmation]);

  return {
    confirmationState,
    showConfirmation,
    hideConfirmation
  };
};