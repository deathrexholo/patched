import React, { memo } from 'react';
import Toast, { ToastProps } from './Toast';
import './ToastContainer.css';

interface ToastContainerProps {
  toasts: ToastProps[];
  onDismiss: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

const ToastContainer = memo<ToastContainerProps>(({
  toasts,
  onDismiss,
  position = 'top-right'
}) => {
  if (toasts.length === 0) return null;

  return (
    <div className={`toast-container ${position}`}>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
});

ToastContainer.displayName = 'ToastContainer';

export default ToastContainer;