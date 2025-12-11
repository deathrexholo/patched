// Firebase configuration for the events database
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { Firestore, getFirestore } from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || '',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.REACT_APP_FIREBASE_APP_ID || '',
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

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
  eventsDb = getFirestore(eventsApp, 'events');} catch (err) {
  console.error('❌ Failed to initialize events database:', err);
  throw err;
}

// Get storage from the main app (same bucket for both databases)
export const eventsStorage: FirebaseStorage = getStorage(eventsApp);

export { eventsDb, eventsApp };
export default eventsDb;
