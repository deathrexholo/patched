// Configuration validation utilities

export const validateFirebaseConfig = (config) => {
  const requiredKeys = [
    'apiKey',
    'authDomain', 
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId'
  ];

  const missingKeys = requiredKeys.filter(key => !config[key]);
  
  if (missingKeys.length > 0) {
    const message = `Missing required Firebase configuration: ${missingKeys.join(', ')}`;
    console.error('🔥 Firebase Configuration Error:', message);
    
    if (process.env.NODE_ENV !== 'development') {
      throw new Error(message);
    }
  }

  // Validate format of specific keys
  if (config.projectId && !/^[a-z0-9-]+$/.test(config.projectId)) {
    console.warn('⚠️ Firebase project ID format may be incorrect');
  }

  if (config.appId && !config.appId.includes(':web:')) {
    console.warn('⚠️ Firebase app ID format may be incorrect');
  }return true;
};

export const validateEnvironment = () => {
  const requiredEnvVars = [
    'REACT_APP_FIREBASE_API_KEY',
    'REACT_APP_FIREBASE_PROJECT_ID'
  ];

  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

  if (missingEnvVars.length > 0) {
    const message = `Missing required environment variables: ${missingEnvVars.join(', ')}`;
    console.error('🌍 Environment Configuration Error:', message);
    
    if (process.env.NODE_ENV === 'production') {
      throw new Error(message);
    }
  }

  return true;
};