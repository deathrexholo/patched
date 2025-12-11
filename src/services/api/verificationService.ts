// User Verification Service - Handle verification requests and voting
import { db } from '../../lib/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

interface UserProfile {
  displayName?: string;
  photoURL?: string;
  role?: string;
  name?: string;
  age?: number | null;
  bio?: string;
  location?: string;
  sport?: string;
  achievements?: string[];
  certificates?: string[];
}

interface UserVideo {
  id?: string;
  videoUrl?: string;
  metadata?: {
    thumbnail?: string;
    durationFormatted?: string;
  };
  fileName?: string;
  uploadedAt?: any;
}

interface ShowcaseVideo {
  id: string;
  videoUrl: string;
  thumbnail: string;
  fileName: string;
  uploadedAt: any;
  duration: string;
}

interface VerificationRequest {
  id?: string;
  verificationId: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL: string;
  userRole: string;
  userInfo: {
    name: string;
    age: number | null;
    bio: string;
    location: string;
    sport: string;
    achievements: string[];
    certificates: string[];
  };
  showcaseVideos: ShowcaseVideo[];
  verificationCount: number;
  verificationGoal: number;
  verifiedBy: any[];
  status: 'pending' | 'verified' | 'rejected' | 'expired';
  createdAt: any;
  expiresAt: Date;
  isPublic: boolean;
  shareableLink: string;
  verificationIPs: string[];
  flagged: boolean;
  flagReason: string | null;
}

interface VoterInfo {
  ip?: string;
  userAgent?: string;
  referrer?: string;
}

interface VerificationResult {
  success: boolean;
  newCount: number;
  isComplete: boolean;
  remaining: number;
}

interface VerificationStats {
  current: number;
  goal: number;
  remaining: number;
  percentage: number;
  isComplete: boolean;
  status: string;
}

interface CanRequestResult {
  canRequest: boolean;
  reason?: string;
  existingRequest?: VerificationRequest;
}

export class VerificationService {
  
  // Create a verification request
  static async createVerificationRequest(
    userId: string,
    userProfile: UserProfile,
    userVideos: UserVideo[]
  ): Promise<VerificationRequest> {
    try {
      // Check if user already has a pending or approved verification
      const existingRequest = await this.getUserVerificationRequest(userId);
      if (existingRequest && existingRequest.status !== 'rejected') {
        throw new Error('You already have a pending or approved verification request');
      }

      // Generate unique verification ID
      const verificationId = `verify_${userId}_${Date.now()}`;
      
      const verificationData: Omit<VerificationRequest, 'id'> = {
        verificationId,
        userId,
        userDisplayName: userProfile.displayName || 'Anonymous User',
        userPhotoURL: userProfile.photoURL || '',
        userRole: userProfile.role || 'athlete',
        
        // User info for verification page
        userInfo: {
          name: userProfile.name || userProfile.displayName || '',
          age: userProfile.age || null,
          bio: userProfile.bio || '',
          location: userProfile.location || '',
          sport: userProfile.sport || '',
          achievements: userProfile.achievements || [],
          certificates: userProfile.certificates || []
        },
        
        // Videos for showcase (limit to 5 most recent)
        showcaseVideos: userVideos.slice(0, 5).map(video => ({
          id: video.id || '',
          videoUrl: video.videoUrl || '',
          thumbnail: video.metadata?.thumbnail || '',
          fileName: video.fileName || '',
          uploadedAt: video.uploadedAt || null,
          duration: video.metadata?.durationFormatted || '0:00'
        })),
        
        // Verification tracking
        verificationCount: 0,
        verificationGoal: 4, // Need 4 verifications
        verifiedBy: [], // Array of IPs/user identifiers who verified
        
        // Status and timestamps
        status: 'pending',
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        
        // Public link info
        isPublic: true,
        shareableLink: this.generateShareableLink(verificationId),
        
        // Anti-fraud tracking
        verificationIPs: [],
        flagged: false,
        flagReason: null
      };

      // Save to verificationRequests collectionconst docRef = await addDoc(collection(db, 'verificationRequests'), verificationData);return {
        ...verificationData,
        id: docRef.id
      };
    } catch (error) {
      console.error('Error creating verification request:', error);
      console.error('Error details:', {
        code: (error as any).code,
        message: (error as Error).message,
        details: (error as any).details
      });
      throw new Error(`Failed to create verification request: ${(error as Error).message}`);
    }
  }

  // Get user's verification request
  static async getUserVerificationRequest(userId: string): Promise<VerificationRequest | null> {
    try {
      const q = query(
        collection(db, 'verificationRequests'),
        where('userId', '==', userId),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return null;
      }
      
      const docSnap = snapshot.docs[0];
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as VerificationRequest;
    } catch (error) {
      console.error('Error getting verification request:', error);
      return null;
    }
  }

  // Get verification request by ID (for public verification page)
  static async getVerificationRequest(verificationId: string): Promise<VerificationRequest | null> {
    try {const q = query(
        collection(db, 'verificationRequests'),
        where('verificationId', '==', verificationId),
        limit(1)
      );
      
      const snapshot = await getDocs(q);if (snapshot.empty) {return null;
      }
      
      const docSnap = snapshot.docs[0];
      const data = docSnap.data();
      
      // Check if verification has expired
      const now = new Date();
      const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
      
      if (now > expiresAt && data.status === 'pending') {
        // Mark as expired
        await updateDoc(docSnap.ref, { status: 'expired' });
        return null;
      }
      
      return {
        id: docSnap.id,
        ...data
      } as VerificationRequest;
    } catch (error) {
      console.error('Error getting verification request:', error);
      return null;
    }
  }

  // Submit a verification vote
  static async submitVerification(
    verificationId: string,
    voterInfo: VoterInfo
  ): Promise<VerificationResult> {
    try {
      const verificationDoc = await this.getVerificationRequest(verificationId);
      if (!verificationDoc) {
        throw new Error('Verification request not found or expired');
      }

      if (verificationDoc.status !== 'pending') {
        throw new Error('This verification request is no longer active');
      }

      // Check if IP has already verified (basic fraud prevention)
      const voterIP = voterInfo.ip || 'unknown';
      if (verificationDoc.verificationIPs.includes(voterIP)) {
        throw new Error('You have already verified this user');
      }

      // Create verification record
      const verificationData = {
        verificationId,
        userId: verificationDoc.userId,
        voterIP,
        voterInfo: {
          userAgent: voterInfo.userAgent || '',
          timestamp: serverTimestamp(),
          referrer: voterInfo.referrer || ''
        },
        verifiedAt: serverTimestamp()
      };

      // Add to verifications collection
      await addDoc(collection(db, 'verifications'), verificationData);

      // Update verification request
      const updatedCount = verificationDoc.verificationCount + 1;
      const updateData: any = {
        verificationCount: updatedCount,
        verificationIPs: [...verificationDoc.verificationIPs, voterIP],
        verifiedBy: [...verificationDoc.verifiedBy, {
          ip: voterIP,
          timestamp: new Date(),
          userAgent: voterInfo.userAgent || ''
        }]
      };

      // Check if verification is complete (reached goal)
      if (updatedCount >= verificationDoc.verificationGoal) {
        updateData.status = 'verified';
        updateData.verifiedAt = serverTimestamp();
        
        // Update user profile with verification badge
        await this.updateUserVerificationStatus(verificationDoc.userId, verificationDoc.userRole);
      }

      // Update verification request
      const q = query(
        collection(db, 'verificationRequests'),
        where('verificationId', '==', verificationId),
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        await updateDoc(snapshot.docs[0].ref, updateData);
      }

      return {
        success: true,
        newCount: updatedCount,
        isComplete: updatedCount >= verificationDoc.verificationGoal,
        remaining: Math.max(0, verificationDoc.verificationGoal - updatedCount)
      };
    } catch (error) {
      console.error('Error submitting verification:', error);
      throw error;
    }
  }

  // Update user's verification status in their profile
  static async updateUserVerificationStatus(userId: string, role: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isVerified: true,
        verificationBadge: this.getRoleBadge(role),
        verifiedAt: serverTimestamp(),
        verifiedRole: role
      });
    } catch (error) {
      console.error('Error updating user verification status:', error);
    }
  }

  // Get role-specific badge
  static getRoleBadge(role: string): { icon: string; label: string } {
    const badges: Record<string, { icon: string; label: string }> = {
      athlete: { icon: '🏆', label: 'Verified Athlete' },
      coach: { icon: '🏃‍♂️', label: 'Verified Coach' },
      organisation: { icon: '🏢', label: 'Verified Organization' }
    };
    return badges[role] || badges.athlete;
  }

  // Generate shareable verification link
  static generateShareableLink(verificationId: string): string {
    // Check if we're in browser environment
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/verify/${verificationId}`;
    }

    // Fallback for server-side rendering or development
    const productionUrl = process.env.REACT_APP_PRODUCTION_URL || 'https://amaplay007.web.app';
    return `${productionUrl}/verify/${verificationId}`;
  }

  // Get verification statistics
  static async getVerificationStats(verificationId: string): Promise<VerificationStats | null> {
    try {
      const verificationDoc = await this.getVerificationRequest(verificationId);
      if (!verificationDoc) {
        return null;
      }

      return {
        current: verificationDoc.verificationCount,
        goal: verificationDoc.verificationGoal,
        remaining: Math.max(0, verificationDoc.verificationGoal - verificationDoc.verificationCount),
        percentage: Math.min(100, (verificationDoc.verificationCount / verificationDoc.verificationGoal) * 100),
        isComplete: verificationDoc.verificationCount >= verificationDoc.verificationGoal,
        status: verificationDoc.status
      };
    } catch (error) {
      console.error('Error getting verification stats:', error);
      return null;
    }
  }

  // Check if user can request verification
  static async canRequestVerification(userId: string): Promise<CanRequestResult> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        return { canRequest: false, reason: 'User profile not found' };
      }

      const userData = userDoc.data();
      
      // Check if already verified
      if (userData.isVerified) {
        return { canRequest: false, reason: 'Already verified' };
      }

      // Check if has pending request
      const existingRequest = await this.getUserVerificationRequest(userId);
      if (existingRequest && existingRequest.status === 'pending') {
        return { 
          canRequest: false, 
          reason: 'Verification request already pending',
          existingRequest 
        };
      }

      // Check if user has videos to showcase
      const videosQuery = query(
        collection(db, 'talentVideos'),
        where('userId', '==', userId),
        where('verificationStatus', '==', 'approved'),
        limit(1)
      );
      const videosSnapshot = await getDocs(videosQuery);
      
      if (videosSnapshot.empty) {
        return { 
          canRequest: false, 
          reason: 'You need at least one approved talent video to request verification' 
        };
      }

      return { canRequest: true };
    } catch (error) {
      console.error('Error checking verification eligibility:', error);
      return { canRequest: false, reason: 'Error checking eligibility' };
    }
  }
}

export default VerificationService;
