// Comprehensive error tracking utility for upload debugging

class ErrorTracker {
  errors: any[];
  isRecording: boolean;

  constructor() {
    this.errors = [];
    this.isRecording = false;
  }

  startRecording() {
    this.isRecording = true;
    this.errors = [];}

  stopRecording() {
    this.isRecording = false;}

  trackError(error, context = {}) {
    if (!this.isRecording) return;

    const errorData = {
      timestamp: new Date().toISOString(),
      message: error.message || 'Unknown error',
      code: error.code || null,
      stack: error.stack || null,
      context: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        ...context
      }
    };

    this.errors.push(errorData);
    console.error('📍 Error tracked:', errorData);
  }

  trackUploadAttempt(file, uploadType) {
    if (!this.isRecording) return;

    const attemptData = {
      timestamp: new Date().toISOString(),
      type: 'upload_attempt',
      uploadType,
      file: {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      }
    };

    this.errors.push(attemptData);}

  trackUploadProgress(progress, context = {}) {
    if (!this.isRecording) return;

    const progressData = {
      timestamp: new Date().toISOString(),
      type: 'upload_progress',
      progress,
      context
    };

    // Only log significant progress milestones to avoid spam
    if (progress % 25 === 0 || progress === 100) {
      this.errors.push(progressData);}
  }

  trackSuccess(operation, data = {}) {
    if (!this.isRecording) return;

    const successData = {
      timestamp: new Date().toISOString(),
      type: 'success',
      operation,
      data
    };

    this.errors.push(successData);}

  getReport() {
    const report = {
      totalEvents: this.errors.length,
      errors: this.errors.filter(e => e.type !== 'success' && e.type !== 'upload_progress' && e.type !== 'upload_attempt'),
      successes: this.errors.filter(e => e.type === 'success'),
      attempts: this.errors.filter(e => e.type === 'upload_attempt'),
      progress: this.errors.filter(e => e.type === 'upload_progress'),
      timeline: this.errors.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    };

    return report;
  }

  exportReport() {
    const report = this.getReport();
    const reportText = JSON.stringify(report, null, 2);
    
    const blob = new Blob([reportText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `upload-error-report-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);return report;
  }

  clear() {
    this.errors = [];}
}

// Global error tracker instance
export const errorTracker = new ErrorTracker();

// Auto-track unhandled errors
window.addEventListener('error', (event) => {
  errorTracker.trackError(event.error, {
    type: 'unhandled_error',
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

window.addEventListener('unhandledrejection', (event) => {
  errorTracker.trackError(event.reason, {
    type: 'unhandled_promise_rejection'
  });
});

// Firebase-specific error codes and solutions
export const FIREBASE_ERROR_SOLUTIONS = {
  'storage/unauthorized': {
    problem: 'User does not have permission to access the storage bucket',
    solution: 'Update Firebase Storage Rules to allow authenticated uploads',
    code: `
// Add this to Firebase Storage Rules:
match /posts/{allPaths=**} {
  allow read, write: if request.auth != null;
}`
  },
  'storage/unauthenticated': {
    problem: 'User is not authenticated',
    solution: 'Ensure user is logged in before attempting upload',
    code: 'Check currentUser state and redirect to login if null'
  },
  'storage/quota-exceeded': {
    problem: 'Firebase Storage quota exceeded',
    solution: 'Upgrade Firebase plan or clean up unused files',
    code: 'Monitor storage usage in Firebase Console'
  },
  'storage/invalid-format': {
    problem: 'File format not supported or corrupted',
    solution: 'Check file type and ensure it matches allowed formats',
    code: 'Validate file.type before upload'
  },
  'storage/retry-limit-exceeded': {
    problem: 'Upload failed after multiple retries',
    solution: 'Check network connection and file size',
    code: 'Implement exponential backoff retry logic'
  }
};

export const getErrorSolution = (errorCode) => {
  return FIREBASE_ERROR_SOLUTIONS[errorCode] || {
    problem: 'Unknown Firebase error',
    solution: 'Check Firebase documentation for this error code',
    code: 'console.log(error) for more details'
  };
};

export default errorTracker;