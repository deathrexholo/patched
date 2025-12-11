/**
 * Optimized Firebase Configuration
 * Lazy loads Firebase services only when needed
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';

// Firebase config
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Events Firebase config
const eventsFirebaseConfig = {
  apiKey: process.env.REACT_APP_EVENTS_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_EVENTS_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_EVENTS_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_EVENTS_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_EVENTS_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_EVENTS_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_EVENTS_FIREBASE_MEASUREMENT_ID
};

// Initialize apps
const app = initializeApp(firebaseConfig);
const eventsApp = initializeApp(eventsFirebaseConfig, 'events');

// Lazy service getters
let authInstance: any = null;
let firestoreInstance: any = null;
let storageInstance: any = null;
let analyticsInstance: any = null;

export const getAuth = async () => {
  if (!authInstance) {
    const { getAuth } = await import('firebase/auth');
    authInstance = getAuth(app);
  }
  return authInstance;
};

export const getFirestore = async () => {
  if (!firestoreInstance) {
    const { getFirestore } = await import('firebase/firestore');
    firestoreInstance = getFirestore(app);
  }
  return firestoreInstance;
};

export const getStorage = async () => {
  if (!storageInstance) {
    const { getStorage } = await import('firebase/storage');
    storageInstance = getStorage(app);
  }
  return storageInstance;
};

export const getAnalytics = async () => {
  if (!analyticsInstance && typeof window !== 'undefined') {
    const { getAnalytics } = await import('firebase/analytics');
    analyticsInstance = getAnalytics(app);
  }
  return analyticsInstance;
};

// Events app services
let eventsFirestoreInstance: any = null;

export const getEventsFirestore = async () => {
  if (!eventsFirestoreInstance) {
    const { getFirestore } = await import('firebase/firestore');
    eventsFirestoreInstance = getFirestore(eventsApp);
  }
  return eventsFirestoreInstance;
};

export { app, eventsApp };