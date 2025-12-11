import React, { useState, useMemo } from 'react';
import { useBulkSelection, BulkSelectableItem } from '../../contexts/BulkSelectionContext';
import { User, Event } from '../../types/models';
import { TalentVideo } from '../../types/models/search';
import BulkOperationConfirmation from './BulkOperationConfirmation';
import BulkOperationProgress, { BulkOperationResult } from './BulkOperationProgress';
import { userManagementService } from '../../services/userManagementService';
import { videoVerificationService } from '../../services/videoVerificationService';
import { eventsService } from '../../services/eventsService';
import './BulkOperationsPanel.css';
import './BulkOperationConfirmation.css';
import './BulkOperationProgress.css';

export type BulkOperationType = 
  | 'user_suspend' 
  | 'user_verify' 
  | 'user_activate' 
  | 'video_approve' 
  | 'video_reject' 
  | 'video_flag' 
  | 'event_activate' 
  | 'event_deactivate';

export interface BulkOperation {
  type: BulkOperationType;
  label: string;
  description: string;
  icon: React.ReactNode;
  confirmationRequired: boolean;
  destructive?: boolean;
}

interface BulkOperationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOperationComplete?: (result: BulkOperationResult) => void;
  className?: string;
}

const BulkOperationsPanel: React.FC<BulkOperationsPanelProps> = ({
  isOpen,
  onClose,
  onOperationComplete,
  className = ''
}) => {
  const { getSelectedItems, getSelectedItemsByType } = useBulkSelection();
  const [selectedOperation, setSelectedOperation] = useState<BulkOperationType | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [processedItems, setProcessedItems] = useState(0);
  const [operationResult, setOperationResult] = useState<BulkOperationResult | null>(null);

  const selectedItems = getSelectedItems();
  const selectedUsers = getSelectedItemsByType<User>('user');
  const selectedVideos = getSelectedItemsByType<TalentVideo>('video');
  const selectedEvents = getSelectedItemsByType<Event>('event');

  // Define available operations based on selected item types
  const availableOperations = useMemo((): BulkOperation[] => {
    const operations: BulkOperation[] = [];

    // User operations
    if (selectedUsers.length > 0) {
      operations.push(
        {
          type: 'user_suspend',
          label: 'Suspend Users',
          description: `Suspend ${selectedUsers.length} selected user${selectedUsers.length !== 1 ? 's' : ''}`,
          icon: (
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
            </svg>
          ),
          confirmationRequired: true,
          destructive: true
        },
        {
          type: 'user_verify',
          label: 'Verify Users',
          description: `Verify ${selectedUsers.length} selected user${selectedUsers.length !== 1 ? 's' : ''}`,
          icon: (
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ),
          confirmationRequired: true
        },
        {
          type: 'user_activate',
          label: 'Activate Users',
          description: `Activate ${selectedUsers.length} selected user${selectedUsers.length !== 1 ? 's' : ''}`,
          icon: (
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ),
          confirmationRequired: false
        }
      );
    }

    // Video operations
    if (selectedVideos.length > 0) {
      operations.push(
        {
          type: 'video_approve',
          label: 'Approve Videos',
          description: `Approve ${selectedVideos.length} selected video${selectedVideos.length !== 1 ? 's' : ''}`,
          icon: (
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ),
          confirmationRequired: false
        },
        {
          type: 'video_reject',
          label: 'Reject Videos',
          description: `Reject ${selectedVideos.length} selected video${selectedVideos.length !== 1 ? 's' : ''}`,
          icon: (
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          ),
          confirmationRequired: true,
          destructive: true
        },
        {
          type: 'video_flag',
          label: 'Flag Videos',
          description: `Flag ${selectedVideos.length} selected video${selectedVideos.length !== 1 ? 's' : ''} for review`,
          icon: (
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
            </svg>
          ),
          confirmationRequired: true
        }
      );
    }

    // Event operations
    if (selectedEvents.length > 0) {
      operations.push(
        {
          type: 'event_activate',
          label: 'Activate Events',
          description: `Activate ${selectedEvents.length} selected event${selectedEvents.length !== 1 ? 's' : ''}`,
          icon: (
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ),
          confirmationRequired: false
        },
        {
          type: 'event_deactivate',
          label: 'Deactivate Events',
          description: `Deactivate ${selectedEvents.length} selected event${selectedEvents.length !== 1 ? 's' : ''}`,
          icon: (
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
            </svg>
          ),
          confirmationRequired: true,
          destructive: true
        }
      );
    }

    return operations;
  }, [selectedUsers.length, selectedVideos.length, selectedEvents.length]);

  const handleOperationSelect = (operation: BulkOperationType) => {
    setSelectedOperation(operation);
    const operationDetails = availableOperations.find(op => op.type === operation);
    
    if (operationDetails?.confirmationRequired) {
      setShowConfirmation(true);
    } else {
      // Execute immediately for non-destructive operations
      handleExecuteOperation(operation);
    }
  };

  const handleConfirmOperation = async (reason?: string) => {
    if (!selectedOperation) return;
    setShowConfirmation(false);
    await handleExecuteOperation(selectedOperation, reason);
  };

  const handleExecuteOperation = async (operation: BulkOperationType, reason?: string) => {
    setShowProgress(true);
    setProcessedItems(0);
    setOperationResult(null);

    try {
      let result: BulkOperationResult;

      // Execute the appropriate service method based on operation type
      switch (operation) {
        case 'user_suspend':
          const suspendResult = await userManagementService.bulkSuspendUsers(
            selectedUsers.map(u => u.id),
            reason
          );
          result = {
            success: suspendResult.failedCount === 0,
            processedCount: suspendResult.processedCount,
            failedCount: suspendResult.failedCount,
            errors: suspendResult.errors.map(e => ({ itemId: e.userId, error: e.error })),
            operationId: `suspend_${Date.now()}`
          };
          break;

        case 'user_verify':
          const verifyResult = await userManagementService.bulkVerifyUsers(
            selectedUsers.map(u => u.id),
            reason
          );
          result = {
            success: verifyResult.failedCount === 0,
            processedCount: verifyResult.processedCount,
            failedCount: verifyResult.failedCount,
            errors: verifyResult.errors.map(e => ({ itemId: e.userId, error: e.error })),
            operationId: `verify_${Date.now()}`
          };
          break;

        case 'user_activate':
          const activateResult = await userManagementService.bulkActivateUsers(
            selectedUsers.map(u => u.id),
            reason
          );
          result = {
            success: activateResult.failedCount === 0,
            processedCount: activateResult.processedCount,
            failedCount: activateResult.failedCount,
            errors: activateResult.errors.map(e => ({ itemId: e.userId, error: e.error })),
            operationId: `activate_${Date.now()}`
          };
          break;

        case 'video_approve':
          const approveResult = await videoVerificationService.bulkApproveVideos(
            selectedVideos.map(v => v.id),
            reason
          );
          result = {
            success: approveResult.failedCount === 0,
            processedCount: approveResult.processedCount,
            failedCount: approveResult.failedCount,
            errors: approveResult.errors.map(e => ({ itemId: e.videoId, error: e.error })),
            operationId: `approve_${Date.now()}`
          };
          break;

        case 'video_reject':
          const rejectResult = await videoVerificationService.bulkRejectVideos(
            selectedVideos.map(v => v.id),
            reason
          );
          result = {
            success: rejectResult.failedCount === 0,
            processedCount: rejectResult.processedCount,
            failedCount: rejectResult.failedCount,
            errors: rejectResult.errors.map(e => ({ itemId: e.videoId, error: e.error })),
            operationId: `reject_${Date.now()}`
          };
          break;

        case 'video_flag':
          const flagResult = await videoVerificationService.bulkFlagVideos(
            selectedVideos.map(v => v.id),
            reason
          );
          result = {
            success: flagResult.failedCount === 0,
            processedCount: flagResult.processedCount,
            failedCount: flagResult.failedCount,
            errors: flagResult.errors.map(e => ({ itemId: e.videoId, error: e.error })),
            operationId: `flag_${Date.now()}`
          };
          break;

        case 'event_activate':
          const eventActivateResult = await eventsService.bulkActivateEvents(
            selectedEvents.map(e => e.id),
            reason
          );
          result = {
            success: eventActivateResult.failedCount === 0,
            processedCount: eventActivateResult.processedCount,
            failedCount: eventActivateResult.failedCount,
            errors: eventActivateResult.errors.map(e => ({ itemId: e.eventId, error: e.error })),
            operationId: `event_activate_${Date.now()}`
          };
          break;

        case 'event_deactivate':
          const eventDeactivateResult = await eventsService.bulkDeactivateEvents(
            selectedEvents.map(e => e.id),
            reason
          );
          result = {
            success: eventDeactivateResult.failedCount === 0,
            processedCount: eventDeactivateResult.processedCount,
            failedCount: eventDeactivateResult.failedCount,
            errors: eventDeactivateResult.errors.map(e => ({ itemId: e.eventId, error: e.error })),
            operationId: `event_deactivate_${Date.now()}`
          };
          break;

        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      setProcessedItems(result.processedCount + result.failedCount);
      setOperationResult(result);

      // Notify parent component of completion
      if (onOperationComplete) {
        onOperationComplete(result);
      }

    } catch (error) {
      console.error('Failed to execute bulk operation:', error);
      const errorResult: BulkOperationResult = {
        success: false,
        processedCount: 0,
        failedCount: selectedItems.length,
        errors: selectedItems.map(item => ({
          itemId: item.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })),
        operationId: `error_${Date.now()}`
      };
      
      setOperationResult(errorResult);
      
      if (onOperationComplete) {
        onOperationComplete(errorResult);
      }
    }
  };

  const handleRetryOperation = async (failedItemIds: string[]) => {
    // Filter selected items to only retry failed ones
    const failedItems = selectedItems.filter(item => failedItemIds.includes(item.id));
    if (failedItems.length === 0 || !selectedOperation) return;

    setShowProgress(true);
    setProcessedItems(0);
    setOperationResult(null);

    try {
      // Execute retry with the same operation but only failed items
      await handleExecuteOperation(selectedOperation);
    } catch (error) {
      console.error('Failed to retry bulk operation:', error);
      const errorResult: BulkOperationResult = {
        success: false,
        processedCount: 0,
        failedCount: failedItems.length,
        errors: failedItems.map(item => ({
          itemId: item.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })),
        operationId: `retry_error_${Date.now()}`
      };
      
      setOperationResult(errorResult);
    }
  };

  const handleCancel = () => {
    setSelectedOperation(null);
    setShowConfirmation(false);
    onClose();
  };

  const handleCloseProgress = () => {
    setShowProgress(false);
    setProcessedItems(0);
    setOperationResult(null);
    setSelectedOperation(null);
    onClose();
  };

  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
    setSelectedOperation(null);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={`bulk-operations-panel ${className}`}>
        <div className="panel-overlay" onClick={handleCancel} />
        <div className="panel-content">
          <div className="panel-header">
            <h3 className="panel-title">
              Bulk Operations
            </h3>
            <button
              type="button"
              onClick={handleCancel}
              className="close-button"
            >
              <svg className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <div className="panel-body">
            <div className="selection-summary">
              <p className="summary-text">
                {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected:
              </p>
              <div className="summary-breakdown">
                {selectedUsers.length > 0 && (
                  <span className="item-count user-count">
                    {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''}
                  </span>
                )}
                {selectedVideos.length > 0 && (
                  <span className="item-count video-count">
                    {selectedVideos.length} video{selectedVideos.length !== 1 ? 's' : ''}
                  </span>
                )}
                {selectedEvents.length > 0 && (
                  <span className="item-count event-count">
                    {selectedEvents.length} event{selectedEvents.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            <div className="operations-list">
              <h4 className="operations-title">Choose an operation:</h4>
              {availableOperations.map((operation) => (
                <button
                  key={operation.type}
                  type="button"
                  onClick={() => handleOperationSelect(operation.type)}
                  className={`operation-button ${operation.destructive ? 'destructive' : ''}`}
                >
                  <div className="operation-icon">
                    {operation.icon}
                  </div>
                  <div className="operation-details">
                    <div className="operation-label">{operation.label}</div>
                    <div className="operation-description">{operation.description}</div>
                  </div>
                  <div className="operation-arrow">
                    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <BulkOperationConfirmation
        isOpen={showConfirmation}
        operation={selectedOperation}
        items={selectedItems}
        onConfirm={handleConfirmOperation}
        onCancel={handleCancelConfirmation}
      />

      <BulkOperationProgress
        isOpen={showProgress}
        operation={selectedOperation}
        totalItems={selectedItems.length}
        processedItems={processedItems}
        result={operationResult}
        onClose={handleCloseProgress}
        onRetry={handleRetryOperation}
      />
    </>
  );
};

export default BulkOperationsPanel;