// Athlete profile service for managing athlete onboarding data
import { COLLECTIONS } from '../../constants/firebase';
import { db } from '../../lib/firebase';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Sport, Position, Subcategory, AthleteProfile } from '../../features/athlete-onboarding/store/onboardingStore';
import { retryFirebaseOperation } from '../../utils/network/retryUtils';

/**
 * Athlete profile data for creation
 */
interface CreateAthleteProfileData {
  userId: string;
  sports: Sport[];
  position: Position;
  subcategory: Subcategory;
  specializations: Record<string, string>;
}

/**
 * Athlete profile update data
 */
type UpdateAthleteProfileData = Partial<Omit<AthleteProfile, 'completedOnboarding' | 'onboardingCompletedAt'>>;

/**
 * Athlete profile service providing business logic for athlete profile operations
 * Note: This service doesn't extend BaseService since AthleteProfile is embedded within User documents
 */
class AthleteProfileService {

  /**
   * Create or update athlete profile data within user document
   */
  async createAthleteProfile(data: CreateAthleteProfileData): Promise<AthleteProfile> {
    const { userId, sports, position, subcategory, specializations } = data;

    // Validate required data
    if (!sports || sports.length === 0 || !position || !subcategory) {
      throw new Error('Sports, position, and subcategory are required for athlete profile creation');
    }

    const athleteProfile: AthleteProfile = {
      sports,
      position,
      subcategory,
      specializations,
      completedOnboarding: true,
      onboardingCompletedAt: new Date()
    };

    // Use retry mechanism for Firebase operation
    return await retryFirebaseOperation(async () => {
      // Extract denormalized fields for efficient querying
      const sportIds = sports.map(sport => sport.id);
      const sportDetails = sports.map(sport => ({
        id: sport.id,
        name: sport.name,
        icon: sport.icon
      }));

      // Extract event types from specializations and subcategory
      const eventTypes: string[] = [];
      if (subcategory && subcategory.id) {
        eventTypes.push(subcategory.id);
      }
      Object.values(specializations).forEach(value => {
        if (value && !eventTypes.includes(value)) {
          eventTypes.push(value);
        }
      });

      const specializationValues = Object.values(specializations).filter(v => v);

      // Update user document with both nested profile and denormalized fields
      const userRef = doc(db, COLLECTIONS.USERS, userId);
      await updateDoc(userRef, {
        // Nested athlete profile (kept for compatibility)
        athleteProfile,

        // Denormalized fields for efficient querying
        role: 'athlete',
        sports: sportIds,
        sportDetails: sportDetails,
        eventTypes: eventTypes,
        position: position.id,
        positionName: position.name,
        subcategory: subcategory?.id || null,
        subcategoryName: subcategory?.name || null,
        playerType: subcategory?.name || null, // Save subcategory as playerType for profile display
        specializations: specializationValues,

        updatedAt: serverTimestamp(),
      });console.log('📊 Indexed fields:', {
        sports: sportIds,
        eventTypes,
        position: position.id,
        subcategory: subcategory?.id
      });

      return athleteProfile;
    }, 'Create athlete profile');
  }

  /**
   * Get athlete profile by user ID
   */
  async getAthleteProfile(userId: string): Promise<AthleteProfile | null> {
    return await retryFirebaseOperation(async () => {
      const userRef = doc(db, COLLECTIONS.USERS, userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const athleteProfile = userData.athleteProfile as AthleteProfile;
        
        if (athleteProfile) {return athleteProfile;
        } else {
          console.warn('⚠️ No athlete profile found for user:', userId);
          return null;
        }
      } else {
        console.warn('⚠️ User document not found:', userId);
        return null;
      }
    }, 'Get athlete profile');
  }

  /**
   * Update athlete profile data
   */
  async updateAthleteProfile(userId: string, updateData: UpdateAthleteProfileData): Promise<AthleteProfile> {
    // Get current athlete profile first (this already has retry logic)
    const currentProfile = await this.getAthleteProfile(userId);
    if (!currentProfile) {
      throw new Error('Athlete profile not found for user: ' + userId);
    }

    // Merge update data with current profile
    const updatedProfile: AthleteProfile = {
      ...currentProfile,
      ...updateData,
      // Preserve completion status and timestamp
      completedOnboarding: currentProfile.completedOnboarding,
      onboardingCompletedAt: currentProfile.onboardingCompletedAt
    };

    // Use retry mechanism for the update operation
    return await retryFirebaseOperation(async () => {
      // Prepare denormalized fields
      const denormalizedUpdate: any = {
        athleteProfile: updatedProfile,
        updatedAt: serverTimestamp(),
      };

      // Update denormalized fields if sports were updated
      if (updatedProfile.sports && updatedProfile.sports.length > 0) {
        denormalizedUpdate.sports = updatedProfile.sports.map(sport => sport.id);
        denormalizedUpdate.sportDetails = updatedProfile.sports.map(sport => ({
          id: sport.id,
          name: sport.name,
          icon: sport.icon
        }));
      }

      // Update position fields
      if (updatedProfile.position) {
        denormalizedUpdate.position = updatedProfile.position.id;
        denormalizedUpdate.positionName = updatedProfile.position.name;
      }

      // Update subcategory fields
      if (updatedProfile.subcategory) {
        denormalizedUpdate.subcategory = updatedProfile.subcategory.id;
        denormalizedUpdate.subcategoryName = updatedProfile.subcategory.name;
        denormalizedUpdate.playerType = updatedProfile.subcategory.name; // Save subcategory as playerType for profile display
      }

      // Update event types and specializations
      if (updatedProfile.specializations || updatedProfile.subcategory) {
        const eventTypes: string[] = [];
        if (updatedProfile.subcategory?.id) {
          eventTypes.push(updatedProfile.subcategory.id);
        }
        if (updatedProfile.specializations) {
          Object.values(updatedProfile.specializations).forEach(value => {
            if (value && !eventTypes.includes(value)) {
              eventTypes.push(value);
            }
          });
        }
        denormalizedUpdate.eventTypes = eventTypes;
        denormalizedUpdate.specializations = Object.values(updatedProfile.specializations || {}).filter(v => v);
      }

      // Update user document
      const userRef = doc(db, COLLECTIONS.USERS, userId);
      await updateDoc(userRef, denormalizedUpdate);return updatedProfile;
    }, 'Update athlete profile');
  }

  /**
   * Check if user has completed athlete onboarding
   */
  async hasCompletedOnboarding(userId: string): Promise<boolean> {
    try {
      const athleteProfile = await this.getAthleteProfile(userId);
      return athleteProfile?.completedOnboarding || false;
    } catch (error) {
      console.error('❌ Error checking onboarding completion:', error);
      return false;
    }
  }

  /**
   * Validate athlete profile data integrity
   */
  validateAthleteProfile(profile: Partial<AthleteProfile>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate sports
    if (!profile.sports || profile.sports.length === 0) {
      errors.push('At least one sport is required');
    } else {
      profile.sports.forEach((sport, index) => {
        if (!sport.id || !sport.name) {
          errors.push(`Sport ${index + 1} must have valid id and name`);
        }
      });
    }

    // Validate position
    if (!profile.position) {
      errors.push('Position is required');
    } else {
      if (!profile.position.id || !profile.position.name) {
        errors.push('Position must have valid id and name');
      }
    }

    // Validate subcategory
    if (!profile.subcategory) {
      errors.push('Subcategory is required');
    } else {
      if (!profile.subcategory.id || !profile.subcategory.name) {
        errors.push('Subcategory must have valid id and name');
      }
    }

    // Validate specializations (optional but should be object if present)
    if (profile.specializations && typeof profile.specializations !== 'object') {
      errors.push('Specializations must be an object');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get athlete profiles by sport (for analytics/matching)
   * Now uses efficient indexed queries on denormalized fields
   */
  async getAthletesBySport(sportId: string, limitCount: number = 50): Promise<AthleteProfile[]> {
    try {const { query, where, collection, getDocs, limit: firestoreLimit } = await import('firebase/firestore');

      const q = query(
        collection(db, COLLECTIONS.USERS),
        where('role', '==', 'athlete'),
        where('sports', 'array-contains', sportId),
        firestoreLimit(limitCount)
      );

      const snapshot = await getDocs(q);
      const profiles: AthleteProfile[] = [];

      snapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.athleteProfile) {
          profiles.push(userData.athleteProfile as AthleteProfile);
        }
      });return profiles;
    } catch (error) {
      console.error('❌ Error getting athletes by sport:', error);
      throw error;
    }
  }

  /**
   * Advanced athlete search with multiple filters
   * Uses denormalized fields for efficient querying
   */
  async searchAthletes(filters: {
    sportId?: string;
    eventType?: string;
    position?: string;
    subcategory?: string;
    limit?: number;
  }): Promise<Array<{ userId: string; profile: AthleteProfile; user: any }>> {
    try {const { query, where, collection, getDocs, limit: firestoreLimit } = await import('firebase/firestore');

      // Build query constraints
      const constraints: any[] = [where('role', '==', 'athlete')];

      if (filters.sportId) {
        constraints.push(where('sports', 'array-contains', filters.sportId));
      }

      if (filters.eventType) {
        constraints.push(where('eventTypes', 'array-contains', filters.eventType));
      }

      if (filters.position) {
        constraints.push(where('position', '==', filters.position));
      }

      if (filters.subcategory) {
        constraints.push(where('subcategory', '==', filters.subcategory));
      }

      constraints.push(firestoreLimit(filters.limit || 50));

      const q = query(collection(db, COLLECTIONS.USERS), ...constraints);
      const snapshot = await getDocs(q);

      const results: Array<{ userId: string; profile: AthleteProfile; user: any }> = [];

      snapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.athleteProfile) {
          results.push({
            userId: doc.id,
            profile: userData.athleteProfile as AthleteProfile,
            user: userData
          });
        }
      });return results;
    } catch (error: any) {
      console.error('❌ Error searching athletes:', error);

      // Check if it's an index error
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        console.error('🚨 Missing Firestore index! Please create the required indexes.');
        console.error('📝 Run: firebase deploy --only firestore:indexes');
      }

      throw error;
    }
  }

  /**
   * Delete athlete profile data
   */
  async deleteAthleteProfile(userId: string): Promise<boolean> {
    try {
      const userRef = doc(db, COLLECTIONS.USERS, userId);
      await updateDoc(userRef, {
        athleteProfile: null,
        updatedAt: serverTimestamp(),
      });return true;
    } catch (error) {
      console.error('❌ Error deleting athlete profile:', error);
      throw error;
    }
  }
}

export default new AthleteProfileService();