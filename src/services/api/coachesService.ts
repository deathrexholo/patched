import { db } from '../../lib/firebase';
import { doc, setDoc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { COLLECTIONS } from '../../constants/firebase';
import { CoachProfile, Coach, CreateCoachData } from '../../types/models/coach';

class CoachesService {
  private collectionName = COLLECTIONS.COACHES;

  /**
   * Create a new coach profile in the coaches collection
   */
  async createCoachProfile(uid: string, data: Partial<CreateCoachData>): Promise<void> {
    const coachRef = doc(db, this.collectionName, uid);

    const coachProfile: CoachProfile = {
      uid,
      email: data.email!,
      role: 'coach',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),

      // Professional Details
      fullName: data.fullName!,
      phone: data.phone!,
      sport: data.sport!,
      yearsOfExperience: data.yearsOfExperience!,
      coachingLevel: data.coachingLevel!,
      certifications: data.certifications || '',
      bio: data.bio || '',
      ...(data.photoURL && { photoURL: data.photoURL }),

      // System fields
      isActive: true,
      isVerified: false
    };

    await setDoc(coachRef, coachProfile);
  }

  /**
   * Get coach profile by UID
   */
  async getCoachProfile(uid: string): Promise<Coach | null> {
    try {
      const coachRef = doc(db, this.collectionName, uid);
      const coachDoc = await getDoc(coachRef);

      if (!coachDoc.exists()) {
        return null;
      }

      return { id: coachDoc.id, ...coachDoc.data() } as unknown as Coach;
    } catch (error) {
      console.error('Error getting coach profile:', error);
      throw error;
    }
  }

  /**
   * Update coach profile
   */
  async updateCoachProfile(uid: string, updates: Partial<CoachProfile>): Promise<void> {
    try {
      const coachRef = doc(db, this.collectionName, uid);
      await updateDoc(coachRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating coach profile:', error);
      throw error;
    }
  }
}

export const coachesService = new CoachesService();
