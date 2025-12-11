// Specialized error handling for engagement operations (likes, comments, shares)

import errorHandler from './errorHandler';
import { 
  NetworkError, 
  AuthenticationError, 
  RateLimitError, 
  ValidationError,
  toAppError 
} from '../../types/utils/errors';

export interface EngagementError {
  type: 'like' | 'comment' | 'share';
  operation: string;
  message: string;
  userMessage: string;
  canRetry: boolean;
  retryAfter?: number;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2
};

/**
 * Handle like operation errors
 */
export const handleLikeError = (error: unknown, postId: string): EngagementError => {
  const appError = toAppError(error);
  
  errorHandler.logError(appError, `Like-${postId}`, 'warning', {
    postId,
    errorType: 'ui',
    operation: 'like'
  });

  if (appError instanceof NetworkError) {
    return {
      type: 'like',
      operation: 'like',
      message: appError.message,
      userMessage: 'Failed to update like. Please check your connection and try again.',
      canRetry: true
    };
  }

  if (appError instanceof AuthenticationError) {
    return {
      type: 'like',
      operation: 'like',
      message: appError.message,
      userMessage: 'Please sign in to like posts.',
      canRetry: false
    };
  }

  if (appError instanceof RateLimitError) {
    return {
      type: 'like',
      operation: 'like',
      message: appError.message,
      userMessage: 'You\'re liking posts too quickly. Please wait a moment.',
      canRetry: true,
      retryAfter: appError.retryAfter || 5000
    };
  }

  return {
    type: 'like',
    operation: 'like',
    message: appError.message,
    userMessage: 'Failed to update like. Please try again.',
    canRetry: true
  };
};

/**
 * Handle comment operation errors
 */
export const handleCommentError = (error: unknown, postId: string, operation: 'add' | 'load' = 'add'): EngagementError => {
  const appError = toAppError(error);
  
  errorHandler.logError(appError, `Comment-${operation}-${postId}`, 'warning', {
    postId,
    errorType: 'ui',
    operation: `comment_${operation}`
  });

  if (appError instanceof ValidationError) {
    return {
      type: 'comment',
      operation,
      message: appError.message,
      userMessage: appError.message, // Use validation message directly
      canRetry: false
    };
  }

  if (appError instanceof NetworkError) {
    const userMessage = operation === 'add' 
      ? 'Failed to post comment. Please check your connection and try again.'
      : 'Failed to load comments. Please check your connection and try again.';
    
    return {
      type: 'comment',
      operation,
      message: appError.message,
      userMessage,
      canRetry: true
    };
  }

  if (appError instanceof AuthenticationError) {
    return {
      type: 'comment',
      operation,
      message: appError.message,
      userMessage: 'Please sign in to comment on posts.',
      canRetry: false
    };
  }

  if (appError instanceof RateLimitError) {
    return {
      type: 'comment',
      operation,
      message: appError.message,
      userMessage: 'You\'re commenting too quickly. Please wait a moment.',
      canRetry: true,
      retryAfter: appError.retryAfter || 10000
    };
  }

  const userMessage = operation === 'add' 
    ? 'Failed to post comment. Please try again.'
    : 'Failed to load comments. Please try again.';

  return {
    type: 'comment',
    operation,
    message: appError.message,
    userMessage,
    canRetry: true
  };
};

/**
 * Handle share operation errors
 */
export const handleShareError = (error: unknown, postId: string): EngagementError => {
  const appError = toAppError(error);
  
  errorHandler.logError(appError, `Share-${postId}`, 'warning', {
    postId,
    errorType: 'ui',
    operation: 'share'
  });

  if (appError instanceof NetworkError) {
    return {
      type: 'share',
      operation: 'share',
      message: appError.message,
      userMessage: 'Failed to share post. Please check your connection and try again.',
      canRetry: true
    };
  }

  if (appError instanceof AuthenticationError) {
    return {
      type: 'share',
      operation: 'share',
      message: appError.message,
      userMessage: 'Please sign in to share posts.',
      canRetry: false
    };
  }

  if (appError instanceof RateLimitError) {
    return {
      type: 'share',
      operation: 'share',
      message: appError.message,
      userMessage: 'You\'re sharing posts too quickly. Please wait a moment.',
      canRetry: true,
      retryAfter: appError.retryAfter || 15000
    };
  }

  return {
    type: 'share',
    operation: 'share',
    message: appError.message,
    userMessage: 'Failed to share post. Please try again.',
    canRetry: true
  };
};

/**
 * Retry mechanism with exponential backoff
 */
export const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> => {
  const { maxAttempts, baseDelay, maxDelay, backoffMultiplier } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config
  };

  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on the last attempt
      if (attempt === maxAttempts) {
        break;
      }

      // Don't retry certain types of errors
      const appError = toAppError(error);
      if (appError instanceof AuthenticationError || appError instanceof ValidationError) {
        throw appError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        baseDelay * Math.pow(backoffMultiplier, attempt - 1),
        maxDelay
      );

      // Add jitter to prevent thundering herd
      const jitteredDelay = delay + Math.random() * 1000;

      await new Promise(resolve => setTimeout(resolve, jitteredDelay));
    }
  }

  throw lastError!;
};

/**
 * Check if error is retryable
 */
export const isRetryableEngagementError = (error: unknown): boolean => {
  const appError = toAppError(error);
  
  // Don't retry authentication or validation errors
  if (appError instanceof AuthenticationError || appError instanceof ValidationError) {
    return false;
  }

  // Retry network errors and rate limit errors
  if (appError instanceof NetworkError || appError instanceof RateLimitError) {
    return true;
  }

  // Retry unknown errors (could be temporary)
  return true;
};

/**
 * Get retry delay for rate limit errors
 */
export const getRetryDelay = (error: unknown): number => {
  const appError = toAppError(error);
  
  if (appError instanceof RateLimitError && appError.retryAfter) {
    return appError.retryAfter;
  }

  // Default retry delay
  return 5000;
};

/**
 * Format error message for user display
 */
export const formatErrorMessage = (error: EngagementError): string => {
  let message = error.userMessage;

  if (error.retryAfter) {
    const seconds = Math.ceil(error.retryAfter / 1000);
    message += ` Please wait ${seconds} second${seconds > 1 ? 's' : ''}.`;
  }

  return message;
};

/**
 * Create error handler for specific engagement type
 */
export const createEngagementErrorHandler = (type: 'like' | 'comment' | 'share') => {
  return (error: unknown, postId: string, operation?: string): EngagementError => {
    switch (type) {
      case 'like':
        return handleLikeError(error, postId);
      case 'comment':
        return handleCommentError(error, postId, operation as 'add' | 'load');
      case 'share':
        return handleShareError(error, postId);
      default:
        throw new Error(`Unknown engagement type: ${type}`);
    }
  };
};