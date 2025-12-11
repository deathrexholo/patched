import React from 'react';
import { BulkOperationType } from './BulkOperationsPanel';

export interface BulkOperationResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: Array<{ itemId: string; error: string; }>;
  operationId: string;
}

interface BulkOperationProgressProps {
  isOpen: boolean;
  operation: BulkOperationType | null;
  totalItems: number;
  processedItems: number;
  result: BulkOperationResult | null;
  onClose: () => void;
  onRetry?: (failedItems: string[]) => void;
  className?: string;
}

const BulkOperationProgress: React.FC<BulkOperationProgressProps> = ({
  isOpen,
  operation,
  totalItems,
  processedItems,
  result,
  onClose,
  onRetry,
  className = ''
}) => {
  if (!isOpen || !operation) return null;

  const isInProgress = !result && processedItems < totalItems;
  const isComplete = !!result;
  const progressPercentage = totalItems > 0 ? (processedItems / totalItems) * 100 : 0;

  const getOperationLabel = (op: BulkOperationType): string => {
    const labels: Record<BulkOperationType, string> = {
      user_suspend: 'Suspending Users',
      user_verify: 'Verifying Users',
      user_activate: 'Activating Users',
      video_approve: 'Approving Videos',
      video_reject: 'Rejecting Videos',
      video_flag: 'Flagging Videos',
      event_activate: 'Activating Events',
      event_deactivate: 'Deactivating Events'
    };
    return labels[op] || 'Processing';
  };

  const getOperationIcon = (op: BulkOperationType) => {
    const icons: Record<BulkOperationType, React.ReactNode> = {
      user_suspend: (
        <svg className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
        </svg>
      ),
      user_verify: (
        <svg className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ),
      user_activate: (
        <svg className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ),
      video_approve: (
        <svg className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ),
      video_reject: (
        <svg className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      ),
      video_flag: (
        <svg className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
        </svg>
      ),
      event_activate: (
        <svg className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ),
      event_deactivate: (
        <svg className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
        </svg>
      )
    };
    return icons[op];
  };

  const handleRetryFailed = () => {
    if (result && result.errors.length > 0 && onRetry) {
      const failedItemIds = result.errors.map(error => error.itemId);
      onRetry(failedItemIds);
    }
  };

  return (
    <div className={`bulk-operation-progress ${className}`}>
      <div className="progress-overlay" onClick={isComplete ? onClose : undefined} />
      <div className="progress-content">
        <div className="progress-header">
          <div className="progress-icon">
            {isInProgress ? (
              <svg className="animate-spin w-8 h-8" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75" />
              </svg>
            ) : result?.success ? (
              <svg className="w-8 h-8 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <div className="progress-details">
            <h3 className="progress-title">
              {isInProgress ? getOperationLabel(operation) : 
               result?.success ? 'Operation Completed' : 'Operation Failed'}
            </h3>
            <p className="progress-subtitle">
              {isInProgress ? `Processing ${processedItems} of ${totalItems} items...` :
               result ? `Processed ${result.processedCount} items` : ''}
            </p>
          </div>
          {isComplete && (
            <button
              type="button"
              onClick={onClose}
              className="progress-close-button"
            >
              <svg className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>

        <div className="progress-body">
          {isInProgress && (
            <div className="progress-bar-container">
              <div className="progress-bar">
                <div 
                  className="progress-bar-fill"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className="progress-text">
                {Math.round(progressPercentage)}% complete
              </div>
            </div>
          )}

          {result && (
            <div className="operation-results">
              <div className="results-summary">
                <div className="result-stat success">
                  <div className="stat-icon">
                    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="stat-details">
                    <div className="stat-value">{result.processedCount}</div>
                    <div className="stat-label">Successful</div>
                  </div>
                </div>

                {result.failedCount > 0 && (
                  <div className="result-stat error">
                    <div className="stat-icon">
                      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="stat-details">
                      <div className="stat-value">{result.failedCount}</div>
                      <div className="stat-label">Failed</div>
                    </div>
                  </div>
                )}
              </div>

              {result.errors.length > 0 && (
                <div className="error-details">
                  <h4 className="error-title">
                    Failed Operations ({result.errors.length})
                  </h4>
                  <div className="error-list">
                    {result.errors.slice(0, 5).map((error, index) => (
                      <div key={index} className="error-item">
                        <div className="error-item-id">Item: {error.itemId}</div>
                        <div className="error-item-message">{error.error}</div>
                      </div>
                    ))}
                    {result.errors.length > 5 && (
                      <div className="error-item more-errors">
                        +{result.errors.length - 5} more errors
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {isComplete && (
          <div className="progress-actions">
            {result && result.errors.length > 0 && onRetry && (
              <button
                type="button"
                onClick={handleRetryFailed}
                className="retry-button"
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                Retry Failed ({result.errors.length})
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="close-button"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkOperationProgress;