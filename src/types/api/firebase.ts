import { Timestamp, DocumentReference, DocumentSnapshot, QuerySnapshot } from 'firebase/firestore';

/**
 * Firebase Timestamp type that can be either Firestore Timestamp or Date
 */
export type FirebaseTimestamp = Timestamp | Date;

/**
 * Serialized timestamp for JSON serialization
 */
export type SerializedTimestamp = string | Date;

/**
 * Firebase document data with metadata
 */
export interface FirebaseDocument<T> {
  id: string;
  data: T;
  ref: DocumentReference;
  exists: boolean;
  metadata: {
    hasPendingWrites: boolean;
    fromCache: boolean;
  };
}

/**
 * Firebase query result with pagination
 */
export interface FirebaseQueryResult<T> {
  docs: Array<FirebaseDocument<T>>;
  empty: boolean;
  size: number;
  lastDoc?: DocumentSnapshot;
}

/**
 * Firebase batch write operation
 */
export interface FirebaseBatchOperation {
  type: 'set' | 'update' | 'delete';
  ref: DocumentReference;
  data?: Record<string, unknown>;
}

/**
 * Firebase collection query options
 */
export interface FirebaseQueryOptions {
  limit?: number;
  orderBy?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  where?: Array<{
    field: string;
    operator: '<' | '<=' | '==' | '!=' | '>=' | '>' | 'array-contains' | 'array-contains-any' | 'in' | 'not-in';
    value: unknown;
  }>;
  startAfter?: DocumentSnapshot;
  startAt?: DocumentSnapshot;
  endBefore?: DocumentSnapshot;
  endAt?: DocumentSnapshot;
}

/**
 * Firebase real-time listener callback
 */
export type FirebaseListener<T> = (snapshot: QuerySnapshot<T>) => void;

/**
 * Firebase error with code
 */
export interface FirebaseError extends Error {
  code: string;
  message: string;
  customData?: Record<string, unknown>;
}

/**
 * Firebase storage upload metadata
 */
export interface FirebaseUploadMetadata {
  contentType?: string;
  customMetadata?: Record<string, string>;
  cacheControl?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  contentLanguage?: string;
}

/**
 * Firebase storage upload task snapshot
 */
export interface FirebaseUploadSnapshot {
  bytesTransferred: number;
  totalBytes: number;
  state: 'running' | 'paused' | 'success' | 'canceled' | 'error';
  metadata: FirebaseUploadMetadata;
  ref: {
    fullPath: string;
    name: string;
  };
}

/**
 * Firebase authentication user
 */
export interface FirebaseAuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  phoneNumber: string | null;
  providerId: string;
  metadata: {
    creationTime?: string;
    lastSignInTime?: string;
  };
}

/**
 * Firebase configuration
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
 * Firestore converter for type-safe document conversion
 */
export interface FirestoreConverter<T> {
  toFirestore: (data: T) => Record<string, unknown>;
  fromFirestore: (snapshot: DocumentSnapshot) => T;
}

/**
 * Firebase Cloud Function callable result
 */
export interface FirebaseFunctionResult<T> {
  data: T;
}

/**
 * Firebase Cloud Function error
 */
export interface FirebaseFunctionError {
  code: string;
  message: string;
  details?: unknown;
}
