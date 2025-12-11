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
  role?: string; // User role: 'athlete', 'organization', 'coach', 'parent'
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
      // Get browser default language if not provided
      const defaultLanguage = userData.languagePreference || this.getBrowserDefaultLanguage();

      const userProfile: Omit<User, 'id'> = {
        ...userData,
        uid: userData.uid,
        email: userData.email,
        displayName: userData.displayName,
        photoURL: userData.photoURL || null,
        role: userData.role, // Save the user's role
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

      // Use user ID as document ID
      const userRef = doc(db, COLLECTIONS.USERS, userData.uid);
      await setDoc(userRef, userProfile);return { id: userData.uid, ...userProfile } as User;
    } catch (error) {
      console.error('❌ Error creating user profile:', error);
      throw error;
    }
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<User | null> {
    try {
      const userRef = doc(db, COLLECTIONS.USERS, userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = { id: userDoc.id, ...userDoc.data() } as User;return userData;
      } else {
        console.warn('⚠️ User profile not found:', userId);
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting user profile:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, updateData: UpdateUserProfileData): Promise<Partial<User>> {
    try {
      const userRef = doc(db, COLLECTIONS.USERS, userId);
      await updateDoc(userRef, {
        ...updateData,
        updatedAt: new Date().toISOString(),
      });return { id: userId, ...updateData };
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
      // Search by display name
      const nameResults = await this.search('displayName', searchTerm, limit);
      
      // Search by username if it exists
      let usernameResults: User[] = [];
      try {
        usernameResults = await this.search('username', searchTerm, limit);
      } catch (error) {}
      
      // Combine and deduplicate results
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
   * Follow/unfollow user
   */

  /**
   * Get user's followers
  /**
   * Get multiple user profiles
   */
  async getUserProfiles(userIds: string[]): Promise<User[]> {
    try {
      const profiles: User[] = [];
      
      // Process in chunks to avoid overwhelming Firestore
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

      await this.updateUserProfile(userId, filteredUpdate as UpdateUserProfileData);return filteredUpdate;
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
      });} catch (error) {
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
      // Don't throw - this shouldn't block user creation
    }
  }
}

export default new UserService();
