/**
 * Configuration validation utilities
 */

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

/**
 * Validate Firebase configuration
 */
export function validateFirebaseConfig(config: FirebaseConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.apiKey) {
    errors.push('Firebase API key is required');
  }

  if (!config.authDomain) {
    errors.push('Firebase auth domain is required');
  }

  if (!config.projectId) {
    errors.push('Firebase project ID is required');
  }

  if (!config.storageBucket) {
    errors.push('Firebase storage bucket is required');
  }

  if (!config.messagingSenderId) {
    errors.push('Firebase messaging sender ID is required');
  }

  if (!config.appId) {
    errors.push('Firebase app ID is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate environment variables
 */
export function validateEnvironment(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const requiredEnvVars = [
    'REACT_APP_FIREBASE_API_KEY',
    'REACT_APP_FIREBASE_AUTH_DOMAIN',
    'REACT_APP_FIREBASE_PROJECT_ID',
    'REACT_APP_FIREBASE_STORAGE_BUCKET',
    'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
    'REACT_APP_FIREBASE_APP_ID'
  ];

  requiredEnvVars.forEach(envVar => {
    if (!process.env[envVar]) {
      errors.push(`Environment variable ${envVar} is required`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}