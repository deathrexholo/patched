import React, { useState } from 'react';
import { BulkOperationType } from './BulkOperationsPanel';
import { BulkSelectableItem } from '../../contexts/BulkSelectionContext';

interface BulkOperationConfirmationProps {
  isOpen: boolean;
  operation: BulkOperationType | null;
  items: BulkSelectableItem[];
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
  className?: string;
}

const BulkOperationConfirmation: React.FC<BulkOperationConfirmationProps> = ({
  isOpen,
  operation,
  items,
  onConfirm,
  onCancel,
  className = ''
}) => {
  const [reason, setReason] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  if (!isOpen || !operation) return null;

  const getOperationDetails = (op: BulkOperationType) => {
    const details = {
      user_suspend: {
        title: 'Suspend Users',
        description: 'This will suspend the selected users and prevent them from accessing the platform.',
        icon: (
          <svg className="w-8 h-8 text-red-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
          </svg>
        ),
        destructive: true,
        requiresReason: true
      },
      user_verify: {
        title: 'Verify Users',
        description: 'This will mark the selected users as verified and grant them verified status.',
        icon: (
          <svg className="w-8 h-8 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        ),
        destructive: false,
        requiresReason: false
      },
      user_activate: {
        title: 'Activate Users',
        description: 'This will activate the selected users and restore their access to the platform.',
        icon: (
          <svg className="w-8 h-8 text-green-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        ),
        destructive: false,
        requiresReason: false
      },
      video_approve: {
        title: 'Approve Videos',
        description: 'This will approve the selected videos and make them visible to users.',
        icon: (
          <svg className="w-8 h-8 text-green-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ),
        destructive: false,
        requiresReason: false
      },
      video_reject: {
        title: 'Reject Videos',
        description: 'This will reject the selected videos and remove them from public view.',
        icon: (
          <svg className="w-8 h-8 text-red-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        ),
        destructive: true,
        requiresReason: true
      },
      video_flag: {
        title: 'Flag Videos',
        description: 'This will flag the selected videos for manual review by moderators.',
        icon: (
          <svg className="w-8 h-8 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
          </svg>
        ),
        destructive: false,
        requiresReason: true
      },
      event_activate: {
        title: 'Activate Events',
        description: 'This will activate the selected events and make them visible to users.',
        icon: (
          <svg className="w-8 h-8 text-green-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        ),
        destructive: false,
        requiresReason: false
      },
      event_deactivate: {
        title: 'Deactivate Events',
        description: 'This will deactivate the selected events and hide them from users.',
        icon: (
          <svg className="w-8 h-8 text-red-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
          </svg>
        ),
        destructive: true,
        requiresReason: true
      }
    };
    return details[op];
  };

  const operationDetails = getOperationDetails(operation);

  const handleConfirm = async () => {
    if (operationDetails.requiresReason && !reason.trim()) {
      return;
    }

    setIsConfirming(true);
    try {
      await onConfirm(reason.trim() || undefined);
    } finally {
      setIsConfirming(false);
      setReason('');
    }
  };

  const handleCancel = () => {
    setReason('');
    onCancel();
  };

  const getItemDisplayName = (item: BulkSelectableItem): string => {
    if ('displayName' in item && item.displayName) return item.displayName;
    if ('title' in item && item.title) return item.title;
    if ('email' in item && item.email) return item.email;
    return item.id;
  };

  return (
    <div className={`bulk-operation-confirmation ${className}`}>
      <div className="confirmation-overlay" onClick={handleCancel} />
      <div className="confirmation-content">
        <div className="confirmation-header">
          <div className="confirmation-icon">
            {operationDetails.icon}
          </div>
          <div className="confirmation-details">
            <h3 className="confirmation-title">
              {operationDetails.title}
            </h3>
            <p className="confirmation-description">
              {operationDetails.description}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="confirmation-close-button"
            disabled={isConfirming}
          >
            <svg className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="confirmation-body">
          <div className="affected-items-section">
            <h4 className="affected-items-title">
              Affected Items ({items.length})
            </h4>
            <div className="affected-items-preview">
              {items.slice(0, 3).map((item) => (
                <div key={item.id} className="affected-item-preview">
                  <div className="item-name">{getItemDisplayName(item)}</div>
                  <div className="item-id">ID: {item.id}</div>
                </div>
              ))}
              {items.length > 3 && (
                <div className="affected-item-preview more-items">
                  <div className="item-name">+{items.length - 3} more items</div>
                  <div className="item-id">Click to view all</div>
                </div>
              )}
            </div>
          </div>

          {operationDetails.requiresReason && (
            <div className="reason-section">
              <label htmlFor="confirmation-reason" className="reason-label">
                Reason {operationDetails.destructive ? '(required)' : '(optional)'}:
              </label>
              <textarea
                id="confirmation-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={`Enter a reason for ${operationDetails.title.toLowerCase()}...`}
                className="reason-textarea"
                rows={3}
                disabled={isConfirming}
                required={operationDetails.destructive}
              />
              {operationDetails.destructive && !reason.trim() && (
                <div className="reason-error">
                  A reason is required for this operation.
                </div>
              )}
            </div>
          )}

          {operationDetails.destructive && (
            <div className="warning-section">
              <div className="warning-icon">
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="warning-content">
                <div className="warning-title">Warning</div>
                <div className="warning-message">
                  This action cannot be undone. Please make sure you want to proceed.
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="confirmation-actions">
          <button
            type="button"
            onClick={handleCancel}
            className="cancel-button"
            disabled={isConfirming}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`confirm-button ${operationDetails.destructive ? 'destructive' : ''}`}
            disabled={
              isConfirming || 
              (operationDetails.requiresReason && !reason.trim())
            }
          >
            {isConfirming ? (
              <>
                <svg className="animate-spin w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                  <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75" />
                </svg>
                Processing...
              </>
            ) : (
              `Confirm ${operationDetails.title}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkOperationConfirmation;