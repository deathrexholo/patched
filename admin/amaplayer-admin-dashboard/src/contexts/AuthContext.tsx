import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  AuthError
} from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdminStatus = async (user: User | null) => {
    if (!user || !user.uid) {
      setIsAdmin(false);
      return;
    }

    try {
      // Query Firestore admins collection by UID (matches Firebase Rules)
      const adminDoc = await getDoc(doc(db, 'admins', user.uid));

      if (adminDoc.exists()) {
        const adminData = adminDoc.data();
        setIsAdmin(adminData.active === true);
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  const login = async (email: string, password: string): Promise<void> => {
    try {
      if (!auth) {
        throw new Error('Firebase Authentication not configured. Please check your Firebase settings.');
      }

      // Authenticate user with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user.email) {
        await signOut(auth);
        throw new Error('User email not found.');
      }

      // Verify user is in admins collection and is active
      try {
        // Check admin status using UID (matches Firebase Rules)
        console.log('🔍 Checking admin status for UID:', user.uid);
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));

        console.log('📄 Admin document exists:', adminDoc.exists());

        if (!adminDoc.exists()) {
          console.log('❌ Admin document not found for UID:', user.uid);
          await signOut(auth);
          throw new Error(`Access denied. User is not authorized as an admin.`);
        }

        const adminData = adminDoc.data();
        console.log('✅ Admin document data:', adminData);

        if (adminData.active !== true) {
          console.log('❌ Admin account inactive. Active flag:', adminData.active);
          await signOut(auth);
          throw new Error('Access denied. Your admin account is inactive.');
        }

        // All checks passed, user is authenticated and authorized
        setCurrentUser(user);
        setIsAdmin(true);
        console.log('✅ Admin logged in successfully');
      } catch (firestoreError: any) {
        // If it's our authorization error, rethrow it
        if (firestoreError.message.includes('Access denied') || firestoreError.message.includes('not authorized')) {
          throw firestoreError;
        }
        // If it's a permission error from Firestore rules, provide helpful message
        if (firestoreError.code === 'permission-denied' || firestoreError.message.includes('Missing or insufficient permissions')) {
          console.error('🔐 Firestore permission denied:', firestoreError);
          await signOut(auth);
          throw new Error('Admin verification failed: Firestore access denied. Please check security rules allow admin reads.');
        }
        // If it's a Firestore error, provide context
        console.error('🔥 Firestore error:', firestoreError);
        await signOut(auth);
        throw new Error(`Failed to verify admin status: ${firestoreError.message}`);
      }
    } catch (error) {
      const authError = error as any;
      console.error('Login error:', authError.message);
      throw new Error(authError.message);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      if (!auth) {
        console.warn('Firebase Authentication not configured');
        return;
      }

      await signOut(auth);
      setCurrentUser(null);
      setIsAdmin(false);
      console.log('Admin logged out successfully');
    } catch (error) {
      const authError = error as AuthError;
      console.error('Logout error:', authError.message);
      throw new Error(authError.message);
    }
  };

  useEffect(() => {
    if (!auth) {
      console.warn('Firebase Auth not initialized');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      await checkAdminStatus(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    login,
    logout,
    loading,
    isAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};