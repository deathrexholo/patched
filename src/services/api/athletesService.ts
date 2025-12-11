import { db } from '../../lib/firebase';
import { doc, setDoc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { COLLECTIONS } from '../../constants/firebase';

export interface AthleteProfile {
  uid: string;
  email: string;
  role: 'athlete';
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Personal Details
  fullName: string;
  dateOfBirth: string;
  age: number;
  gender: string;
  phone: string;
  photoURL?: string;
  coverPhotoURL?: string;

  // Location
  state: string;
  city: string;
  country: string;

  // Sports Details
  sports: {
    primary: string;
    secondary?: string;
    position?: string;
    skillLevel?: string;
  };

  // Additional
  bio?: string;

  // System fields
  isActive: boolean;
  isVerified: boolean;
}

export interface Athlete extends AthleteProfile {
  id: string;
}

export interface CreateAthleteData {
  uid: string;
  email: string;
  photoURL?: string | null;
  role: 'athlete';

  fullName: string;
  dateOfBirth: string;
  age: number;
  gender: string;
  phone: string;
  state: string;
  city: string;
  country: string;
  sports: {
    primary: string;
    secondary?: string;
    position?: string;
    skillLevel?: string;
  };
  bio?: string;
  coverPhotoURL?: string;
}

class AthletesService {
  private collectionName = COLLECTIONS.ATHLETES;

  /**
   * Create a new athlete profile in the athletes collection
   */
  async createAthleteProfile(uid: string, data: Partial<CreateAthleteData>): Promise<void> {
    const athleteRef = doc(db, this.collectionName, uid);

    const athleteProfile: AthleteProfile = {
      uid,
      email: data.email!,
      role: 'athlete',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),

      // Personal Details
      fullName: data.fullName!,
      dateOfBirth: data.dateOfBirth!,
      age: data.age!,
      gender: data.gender!,
      phone: data.phone!,
      ...(data.photoURL && { photoURL: data.photoURL }),
      ...(data.coverPhotoURL && { coverPhotoURL: data.coverPhotoURL }),

      // Location
      state: data.state!,
      city: data.city!,
      country: data.country || 'India',

      // Sports Details
      sports: data.sports!,

      // Additional
      ...(data.bio && { bio: data.bio }),

      // System fields
      isActive: true,
      isVerified: false
    };

    await setDoc(athleteRef, athleteProfile);
  }

  /**
   * Get athlete profile by UID
   */
  async getAthleteProfile(uid: string): Promise<Athlete | null> {
    try {
      const athleteRef = doc(db, this.collectionName, uid);
      const athleteDoc = await getDoc(athleteRef);

      if (!athleteDoc.exists()) {
        return null;
      }

      return { id: athleteDoc.id, ...athleteDoc.data() } as unknown as Athlete;
    } catch (error) {
      console.error('Error getting athlete profile:', error);
      throw error;
    }
  }

  /**
   * Update athlete profile
   */
  async updateAthleteProfile(uid: string, updates: Partial<AthleteProfile>): Promise<void> {
    try {
      const athleteRef = doc(db, this.collectionName, uid);
      await updateDoc(athleteRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating athlete profile:', error);
      throw error;
    }
  }
}

export const athletesService = new AthletesService();
