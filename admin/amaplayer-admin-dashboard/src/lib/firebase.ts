// Re-export from the main Firebase config to avoid duplicate initialization
export { auth, db, storage, default as app } from '../firebase/config';

// Mock implementations for optional services
export const messaging = null;
export const analytics = null;
export const getToken = () => Promise.resolve('');
export const onMessage = () => () => {};
