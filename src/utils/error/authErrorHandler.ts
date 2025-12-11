// Authentication error handler utility for Firebase auth errors
// Provides user-friendly error messages and recovery strategies

export interface AuthErrorMapping {
  message: string;
  action?: string;
  severity: 'error' | 'warning' | 'info';
  requiresReauth?: boolean;
  suggestedAction?: string;
}

export interface AuthErrorResult {
  message: string;
  action?: string;
  severity: 'error' | 'warning' | 'info';
  requiresReauth?: boolean;
  suggestedAction?: string;
  originalCode?: string;
}

// Comprehensive mapping of Firebase auth error codes to user-friendly messages
const AUTH_ERROR_MESSAGES: Record<string, AuthErrorMapping> = {
  // Login errors
  'auth/user-not-found': {
    message: 'No account found with this email address.',
    action: 'Check your email or create a new account.',
    severity: 'error'
  },
  'auth/wrong-password': {
    message: 'The password you entered is incorrect.',
    action: 'Please check your password and try again. If you forgot your password, you can reset it.',
    severity: 'error'
  },
  'auth/invalid-email': {
    message: 'Please enter a valid email address.',
    severity: 'error'
  },
  'auth/invalid-credential': {
    message: 'Invalid email or password.',
    action: 'Please check your credentials and try again.',
    severity: 'error'
  },
  'auth/user-disabled': {
    message: 'This account has been disabled.',
    action: 'Please contact support for assistance.',
    severity: 'error'
  },
  'auth/too-many-requests': {
    message: 'Too many failed attempts.',
    action: 'Please wait a few minutes before trying again.',
    severity: 'warning'
  },
  'auth/operation-not-allowed': {
    message: 'This sign-in method is not enabled.',
    action: 'Please contact support or try a different sign-in method.',
    severity: 'error'
  },

  // Password change errors
  'auth/requires-recent-login': {
    message: 'For security, we need you to re-authenticate.',
    action: 'Please log out and log back in, then try changing your password again.',
    severity: 'warning',
    requiresReauth: true,
    suggestedAction: 'reauthenticate'
  },
  'auth/weak-password': {
    message: 'Password is too weak. Please use a stronger password.',
    action: 'Password must be at least 8 characters and include uppercase, lowercase, numbers, and special characters.',
    severity: 'error'
  },
  'auth/missing-password': {
    message: 'Password is required.',
    action: 'Please enter a password.',
    severity: 'error'
  },
  'auth/credential-already-in-use': {
    message: 'This email is already associated with another account.',
    action: 'You may link your accounts instead. Try signing in with your existing account first.',
    severity: 'error'
  },

  // Account creation errors
  'auth/email-already-in-use': {
    message: 'An account with this email already exists.',
    action: 'Try logging in instead, or use a different email.',
    severity: 'error'
  },
  'auth/invalid-display-name': {
    message: 'Please enter a valid display name.',
    severity: 'error'
  },
  'auth/admin-restricted-operation': {
    message: 'This operation is restricted by the administrator.',
    action: 'Please contact support for assistance.',
    severity: 'error'
  },
  'auth/argument-error': {
    message: 'Invalid request parameters.',
    action: 'Please check your input and try again.',
    severity: 'error'
  },
  'auth/app-not-authorized': {
    message: 'This app is not authorized to use Firebase Authentication.',
    action: 'Please contact support.',
    severity: 'error'
  },
  'auth/invalid-api-key': {
    message: 'Invalid API key.',
    action: 'Please contact support.',
    severity: 'error'
  },
  'auth/operation-not-supported-in-this-environment': {
    message: 'This operation is not supported in this environment.',
    action: 'Please try again or contact support.',
    severity: 'error'
  },

  // Network and connectivity errors
  'auth/network-request-failed': {
    message: 'Network connection failed.',
    action: 'Check your internet connection and try again.',
    severity: 'error'
  },
  'auth/timeout': {
    message: 'Request timed out.',
    action: 'Please try again.',
    severity: 'warning'
  },

  // Social login errors
  'auth/popup-blocked': {
    message: 'Pop-up was blocked by your browser.',
    action: 'Please allow pop-ups for this site and try again.',
    severity: 'warning'
  },
  'auth/popup-closed-by-user': {
    message: 'Sign-in was cancelled.',
    action: 'Please try again if you want to sign in.',
    severity: 'info'
  },
  'auth/cancelled-popup-request': {
    message: 'Sign-in was cancelled.',
    action: 'Please try again if you want to sign in.',
    severity: 'info'
  },
  'auth/unauthorized-domain': {
    message: 'This domain is not authorized for authentication.',
    action: 'Please contact support.',
    severity: 'error'
  },
  'auth/account-exists-with-different-credential': {
    message: 'An account already exists with this email.',
    action: 'You can link your accounts to use multiple sign-in methods.',
    severity: 'info'
  },

  // OAuth reauthentication errors
  'auth/user-cancelled-login': {
    message: 'You cancelled the authentication.',
    action: 'Please try again to verify your identity.',
    severity: 'info'
  },

  // Token and session errors
  'auth/expired-action-code': {
    message: 'This link has expired.',
    action: 'Please request a new verification link.',
    severity: 'warning'
  },
  'auth/invalid-action-code': {
    message: 'This link is invalid.',
    action: 'Please check the link or request a new one.',
    severity: 'error'
  },
  'auth/user-token-expired': {
    message: 'Your session has expired.',
    action: 'Please log in again.',
    severity: 'warning',
    requiresReauth: true,
    suggestedAction: 'login'
  },

  // Permission and quota errors
  'auth/quota-exceeded': {
    message: 'Too many requests. Please try again later.',
    action: 'Wait a few minutes before trying again.',
    severity: 'warning'
  },
  'auth/app-deleted': {
    message: 'Application configuration error.',
    action: 'Please contact support.',
    severity: 'error'
  },

  // Multi-factor authentication errors
  'auth/multi-factor-auth-required': {
    message: 'Multi-factor authentication is required.',
    action: 'Complete the additional verification step.',
    severity: 'info'
  },
  'auth/multi-factor-info-not-found': {
    message: 'Multi-factor authentication information not found.',
    action: 'Please set up multi-factor authentication.',
    severity: 'error'
  },

  // Generic fallback
  'default': {
    message: 'An unexpected error occurred.',
    action: 'Please try again or contact support if the problem persists.',
    severity: 'error'
  }
};

/**
 * Get user-friendly error message and recovery suggestions for Firebase auth errors
 */
export function getAuthErrorMessage(error: unknown): AuthErrorResult {
  let errorCode = 'default';
  let originalMessage = 'Unknown error';

  // Extract error code from different error formats
  if (error && typeof error === 'object') {
    if ('code' in error && typeof error.code === 'string') {
      errorCode = error.code;
    }
    if ('message' in error && typeof error.message === 'string') {
      originalMessage = error.message;
    }
  } else if (typeof error === 'string') {
    originalMessage = error;
    // Try to extract Firebase error code from string
    const codeMatch = error.match(/auth\/[\w-]+/);
    if (codeMatch) {
      errorCode = codeMatch[0];
    }
  }

  // Get mapped error or fallback to default
  const mappedError = AUTH_ERROR_MESSAGES[errorCode] || AUTH_ERROR_MESSAGES.default;

  return {
    ...mappedError,
    originalCode: errorCode !== 'default' ? errorCode : undefined
  };
}

/**
 * Check if an error requires reauthentication
 */
export function requiresReauthentication(error: unknown): boolean {
  const errorResult = getAuthErrorMessage(error);
  return errorResult.requiresReauth === true;
}

/**
 * Get suggested recovery action for an error
 */
export function getRecoveryAction(error: unknown): string | undefined {
  const errorResult = getAuthErrorMessage(error);
  return errorResult.suggestedAction;
}

/**
 * Check if error is network-related and can be retried
 */
export function isRetryableError(error: unknown): boolean {
  const errorResult = getAuthErrorMessage(error);
  const retryableCodes = [
    'auth/network-request-failed',
    'auth/timeout',
    'auth/too-many-requests',
    'auth/quota-exceeded'
  ];
  
  return retryableCodes.includes(errorResult.originalCode || '');
}

/**
 * Check if error is related to user input validation
 */
export function isValidationError(error: unknown): boolean {
  const errorResult = getAuthErrorMessage(error);
  const validationCodes = [
    'auth/invalid-email',
    'auth/weak-password',
    'auth/missing-password',
    'auth/invalid-display-name'
  ];
  
  return validationCodes.includes(errorResult.originalCode || '');
}

/**
 * Get error severity level
 */
export function getErrorSeverity(error: unknown): 'error' | 'warning' | 'info' {
  const errorResult = getAuthErrorMessage(error);
  return errorResult.severity;
}

/**
 * Format error for display in UI components
 */
export function formatErrorForDisplay(error: unknown): {
  message: string;
  action?: string;
  canRetry: boolean;
  severity: 'error' | 'warning' | 'info';
} {
  const errorResult = getAuthErrorMessage(error);
  
  return {
    message: errorResult.message,
    action: errorResult.action,
    canRetry: isRetryableError(error),
    severity: errorResult.severity
  };
}

/**
 * Log authentication error with context
 */
export function logAuthError(error: unknown, context: string, additionalData?: Record<string, unknown>): void {
  const errorResult = getAuthErrorMessage(error);console.error('Original Error:', error);console.log('Suggested Action:', errorResult.action);if (additionalData) {}// In production, you might want to send this to an error tracking service
  if (process.env.NODE_ENV === 'production' && errorResult.severity === 'error') {
    // Example: Send to error tracking service
    // errorTrackingService.captureException(error, { context, ...additionalData });
  }
}

export default {
  getAuthErrorMessage,
  requiresReauthentication,
  getRecoveryAction,
  isRetryableError,
  isValidationError,
  getErrorSeverity,
  formatErrorForDisplay,
  logAuthError
};