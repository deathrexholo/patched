// Utility functions for retrying operations with exponential backoff

/**
 * Retry configuration options
 */
interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: any) => boolean;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2,
  retryCondition: (error: any) => {
    // Retry on network errors, temporary Firebase errors, etc.
    if (error?.code) {
      const retryableCodes = [
        'unavailable',
        'deadline-exceeded',
        'resource-exhausted',
        'aborted',
        'internal',
        'unknown'
      ];
      return retryableCodes.includes(error.code);
    }
    
    // Retry on network errors
    if (error?.message) {
      const networkErrors = [
        'network',
        'timeout',
        'connection',
        'fetch'
      ];
      return networkErrors.some(keyword => 
        error.message.toLowerCase().includes(keyword)
      );
    }
    
    return false;
  }
};

/**
 * Retry an async operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const result = await operation();
      
      // Log successful retry if it wasn't the first attempt
      if (attempt > 1) {}
      
      return result;
    } catch (error) {
      lastError = error;
      
      // Don't retry if this is the last attempt
      if (attempt === config.maxAttempts) {
        console.error(`❌ Operation failed after ${config.maxAttempts} attempts:`, error);
        break;
      }
      
      // Don't retry if the error is not retryable
      if (!config.retryCondition(error)) {
        console.error(`❌ Operation failed with non-retryable error:`, error);
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
        config.maxDelay
      );
      
      console.warn(`⚠️ Operation failed on attempt ${attempt}/${config.maxAttempts}, retrying in ${delay}ms:`, error);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Retry specifically for Firebase operations
 */
export async function retryFirebaseOperation<T>(
  operation: () => Promise<T>,
  operationName: string = 'Firebase operation'
): Promise<T> {
  return retryOperation(operation, {
    maxAttempts: 3,
    baseDelay: 1000,
    retryCondition: (error: any) => {
      // Firebase-specific retry conditions
      if (error?.code) {
        const retryableFirebaseCodes = [
          'unavailable',
          'deadline-exceeded',
          'resource-exhausted',
          'aborted',
          'internal',
          'unknown',
          'cancelled'
        ];
        
        const shouldRetry = retryableFirebaseCodes.includes(error.code);
        
        if (shouldRetry) {} else {}
        
        return shouldRetry;
      }
      
      return DEFAULT_RETRY_OPTIONS.retryCondition(error);
    }
  });
}