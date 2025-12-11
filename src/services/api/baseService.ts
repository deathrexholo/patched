// Base service class for Firebase operations
import { db } from '../../lib/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  serverTimestamp,
  DocumentSnapshot,
  QueryConstraint,
  WhereFilterOp,
  OrderByDirection,
  CollectionReference,
  DocumentData
} from 'firebase/firestore';

/**
 * Filter configuration for Firestore queries
 */
export interface FirestoreFilter {
  field: string;
  operator: WhereFilterOp;
  value: unknown;
}

/**
 * Paginated result from Firestore query
 */
export interface PaginatedResult<T> {
  documents: T[];
  lastDocument: DocumentSnapshot | null;
  hasMore: boolean;
}

/**
 * Base document structure with common fields
 */
export interface BaseDocument {
  id: string;
  timestamp?: Date | any;
  createdAt?: Date | any;
  updatedAt?: Date | any;
}

/**
 * Base service class providing CRUD operations for Firestore collections
 */
export class BaseService<T extends BaseDocument = BaseDocument> {
  protected collectionName: string;
  protected collection: CollectionReference<DocumentData>;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
    this.collection = collection(db, collectionName);
  }

  /**
   * Create a new document in the collection
   */
  async create(data: Omit<T, 'id'>): Promise<T> {
    try {
      const docRef = await addDoc(this.collection, {
        ...data,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });return { id: docRef.id, ...data } as T;
    } catch (error) {
      console.error(`❌ Error creating ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Get document by ID
   */
  async getById(id: string): Promise<T | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as T;
      } else {
        console.warn(`⚠️ ${this.collectionName} document not found:`, id);
        return null;
      }
    } catch (error) {
      console.error(`❌ Error getting ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Update document by ID
   */
  async update(id: string, data: Partial<Omit<T, 'id'>>): Promise<Partial<T>> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      } as DocumentData);return { id, ...data } as Partial<T>;
    } catch (error) {
      console.error(`❌ Error updating ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Delete document by ID
   */
  async delete(id: string): Promise<boolean> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);return true;
    } catch (error) {
      console.error(`❌ Error deleting ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Get all documents with optional filtering and ordering
   */
  async getAll(
    filters: FirestoreFilter[] = [],
    orderByField: string = 'timestamp',
    orderDirection: OrderByDirection = 'desc',
    limitCount?: number
  ): Promise<T[]> {
    try {
      const constraints: QueryConstraint[] = [];
      
      // Apply filters
      filters.forEach(filter => {
        constraints.push(where(filter.field, filter.operator, filter.value));
      });
      
      // Apply ordering
      constraints.push(orderBy(orderByField, orderDirection));
      
      // Apply limit
      if (limitCount) {
        constraints.push(limit(limitCount));
      }
      
      const q = query(this.collection, ...constraints);
      const querySnapshot = await getDocs(q);
      const documents: T[] = [];
      
      querySnapshot.forEach((doc) => {
        documents.push({ id: doc.id, ...doc.data() } as T);
      });return documents;
    } catch (error) {
      console.error(`❌ Error getting ${this.collectionName} collection:`, error);
      throw error;
    }
  }

  /**
   * Get documents with pagination
   */
  async getPaginated(
    pageSize: number = 10,
    lastDoc: DocumentSnapshot | null = null,
    filters: FirestoreFilter[] = [],
    orderByField: string = 'timestamp'
  ): Promise<PaginatedResult<T>> {
    try {
      const constraints: QueryConstraint[] = [];
      
      // Apply filters
      filters.forEach(filter => {
        constraints.push(where(filter.field, filter.operator, filter.value));
      });
      
      // Apply ordering
      constraints.push(orderBy(orderByField, 'desc'));
      
      // Apply pagination
      if (lastDoc) {
        constraints.push(startAfter(lastDoc));
      }
      
      constraints.push(limit(pageSize));
      
      const q = query(this.collection, ...constraints);
      const querySnapshot = await getDocs(q);
      const documents: T[] = [];
      let lastDocument: DocumentSnapshot | null = null;
      
      querySnapshot.forEach((doc) => {
        documents.push({ id: doc.id, ...doc.data() } as T);
        lastDocument = doc;
      });
      
      return {
        documents,
        lastDocument,
        hasMore: documents.length === pageSize,
      };
    } catch (error) {
      console.error(`❌ Error getting paginated ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Search documents by field value
   */
  async search(searchField: string, searchValue: string, limitCount: number = 20): Promise<T[]> {
    try {
      const q = query(
        this.collection,
        where(searchField, '>=', searchValue),
        where(searchField, '<=', searchValue + '\uf8ff'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const documents: T[] = [];
      
      querySnapshot.forEach((doc) => {
        documents.push({ id: doc.id, ...doc.data() } as T);
      });return documents;
    } catch (error) {
      console.error(`❌ Error searching ${this.collectionName}:`, error);
      throw error;
    }
  }
}
