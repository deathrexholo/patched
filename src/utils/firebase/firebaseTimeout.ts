/**
 * Firebase Operation Timeout Utilities
 * Prevents hanging on unresponsive Firestore operations
 */

/**
 * Wrap a promise with a timeout
 * Rejects if the promise doesn't resolve within the specified time
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 30000,
  operation: string = 'Operation'
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        new Error(
          `${operation} timed out after ${timeoutMs}ms. Firebase may be unresponsive or network is slow.`
        )
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Retry a function with exponential backoff
 * Useful for transient Firebase errors
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000,
  operation: string = 'Operation'
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on auth/permission errors
      if (
        lastError.message?.includes('permission') ||
        lastError.message?.includes('unauthorized') ||
        lastError.message?.includes('authentication')
      ) {
        throw lastError;
      }

      // On last attempt, throw the error
      if (attempt === maxRetries) {
        throw new Error(
          `${operation} failed after ${maxRetries} attempts: ${lastError.message}`
        );
      }

      // Calculate exponential backoff delay
      const delayMs = initialDelayMs * Math.pow(2, attempt - 1);
      console.warn(
        `${operation} attempt ${attempt} failed, retrying in ${delayMs}ms:`,
        lastError.message
      );

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError || new Error(`${operation} failed`);
}

/**
 * Combine timeout and retry for robust Firebase operations
 */
export async function withTimeoutAndRetry<T>(
  fn: () => Promise<T>,
  options: {
    timeoutMs?: number;
    maxRetries?: number;
    initialDelayMs?: number;
    operation?: string;
  } = {}
): Promise<T> {
  const {
    timeoutMs = 30000,
    maxRetries = 2,
    initialDelayMs = 500,
    operation = 'Firebase operation'
  } = options;

  return withRetry(
    () => withTimeout(fn(), timeoutMs, operation),
    maxRetries,
    initialDelayMs,
    operation
  );
}

/**
 * Error message extractor for better error reporting
 */
export function extractFirebaseError(error: unknown): {
  message: string;
  code?: string;
  isTimeout: boolean;
  isPermissionError: boolean;
  isNetworkError: boolean;
} {
  const isTimeout =
    error instanceof Error && error.message.includes('timed out');
  const isPermissionError =
    error instanceof Error &&
    (error.message.includes('permission') ||
      error.message.includes('unauthorized'));
  const isNetworkError =
    error instanceof Error &&
    (error.message.includes('network') ||
      error.message.includes('offline'));

  let message = 'Unknown error occurred';
  let code: string | undefined;

  if (error instanceof Error) {
    message = error.message;
    if ('code' in error) {
      code = (error as any).code;
    }
  } else if (typeof error === 'string') {
    message = error;
  } else if (error instanceof Object) {
    message = (error as any).message || JSON.stringify(error);
    code = (error as any).code;
  }

  return {
    message,
    code,
    isTimeout,
    isPermissionError,
    isNetworkError
  };
}

/**
 * User-friendly error messages
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  const { message, isTimeout, isPermissionError, isNetworkError } =
    extractFirebaseError(error);

  if (isTimeout) {
    return 'The operation took too long. Please check your connection and try again.';
  }

  if (isPermissionError) {
    return 'You do not have permission to perform this action. Please contact an administrator.';
  }

  if (isNetworkError) {
    return 'Network error. Please check your internet connection and try again.';
  }

  // Return original message as fallback
  return message || 'An error occurred. Please try again.';
}
