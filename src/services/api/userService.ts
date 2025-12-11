// User service with business logic
import { BaseService } from './baseService';
import { COLLECTIONS } from '../../constants/firebase';
import { db } from '../../lib/firebase';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { User, UserRole } from '../../types/models/user';
import { parentsService } from './parentsService';
import { coachesService } from './coachesService';
import { organizationsService } from './organizationsService';
import { athletesService } from './athletesService';

/**
 * User profile creation data
 */
interface CreateUserProfileData {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  bio?: string;
  location?: string;
  website?: string;
  role?: string;
}

/**
 * User profile update data
 */
type UpdateUserProfileData = Partial<Omit<User, 'id' | 'uid'>>;

/**
 * User activity summary
 */
interface UserActivitySummary {
  postsCount: number;
  storiesCount: number;
  isVerified: boolean;
  joinDate: Date | any | undefined;
  lastActive: Date | any | undefined;
}

/**
 * User stats update
 */
interface UserStatsUpdate {
  postsCount?: number;
  storiesCount?: number;
}

/**
 * User service providing business logic for user operations
 */
class UserService extends BaseService<User> {
  constructor() {
    super(COLLECTIONS.USERS);
  }

  /**
   * Get browser's default language
   */
  private getBrowserDefaultLanguage(): string {
    const browserLang = navigator.language?.split('-')[0].toLowerCase() || 'en';
    const supportedLanguages = ['en', 'hi', 'pa', 'mr', 'bn', 'ta', 'te', 'kn', 'ml', 'gu', 'or', 'as'];
    return supportedLanguages.includes(browserLang) ? browserLang : 'en';
  }

  /**
   * Create user profile
   */
  async createUserProfile(userData: CreateUserProfileData & { languagePreference?: string }): Promise<User> {
    try {
      const defaultLanguage = userData.languagePreference || this.getBrowserDefaultLanguage();

      const userProfile: Omit<User, 'id'> = {
        ...userData,
        uid: userData.uid,
        email: userData.email,
        displayName: userData.displayName,
        photoURL: userData.photoURL || null,
        role: userData.role,
        languagePreference: defaultLanguage,
        languagePreferenceUpdatedAt: new Date().toISOString(),
        postsCount: 0,
        storiesCount: 0,
        isVerified: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        privacy: {
          profileVisibility: 'public',
        },
        settings: {
          notifications: true,
          emailNotifications: false,
          pushNotifications: true,
        },
      } as Omit<User, 'id'>;

      const userRef = doc(db, COLLECTIONS.USERS, userData.uid);
      await setDoc(userRef, userProfile);
      return { id: userData.uid, ...userProfile } as User;
    } catch (error) {
      console.error('❌ Error creating user profile:', error);
      throw error;
    }
  }

  /**
   * Get user profile by ID with backward compatibility
   * Checks role-specific collection first, then falls back to users collection
   */
  async getUserProfile(userId: string, role?: UserRole): Promise<User | null> {
    try {
      // Strategy 1: Check role-specific collection if role is known
      if (role) {
        let profile = null;

        switch (role) {
          case 'parent':
            profile = await parentsService.getParentProfile(userId);
            break;
          case 'coach':
            profile = await coachesService.getCoachProfile(userId);
            break;
          case 'organization':
            profile = await organizationsService.getOrganizationProfile(userId);
            break;
          case 'athlete':
            profile = await athletesService.getAthleteProfile(userId);
            break;
        }

        if (profile) {
          return profile as unknown as User;
        }
      }

      // Strategy 2: Check legacy users collection
      const userRef = doc(db, COLLECTIONS.USERS, userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = { id: userDoc.id, ...userDoc.data() } as User;
        return userData;
      }

      // Strategy 3: If role unknown, check all role-specific collections
      if (!role) {
        const parentProfile = await parentsService.getParentProfile(userId);
        if (parentProfile) return parentProfile as unknown as User;

        const coachProfile = await coachesService.getCoachProfile(userId);
        if (coachProfile) return coachProfile as unknown as User;

        const orgProfile = await organizationsService.getOrganizationProfile(userId);
        if (orgProfile) return orgProfile as unknown as User;

        const athleteProfile = await athletesService.getAthleteProfile(userId);
        if (athleteProfile) return athleteProfile as unknown as User;
      }

      console.warn('⚠️ User profile not found:', userId);
      return null;
    } catch (error) {
      console.error('❌ Error getting user profile:', error);
      throw error;
    }
  }

  /**
   * Create user profile in role-specific collection
   */
  async createRoleSpecificProfile(uid: string, role: UserRole, data: any): Promise<void> {
    try {
      switch (role) {
        case 'parent':
          await parentsService.createParentProfile(uid, data);
          break;
        case 'coach':
          await coachesService.createCoachProfile(uid, data);
          break;
        case 'organization':
          await organizationsService.createOrganizationProfile(uid, data);
          break;
        case 'athlete':
          await athletesService.createAthleteProfile(uid, data);
          break;
        default:
          throw new Error(`Unknown role: ${role}`);
      }
    } catch (error) {
      console.error('❌ Error creating role-specific profile:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, updateData: UpdateUserProfileData): Promise<Partial<User>> {
    try {
      // First, get the user's profile to determine their role
      const userProfile = await this.getUserProfile(userId);

      if (!userProfile) {
        throw new Error(`User profile not found for userId: ${userId}`);
      }

      // Determine the collection based on role
      let collectionName: string;
      switch (userProfile.role) {
        case 'parent':
          collectionName = COLLECTIONS.PARENTS;
          break;
        case 'coach':
          collectionName = COLLECTIONS.COACHES;
          break;
        case 'organization':
          collectionName = COLLECTIONS.ORGANIZATIONS;
          break;
        case 'athlete':
          collectionName = COLLECTIONS.ATHLETES;
          break;
        default:
          // Fallback to athletes for unknown roles
          collectionName = COLLECTIONS.ATHLETES;
          break;
      }

      const userRef = doc(db, collectionName, userId);
      await updateDoc(userRef, {
        ...updateData,
        updatedAt: new Date().toISOString(),
      });
      return { id: userId, ...updateData };
    } catch (error) {
      console.error('❌ Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * Search users by name or username
   */
  async searchUsers(searchTerm: string, limit: number = 20): Promise<User[]> {
    try {
      const nameResults = await this.search('displayName', searchTerm, limit);

      let usernameResults: User[] = [];
      try {
        usernameResults = await this.search('username', searchTerm, limit);
      } catch (error) {}

      const allResults = [...nameResults, ...usernameResults];
      const uniqueResults = allResults.filter((user, index, array) =>
        array.findIndex(u => u.id === user.id) === index
      );

      return uniqueResults.slice(0, limit);
    } catch (error) {
      console.error('❌ Error searching users:', error);
      throw error;
    }
  }

  /**
   * Get multiple user profiles
   */
  async getUserProfiles(userIds: string[]): Promise<User[]> {
    try {
      const profiles: User[] = [];

      const chunkSize = 10;
      for (let i = 0; i < userIds.length; i += chunkSize) {
        const chunk = userIds.slice(i, i + chunkSize);
        const chunkPromises = chunk.map(id => this.getUserProfile(id));
        const chunkResults = await Promise.all(chunkPromises);

        profiles.push(...chunkResults.filter((profile): profile is User => profile !== null));
      }

      return profiles;
    } catch (error) {
      console.error('❌ Error getting user profiles:', error);
      throw error;
    }
  }

  /**
   * Update user statistics
   */
  async updateUserStats(userId: string, statsUpdate: UserStatsUpdate): Promise<UserStatsUpdate> {
    try {
      const validStats = ['postsCount', 'storiesCount'];
      const filteredUpdate: UserStatsUpdate = {};

      Object.keys(statsUpdate).forEach(key => {
        if (validStats.includes(key)) {
          filteredUpdate[key as keyof UserStatsUpdate] = Math.max(0, statsUpdate[key as keyof UserStatsUpdate] || 0);
        }
      });

      await this.updateUserProfile(userId, filteredUpdate as UpdateUserProfileData);
      return filteredUpdate;
    } catch (error) {
      console.error('❌ Error updating user stats:', error);
      throw error;
    }
  }

  /**
   * Get user activity summary
   */
  async getUserActivitySummary(userId: string): Promise<UserActivitySummary | null> {
    try {
      const user = await this.getUserProfile(userId);
      if (!user) {
        return null;
      }

      return {
        postsCount: user.postsCount || 0,
        storiesCount: user.storiesCount || 0,
        isVerified: user.isVerified || false,
        joinDate: user.createdAt,
        lastActive: user.updatedAt,
      };
    } catch (error) {
      console.error('❌ Error getting user activity summary:', error);
      throw error;
    }
  }

  /**
   * Get user's language preference
   */
  async getLanguagePreference(userId: string): Promise<string | null> {
    try {
      const user = await this.getUserProfile(userId);
      return user?.languagePreference || null;
    } catch (error) {
      console.error('❌ Error getting language preference:', error);
      throw error;
    }
  }

  /**
   * Set user's language preference
   */
  async setLanguagePreference(userId: string, languageCode: string): Promise<void> {
    try {
      const userRef = doc(db, COLLECTIONS.USERS, userId);
      await updateDoc(userRef, {
        languagePreference: languageCode,
        languagePreferenceUpdatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Error setting language preference:', error);
      throw error;
    }
  }

  /**
   * Save language preference when user is created
   */
  async setUserLanguagePreference(userId: string, userData: CreateUserProfileData & { languagePreference?: string }): Promise<void> {
    try {
      if (userData.languagePreference) {
        await this.setLanguagePreference(userId, userData.languagePreference);
      }
    } catch (error) {
      console.warn('⚠️ Warning: Could not set language preference during user creation:', error);
    }
  }
}

export default new UserService();
