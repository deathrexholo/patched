import { User as FirebaseUser } from 'firebase/auth';
import { User } from '../../types/models/user';

/**
 * Adapts Firebase User to our custom User type
 * This is a temporary solution to handle the type mismatch between Firebase User and our custom User type
 */
export function adaptFirebaseUser(firebaseUser: FirebaseUser | null): User | null {
  if (!firebaseUser) return null;

  // Create a basic User object with required properties
  // Some properties are set to default values since Firebase User doesn't have them
  const adaptedUser: User = {
    id: firebaseUser.uid,
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || 'Anonymous User',
    photoURL: firebaseUser.photoURL,
    bio: '',
    location: '',
    website: '',
    username: firebaseUser.displayName || '',
    createdAt: new Date(), // Firebase User doesn't have createdAt, using current date
    updatedAt: new Date(), // Firebase User doesn't have updatedAt, using current date
    postsCount: 0,
    storiesCount: 0,
    isVerified: false,
    isActive: true,
    isOnline: false,
    lastSeen: new Date(),
    privacy: {
      profileVisibility: 'public'
    },
    settings: {
      notifications: true,
      emailNotifications: true,
      pushNotifications: true
    }
  };

  return adaptedUser;
}

/**
 * Type guard to check if a user object is a Firebase User
 */
export function isFirebaseUser(user: any): user is FirebaseUser {
  return user && typeof user.uid === 'string' && !Object.prototype.hasOwnProperty.call(user, 'id');
}

/**
 * Type guard to check if a user object is our custom User type
 */
export function isCustomUser(user: any): user is User {
  return user && typeof user.id === 'string' && typeof user.uid === 'string';
}