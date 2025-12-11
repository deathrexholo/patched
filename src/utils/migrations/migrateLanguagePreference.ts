/**
 * Migration Script for Language Preferences
 * Migrates existing localStorage language preferences to Firestore user documents
 *
 * Run once during app initialization for existing users
 */

import { languagePersistenceService } from '@services/i18n/languagePersistenceService';
import { db } from '@lib/firebase';
import { collection, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';

interface MigrationResult {
  success: boolean;
  totalUsers: number;
  migratedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: Array<{ userId: string; error: string }>;
}

/**
 * Migrate language preference from localStorage to Firestore for a single user
 */
async function migrateUserLanguagePreference(userId: string): Promise<boolean> {
  try {
    return await languagePersistenceService.migrateToFirestore(userId);
  } catch (error) {
    console.error(`Error migrating language for user ${userId}:`, error);
    return false;
  }
}

/**
 * One-time migration for all users
 * Should be called once during app initialization
 */
export async function migrateAllUsersLanguagePreferences(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    totalUsers: 0,
    migratedCount: 0,
    skippedCount: 0,
    errorCount: 0,
    errors: []
  };

  try {// Get all users from Firestore
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);

    result.totalUsers = usersSnapshot.size;// Iterate through each user
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();

      try {
        // Check if user already has language preference in Firestore
        if (userData.languagePreference) {result.skippedCount++;
          continue;
        }

        // Try to migrate from localStorage
        const migrationSuccess = await migrateUserLanguagePreference(userId);

        if (migrationSuccess) {
          result.migratedCount++;} else {
          result.skippedCount++;}
      } catch (error) {
        result.errorCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push({ userId, error: errorMessage });
        console.error(`❌ Error migrating user ${userId}:`, error);
      }
    }

    // Log summaryconsole.log(`   - Total Users: ${result.totalUsers}`);console.log(`   - Skipped: ${result.skippedCount}`);if (result.errorCount > 0) {
      console.warn('⚠️ Some migrations failed:', result.errors);
      result.success = false;
    } else {}

    return result;
  } catch (error) {
    console.error('❌ Migration process failed:', error);
    result.success = false;
    return result;
  }
}

/**
 * Migrate single user (for manual/on-demand migration)
 */
export async function migrateUserLanguage(userId: string): Promise<boolean> {
  try {const success = await migrateUserLanguagePreference(userId);

    if (success) {} else {}

    return success;
  } catch (error) {
    console.error(`❌ Error migrating user ${userId}:`, error);
    return false;
  }
}

/**
 * Initialize language preference for a new user
 * Sets the browser default language as the initial preference
 */
export async function initializeUserLanguagePreference(userId: string): Promise<void> {
  try {
    const browserDefault = languagePersistenceService.getBrowserDefaultLanguage();

    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      languagePreference: browserDefault,
      languagePreferenceUpdatedAt: Timestamp.now(),
    });} catch (error) {
    console.warn(`⚠️ Could not initialize language preference for user ${userId}:`, error);
    // Don't throw - this shouldn't block user creation
  }
}

export default {
  migrateAllUsersLanguagePreferences,
  migrateUserLanguage,
  initializeUserLanguagePreference,
};
