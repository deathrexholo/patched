import React from 'react';
import { createPortal } from 'react-dom';
import Toast, { ToastProps } from './Toast';
import './ToastContainer.css';

interface ToastContainerProps {
  toasts: ToastProps[];
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

const ToastContainer: React.FC<ToastContainerProps> = ({ 
  toasts, 
  position = 'top-right' 
}) => {
  if (toasts.length === 0) return null;

  const containerElement = document.getElementById('toast-root') || document.body;

  return createPortal(
    <div className={`toast-container toast-container-${position}`}>
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} />
      ))}
    </div>,
    containerElement
  );
};

export default ToastContainer;