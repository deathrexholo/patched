/**
 * Search Error Handler
 * Provides error handling with retry logic and user-friendly messages
 */

import { SearchError, SearchErrorType } from '@/types/models/search';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // Base delay in milliseconds
  maxDelay: number; // Maximum delay in milliseconds
  backoffMultiplier: number;
}

interface QueuedOperation {
  id: string;
  operation: () => Promise<any>;
  retryCount: number;
  lastAttempt: number;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2
};

class SearchErrorHandler {
  private retryQueue: Map<string, QueuedOperation> = new Map();
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private config: RetryConfig;

  constructor(config: RetryConfig = DEFAULT_RETRY_CONFIG) {
    this.config = config;
  }

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationId?: string
  ): Promise<T> {
    const id = operationId || this._generateOperationId();
    
    try {
      const result = await operation();
      this._clearRetry(id);
      return result;
    } catch (error) {
      const searchError = this.createSearchError(error);
      
      if (searchError.retryable) {
        return this._queueRetry(id, operation, searchError);
      } else {
        throw searchError;
      }
    }
  }

  /**
   * Create standardized search error from any error
   */
  createSearchError(error: any): SearchError {
    if (error && typeof error === 'object' && error.type && error.message !== undefined && error.retryable !== undefined) {
      return error as SearchError;
    }

    // Determine error type based on error properties
    const errorType = this._determineErrorType(error);
    const message = this._getUserFriendlyMessage(errorType, error);
    const retryable = this._isRetryable(errorType);

    return {
      type: errorType,
      message,
      details: error,
      retryable
    };
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(error: SearchError): string {
    switch (error.type) {
      case SearchErrorType.NETWORK_ERROR:
        return 'Unable to connect to the server. Please check your internet connection and try again.';
      
      case SearchErrorType.TIMEOUT:
        return 'The search is taking longer than expected. Please try again with a more specific query.';
      
      case SearchErrorType.INVALID_QUERY:
        return 'Invalid search query. Please check your search terms and filters.';
      
      case SearchErrorType.RATE_LIMIT_EXCEEDED:
        return 'Too many search requests. Please wait a moment before searching again.';
      
      case SearchErrorType.INSUFFICIENT_PERMISSIONS:
        return 'You don\'t have permission to perform this search. Please contact your administrator.';
      
      default:
        return 'An unexpected error occurred while searching. Please try again.';
    }
  }

  /**
   * Get search suggestions based on error type
   */
  getSearchSuggestions(error: SearchError): string[] {
    switch (error.type) {
      case SearchErrorType.INVALID_QUERY:
        return [
          'Try using simpler search terms',
          'Check spelling of search terms',
          'Remove special characters',
          'Use fewer filters'
        ];
      
      case SearchErrorType.TIMEOUT:
        return [
          'Use more specific search terms',
          'Apply additional filters to narrow results',
          'Try searching for exact matches',
          'Search within a specific date range'
        ];
      
      case SearchErrorType.NETWORK_ERROR:
        return [
          'Check your internet connection',
          'Try refreshing the page',
          'Wait a moment and try again'
        ];
      
      default:
        return [
          'Try a different search term',
          'Refresh the page and try again',
          'Contact support if the problem persists'
        ];
    }
  }

  /**
   * Clear all retry operations
   */
  clearRetries(): void {
    // Clear all timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts.clear();
    
    // Reject all pending operations
    this.retryQueue.forEach(operation => {
      operation.reject({
        type: SearchErrorType.NETWORK_ERROR,
        message: 'Operation cancelled',
        retryable: false
      } as SearchError);
    });
    this.retryQueue.clear();
  }

  /**
   * Get retry queue status
   */
  getRetryStatus(): { pending: number; operations: string[] } {
    return {
      pending: this.retryQueue.size,
      operations: Array.from(this.retryQueue.keys())
    };
  }

  /**
   * Queue operation for retry with exponential backoff
   */
  private async _queueRetry<T>(
    id: string,
    operation: () => Promise<T>,
    error: SearchError
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const existingOperation = this.retryQueue.get(id);
      const retryCount = existingOperation ? existingOperation.retryCount + 1 : 1;

      if (retryCount > this.config.maxRetries) {
        reject(error);
        return;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        this.config.baseDelay * Math.pow(this.config.backoffMultiplier, retryCount - 1),
        this.config.maxDelay
      );

      const queuedOperation: QueuedOperation = {
        id,
        operation,
        retryCount,
        lastAttempt: Date.now(),
        resolve,
        reject
      };

      this.retryQueue.set(id, queuedOperation);

      // Schedule retry
      const timeoutId = setTimeout(async () => {
        try {
          const result = await operation();
          this._clearRetry(id);
          resolve(result);
        } catch (retryError) {
          const retrySearchError = this.createSearchError(retryError);
          
          if (retrySearchError.retryable && retryCount < this.config.maxRetries) {
            // Queue another retry
            this._queueRetry(id, operation, retrySearchError)
              .then(resolve)
              .catch(reject);
          } else {
            this._clearRetry(id);
            reject(retrySearchError);
          }
        }
      }, delay);

      this.retryTimeouts.set(id, timeoutId);
    });
  }

  /**
   * Clear retry operation
   */
  private _clearRetry(id: string): void {
    const timeout = this.retryTimeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.retryTimeouts.delete(id);
    }
    this.retryQueue.delete(id);
  }

  /**
   * Generate unique operation ID
   */
  private _generateOperationId(): string {
    return `search_op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Determine error type from error object
   */
  private _determineErrorType(error: any): SearchErrorType {
    if (!error) return SearchErrorType.NETWORK_ERROR;

    const errorCode = error.code || error.message || '';
    const errorMessage = (error.message || '').toLowerCase();

    // Firebase-specific error codes
    if (errorCode.includes('permission-denied') || errorCode.includes('unauthenticated')) {
      return SearchErrorType.INSUFFICIENT_PERMISSIONS;
    }

    if (errorCode.includes('resource-exhausted') || errorMessage.includes('quota')) {
      return SearchErrorType.RATE_LIMIT_EXCEEDED;
    }

    if (errorCode.includes('deadline-exceeded') || errorMessage.includes('timeout')) {
      return SearchErrorType.TIMEOUT;
    }

    if (errorCode.includes('invalid-argument') || errorMessage.includes('invalid')) {
      return SearchErrorType.INVALID_QUERY;
    }

    // Network-related errors
    if (
      errorCode.includes('unavailable') ||
      errorCode.includes('network') ||
      errorMessage.includes('network') ||
      errorMessage.includes('offline') ||
      errorMessage.includes('connection')
    ) {
      return SearchErrorType.NETWORK_ERROR;
    }

    // Default to network error for unknown errors
    return SearchErrorType.NETWORK_ERROR;
  }

  /**
   * Get user-friendly message based on error type
   */
  private _getUserFriendlyMessage(errorType: SearchErrorType, originalError: any): string {
    const baseMessage = this.getUserFriendlyMessage({ 
      type: errorType, 
      message: '', 
      retryable: false 
    } as SearchError);

    // Add specific details if available
    if (originalError?.message && typeof originalError.message === 'string') {
      const details = originalError.message.toLowerCase();
      
      if (details.includes('quota') || details.includes('limit')) {
        return 'Search quota exceeded. Please wait a few minutes before searching again.';
      }
      
      if (details.includes('permission')) {
        return 'You don\'t have permission to search this content. Please contact your administrator.';
      }
    }

    return baseMessage;
  }

  /**
   * Check if error type is retryable
   */
  private _isRetryable(errorType: SearchErrorType): boolean {
    switch (errorType) {
      case SearchErrorType.NETWORK_ERROR:
      case SearchErrorType.TIMEOUT:
      case SearchErrorType.RATE_LIMIT_EXCEEDED:
        return true;
      
      case SearchErrorType.INVALID_QUERY:
      case SearchErrorType.INSUFFICIENT_PERMISSIONS:
        return false;
      
      default:
        return false;
    }
  }

  /**
   * Cleanup error handler
   */
  destroy(): void {
    this.clearRetries();
  }
}

// Create singleton instance
const searchErrorHandler = new SearchErrorHandler();

export default searchErrorHandler;
export { searchErrorHandler, SearchErrorHandler };