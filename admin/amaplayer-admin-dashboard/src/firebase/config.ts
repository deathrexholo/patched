import { initializeApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || 'AIzaSyBAtDdjjEXyxJ0fnXZ8w8UFPsjHq-pL1Rg',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || 'amaplay007.firebaseapp.com',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'amaplay007',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || 'amaplay007.firebasestorage.app',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '750642822137',
  appId: process.env.REACT_APP_FIREBASE_APP_ID || '1:750642822137:web:0b0128bfa8845b850fdb28'
};

// Debug: Log environment variables (sensitive data - remove in production)
console.log('=== Firebase Configuration Debug ===');
console.log('API Key loaded:', !!firebaseConfig.apiKey, firebaseConfig.apiKey?.substring(0, 20) + '...');
console.log('Auth Domain:', firebaseConfig.authDomain);
console.log('Project ID:', firebaseConfig.projectId);
console.log('Storage Bucket:', firebaseConfig.storageBucket);
console.log('Messaging Sender ID:', firebaseConfig.messagingSenderId);
console.log('App ID:', firebaseConfig.appId);
console.log('=====================================');

if (!firebaseConfig.apiKey) {
  console.warn('Firebase API Key not found in environment variables. Please add REACT_APP_FIREBASE_API_KEY to .env file.');
}
if (!firebaseConfig.projectId) {
  console.warn('Firebase Project ID not found in environment variables. Please add REACT_APP_FIREBASE_PROJECT_ID to .env file.');
}

// Initialize Firebase
let app;
try {
  app = initializeApp(firebaseConfig);
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
  // Don't throw - continue with graceful degradation
}

// Export Firebase services with error handling
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

try {
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  console.log('Firebase services initialized successfully');
} catch (error: any) {
  console.error('Error initializing Firebase services:', error?.message || error);
  // Create mock/null services to prevent crashes
  console.warn('Firebase services unavailable - app will run in limited mode');
}

export { auth, db, storage };
export default app;