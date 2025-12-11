import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
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

console.log('=== Firebase Events Database Configuration ===');
console.log('Project ID:', firebaseConfig.projectId);
console.log('Database ID: events');
console.log('============================================');

// Initialize Firebase app for events database
let eventsApp: FirebaseApp;
const existingApps = getApps();
const eventsAppExists = existingApps.find(app => app.name === 'events-app');

if (eventsAppExists) {
  eventsApp = eventsAppExists;
} else {
  eventsApp = initializeApp(firebaseConfig, 'events-app');
}

// Initialize Firestore with the named 'events' database
let eventsDb: Firestore;
try {
  // Use named 'events' Firestore database
  eventsDb = getFirestore(eventsApp, 'events');
  console.log('✅ Events Database connected (events)');
} catch (err) {
  console.error('❌ Failed to initialize events database:', err);
  throw err;
}

// Get auth and storage (shared with main app)
let auth: Auth | null = null;
let storage: FirebaseStorage | null = null;

try {
  auth = getAuth(eventsApp);
  storage = getStorage(eventsApp);
  console.log('✅ Firebase services initialized for events');
} catch (error: any) {
  console.error('Error initializing Firebase services:', error?.message || error);
}

export { eventsDb, auth, storage, eventsApp };
export default eventsDb;
