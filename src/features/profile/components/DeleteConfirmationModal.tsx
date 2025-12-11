import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import '../styles/DeleteConfirmationModal.css';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  itemName?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  itemName,
  onConfirm,
  onCancel,
  isDeleting = false
}) => {
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isDeleting) {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isDeleting) {
      onCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="modal-backdrop delete-modal-backdrop"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      aria-describedby="delete-modal-message"
    >
      <div className="modal-container delete-confirmation-modal">
        <div className="delete-modal-header">
          <div className="delete-modal-icon">
            <AlertTriangle size={24} aria-hidden="true" />
          </div>
          <button
            className="modal-close-button"
            onClick={onCancel}
            aria-label="Close confirmation dialog"
            type="button"
            disabled={isDeleting}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="delete-modal-content">
          <h2 id="delete-modal-title" className="delete-modal-title">
            {title}
          </h2>
          
          <div id="delete-modal-message" className="delete-modal-message">
            <p>{message}</p>
            {itemName && (
              <div className="delete-item-name">
                <strong>"{itemName}"</strong>
              </div>
            )}
            <p className="delete-warning">
              This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="delete-modal-actions">
          <button
            type="button"
            className="modal-button secondary"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="modal-button danger"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;