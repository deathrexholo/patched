import { ApiError } from '../api/responses';

/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Convert to API error format
   */
  toApiError(): ApiError {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed', details?: Record<string, unknown>) {
    super(message, 'AUTH_ERROR', 401, details);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied', details?: Record<string, unknown>) {
    super(message, 'AUTHORIZATION_ERROR', 403, details);
    this.name = 'AuthorizationError';
  }
}

/**
 * Validation error
 */
export class ValidationError extends AppError {
  constructor(
    message: string = 'Validation failed',
    public fieldErrors?: Record<string, string[]>
  ) {
    super(message, 'VALIDATION_ERROR', 400, { fieldErrors });
    this.name = 'ValidationError';
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(
    resource: string = 'Resource',
    public resourceId?: string
  ) {
    super(`${resource} not found`, 'NOT_FOUND', 404, { resourceId });
    this.name = 'NotFoundError';
  }
}

/**
 * Network error
 */
export class NetworkError extends AppError {
  constructor(message: string = 'Network request failed', details?: Record<string, unknown>) {
    super(message, 'NETWORK_ERROR', 0, details);
    this.name = 'NetworkError';
  }
}

/**
 * Firebase error (renamed to avoid conflict with firebase/firestore)
 */
export class FirebaseAppError extends AppError {
  constructor(
    message: string,
    public firebaseCode: string,
    details?: Record<string, unknown>
  ) {
    super(message, `FIREBASE_${firebaseCode}`, 500, details);
    this.name = 'FirebaseAppError';
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends AppError {
  constructor(
    message: string = 'Rate limit exceeded',
    public retryAfter?: number
  ) {
    super(message, 'RATE_LIMIT_ERROR', 429, { retryAfter });
    this.name = 'RateLimitError';
  }
}

/**
 * Conflict error
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', details?: Record<string, unknown>) {
    super(message, 'CONFLICT_ERROR', 409, details);
    this.name = 'ConflictError';
  }
}

/**
 * Server error
 */
export class ServerError extends AppError {
  constructor(message: string = 'Internal server error', details?: Record<string, unknown>) {
    super(message, 'SERVER_ERROR', 500, details);
    this.name = 'ServerError';
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends AppError {
  constructor(message: string = 'Request timeout', public timeout?: number) {
    super(message, 'TIMEOUT_ERROR', 408, { timeout });
    this.name = 'TimeoutError';
  }
}

/**
 * Upload error
 */
export class UploadError extends AppError {
  constructor(
    message: string = 'File upload failed',
    public fileName?: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'UPLOAD_ERROR', 500, { fileName, ...details });
    this.name = 'UploadError';
  }
}

/**
 * Error handler function type
 */
export type ErrorHandler = (error: unknown) => AppError;

/**
 * Error callback type
 */
export type ErrorCallback = (error: AppError) => void;

/**
 * Error recovery function type
 */
export type ErrorRecovery<T> = (error: AppError) => T | Promise<T>;

/**
 * Check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Check if error is an AuthenticationError
 */
export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

/**
 * Check if error is an AuthorizationError
 */
export function isAuthorizationError(error: unknown): error is AuthorizationError {
  return error instanceof AuthorizationError;
}

/**
 * Check if error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Check if error is a NotFoundError
 */
export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}

/**
 * Check if error is a NetworkError
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

/**
 * Check if error is a FirebaseAppError
 */
export function isFirebaseAppError(error: unknown): error is FirebaseAppError {
  return error instanceof FirebaseAppError;
}

/**
 * Convert unknown error to AppError
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message, 'UNKNOWN_ERROR', 500, {
      originalError: error.name,
    });
  }

  if (typeof error === 'string') {
    return new AppError(error, 'UNKNOWN_ERROR', 500);
  }

  return new AppError('An unknown error occurred', 'UNKNOWN_ERROR', 500, {
    error: String(error),
  });
}

/**
 * Convert error to API error format
 */
export function toApiError(error: unknown): ApiError {
  const appError = toAppError(error);
  return appError.toApiError();
}

/**
 * Handle Firebase auth errors
 */
export function handleFirebaseAuthError(error: unknown): AppError {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const firebaseError = error as { code: string; message: string };
    
    switch (firebaseError.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return new AuthenticationError('Invalid email or password');
      
      case 'auth/email-already-in-use':
        return new ConflictError('Email already in use');
      
      case 'auth/weak-password':
        return new ValidationError('Password is too weak');
      
      case 'auth/invalid-email':
        return new ValidationError('Invalid email address');
      
      case 'auth/too-many-requests':
        return new RateLimitError('Too many attempts. Please try again later.');
      
      case 'auth/network-request-failed':
        return new NetworkError('Network error. Please check your connection.');
      
      default:
        return new FirebaseAppError(
          firebaseError.message,
          firebaseError.code.replace('auth/', '')
        );
    }
  }

  return toAppError(error);
}

/**
 * Handle Firebase Firestore errors
 */
export function handleFirestoreError(error: unknown): AppError {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const firebaseError = error as { code: string; message: string };
    
    switch (firebaseError.code) {
      case 'permission-denied':
        return new AuthorizationError('Permission denied');
      
      case 'not-found':
        return new NotFoundError('Document');
      
      case 'already-exists':
        return new ConflictError('Document already exists');
      
      case 'resource-exhausted':
        return new RateLimitError('Quota exceeded');
      
      case 'unavailable':
        return new NetworkError('Service temporarily unavailable');
      
      case 'deadline-exceeded':
        return new TimeoutError('Request timeout');
      
      default:
        return new FirebaseAppError(firebaseError.message, firebaseError.code);
    }
  }

  return toAppError(error);
}

/**
 * Handle Firebase Storage errors
 */
export function handleStorageError(error: unknown): AppError {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const firebaseError = error as { code: string; message: string };
    
    switch (firebaseError.code) {
      case 'storage/unauthorized':
        return new AuthorizationError('Unauthorized to access storage');
      
      case 'storage/canceled':
        return new AppError('Upload canceled', 'UPLOAD_CANCELED', 499);
      
      case 'storage/unknown':
        return new UploadError('Unknown storage error');
      
      case 'storage/object-not-found':
        return new NotFoundError('File');
      
      case 'storage/quota-exceeded':
        return new RateLimitError('Storage quota exceeded');
      
      case 'storage/unauthenticated':
        return new AuthenticationError('Authentication required');
      
      default:
        return new FirebaseAppError(firebaseError.message, firebaseError.code);
    }
  }

  return toAppError(error);
}

/**
 * Error boundary error info
 */
export interface ErrorInfo {
  componentStack: string;
}

/**
 * Error boundary fallback props
 */
export interface ErrorBoundaryFallbackProps {
  error: Error;
  errorInfo: ErrorInfo;
  resetError: () => void;
}
