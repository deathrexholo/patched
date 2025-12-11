// Centralized error handling and logging system

type ErrorSeverity = 'error' | 'warning' | 'critical' | 'info';
type ErrorType = 'auth' | 'firebase' | 'network' | 'ui' | 'unknown';

interface ErrorInfo {
  timestamp: string;
  message: string;
  stack?: string;
  context: string;
  severity: ErrorSeverity;
  userAgent: string;
  url: string;
  userId: string;
  errorType?: ErrorType;
  firebaseCode?: string;
  [key: string]: unknown;
}

interface ErrorStats {
  total: number;
  byContext: Record<string, number>;
  bySeverity: Record<string, number>;
  recent: ErrorInfo[];
}

interface AdditionalErrorData {
  userId?: string;
  errorType?: ErrorType;
  firebaseCode?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  [key: string]: unknown;
}

class ErrorHandler {
  private isDevelopment: boolean;
  private errorQueue: ErrorInfo[];
  private maxQueueSize: number;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.errorQueue = [];
    this.maxQueueSize = 50;
  }

  // Log error with context and severity
  logError(
    error: Error | string,
    context: string = 'Unknown',
    severity: ErrorSeverity = 'error',
    additionalData: AdditionalErrorData = {}
  ): ErrorInfo {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = typeof error === 'string' ? undefined : error.stack;

    const errorInfo: ErrorInfo = {
      timestamp: new Date().toISOString(),
      message: errorMessage,
      stack: errorStack,
      context,
      severity,
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: additionalData.userId || 'anonymous',
      ...additionalData
    };

    // Add to queue
    this.addToQueue(errorInfo);

    // Console logging based on environment
    if (this.isDevelopment) {console.error('Error:', error);console.log('Stack:', errorStack);} else {
      // Production: Only log critical errors to console
      if (severity === 'critical') {
        console.error(`[CRITICAL] ${context}:`, errorMessage);
      }
    }

    // Send to analytics service (implement based on your analytics provider)
    this.sendToAnalytics(errorInfo);

    return errorInfo;
  }

  // Add error to local queue for batch processing
  private addToQueue(errorInfo: ErrorInfo): void {
    this.errorQueue.push(errorInfo);

    // Keep queue size manageable
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }

    // Auto-flush queue every 10 errors or 5 minutes
    if (this.errorQueue.length >= 10) {
      this.flushErrorQueue();
    }
  }

  // Send error data to analytics/monitoring service
  private sendToAnalytics(errorInfo: ErrorInfo): void {
    try {
      // For now, store in localStorage for development
      // Replace with your analytics service (Firebase Analytics, Sentry, etc.)
      if (this.isDevelopment) {
        const existingErrors = JSON.parse(localStorage.getItem('amaplayer_errors') || '[]') as ErrorInfo[];
        existingErrors.push(errorInfo);

        // Keep only last 100 errors in localStorage
        if (existingErrors.length > 100) {
          existingErrors.splice(0, existingErrors.length - 100);
        }

        localStorage.setItem('amaplayer_errors', JSON.stringify(existingErrors));
      }

      // TODO: Implement real analytics service
      // Example: Firebase Analytics
      // analytics.logEvent('app_error', {
      //   error_context: errorInfo.context,
      //   error_severity: errorInfo.severity,
      //   error_message: errorInfo.message
      // });
    } catch (e) {
      // Fail silently to prevent error loops
    }
  }

  // Flush error queue (for batch sending)
  flushErrorQueue(): void {
    if (this.errorQueue.length === 0) return;

    try {
      // Send batch of errors to your monitoring service// Clear queue after successful send
      this.errorQueue = [];
    } catch (e) {
      // Keep errors in queue if sending fails
      console.warn('Failed to flush error queue:', e);
    }
  }

  // Handle different types of errors
  handleAuthError(error: Error | string, additionalData: AdditionalErrorData = {}): ErrorInfo {
    return this.logError(error, 'Authentication', 'warning', {
      ...additionalData,
      errorType: 'auth'
    });
  }

  handleFirebaseError(error: Error & { code?: string }, operation: string, additionalData: AdditionalErrorData = {}): ErrorInfo {
    const severity: ErrorSeverity = error.code?.includes('permission-denied') ? 'critical' : 'error';
    return this.logError(error, `Firebase-${operation}`, severity, {
      ...additionalData,
      errorType: 'firebase',
      firebaseCode: error.code
    });
  }

  handleNetworkError(error: Error | string, endpoint: string, additionalData: AdditionalErrorData = {}): ErrorInfo {
    return this.logError(error, `Network-${endpoint}`, 'warning', {
      ...additionalData,
      errorType: 'network'
    });
  }

  handleUIError(error: Error | string, component: string, additionalData: AdditionalErrorData = {}): ErrorInfo {
    return this.logError(error, `UI-${component}`, 'error', {
      ...additionalData,
      errorType: 'ui'
    });
  }

  // Get error statistics for debugging
  getErrorStats(): ErrorStats {
    try {
      const errors = JSON.parse(localStorage.getItem('amaplayer_errors') || '[]') as ErrorInfo[];
      const stats: ErrorStats = {
        total: errors.length,
        byContext: {},
        bySeverity: {},
        recent: errors.slice(-10)
      };

      errors.forEach(error => {
        stats.byContext[error.context] = (stats.byContext[error.context] || 0) + 1;
        stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      });

      return stats;
    } catch (e) {
      return { total: 0, byContext: {}, bySeverity: {}, recent: [] };
    }
  }

  // Clear error logs (for development)
  clearErrorLogs(): void {
    localStorage.removeItem('amaplayer_errors');
    this.errorQueue = [];}
}

// Create singleton instance
const errorHandler = new ErrorHandler();

// Global error handlers
window.addEventListener('error', (event: ErrorEvent) => {
  errorHandler.logError(event.error || new Error(event.message), 'Global-Error', 'critical', {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  errorHandler.logError(event.reason, 'Unhandled-Promise', 'critical');
});

// Flush errors before page unload
window.addEventListener('beforeunload', () => {
  errorHandler.flushErrorQueue();
});

export default errorHandler;
