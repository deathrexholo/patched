import { db } from '../../lib/firebase';
import { doc, setDoc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { COLLECTIONS } from '../../constants/firebase';
import { ParentProfile, Parent, CreateParentData } from '../../types/models/parent';

class ParentsService {
  private collectionName = COLLECTIONS.PARENTS;

  /**
   * Calculate child's age from date of birth in DD-MM-YYYY format
   */
  private calculateAge(dateOfBirth: string): number {
    const [day, month, year] = dateOfBirth.split('-').map(Number);
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  /**
   * Create a new parent profile in the parents collection
   */
  async createParentProfile(uid: string, data: Partial<CreateParentData>): Promise<void> {
    const parentRef = doc(db, this.collectionName, uid);

    // Calculate child's age from date of birth
    const age = this.calculateAge(data.child?.dateOfBirth || '');

    const parentProfile: ParentProfile = {
      uid,
      email: data.email!,
      role: 'parent',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),

      // Parent Information
      parentFullName: data.parentFullName!,
      relationshipToChild: data.relationshipToChild!,
      mobileNumber: data.mobileNumber!,
      ...(data.photoURL && { photoURL: data.photoURL }),

      // Child Information
      child: {
        ...data.child!,
        age
      },

      // Sports Details
      sports: data.sports!,

      // Parent Consent
      contentConsent: data.contentConsent!,

      // Optional fields
      ...(data.schoolInfo && { schoolInfo: data.schoolInfo }),
      ...(data.achievements && { achievements: data.achievements }),
      ...(data.aspirations && { aspirations: data.aspirations }),

      // System fields
      isActive: true,
      isVerified: false
    };

    await setDoc(parentRef, parentProfile);
  }

  /**
   * Get parent profile by UID
   */
  async getParentProfile(uid: string): Promise<Parent | null> {
    try {
      const parentRef = doc(db, this.collectionName, uid);
      const parentDoc = await getDoc(parentRef);

      if (!parentDoc.exists()) {
        return null;
      }

      return { id: parentDoc.id, ...parentDoc.data() } as unknown as Parent;
    } catch (error) {
      console.error('Error getting parent profile:', error);
      throw error;
    }
  }

  /**
   * Update parent profile
   */
  async updateParentProfile(uid: string, updates: Partial<ParentProfile>): Promise<void> {
    try {
      const parentRef = doc(db, this.collectionName, uid);

      // Recalculate age if date of birth is updated
      if (updates.child?.dateOfBirth) {
        updates.child.age = this.calculateAge(updates.child.dateOfBirth);
      }

      await updateDoc(parentRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating parent profile:', error);
      throw error;
    }
  }
}

export const parentsService = new ParentsService();
