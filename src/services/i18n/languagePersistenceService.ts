/**
 * Language Persistence Service
 * Handles language preference storage across localStorage and Firestore
 */

import { db } from '@lib/firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { LanguageCode } from './translations';

const SUPPORTED_LANGUAGES: LanguageCode[] = ['en', 'hi', 'pa', 'mr', 'bn', 'ta', 'te', 'kn', 'ml', 'gu', 'or', 'as'];
const LANGUAGE_KEY = 'selectedLanguage';

export const languagePersistenceService = {
  /**
   * Get browser default language
   */
  getBrowserDefaultLanguage(): LanguageCode {
    try {
      const browserLang = navigator.language.split('-')[0].toLowerCase();
      if (SUPPORTED_LANGUAGES.includes(browserLang as LanguageCode)) {
        return browserLang as LanguageCode;
      }
    } catch (error) {
      console.warn('Error detecting browser language:', error);
    }
    return 'en';
  },

  /**
   * Get language from localStorage
   */
  getLocalStorageLanguage(): LanguageCode | null {
    try {
      const stored = localStorage.getItem(LANGUAGE_KEY);
      if (stored && SUPPORTED_LANGUAGES.includes(stored as LanguageCode)) {
        return stored as LanguageCode;
      }
    } catch (error) {
      console.warn('Error reading from localStorage:', error);
    }
    return null;
  },

  /**
   * Save language to localStorage
   */
  saveLocalStorageLanguage(language: LanguageCode): void {
    try {
      if (SUPPORTED_LANGUAGES.includes(language)) {
        localStorage.setItem(LANGUAGE_KEY, language);
      }
    } catch (error) {
      console.warn('Error saving to localStorage:', error);
    }
  },

  /**
   * Load language preference from Firestore
   */
  async loadLanguagePreference(userId: string): Promise<LanguageCode | null> {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const data = userDoc.data();
        const language = data?.languagePreference;

        if (language && SUPPORTED_LANGUAGES.includes(language as LanguageCode)) {
          return language as LanguageCode;
        }
      }
    } catch (error) {
      console.warn('Error loading language preference from Firestore:', error);
    }
    return null;
  },

  /**
   * Save language preference to Firestore
   */
  async saveLanguagePreference(userId: string, language: LanguageCode): Promise<void> {
    try {
      if (!SUPPORTED_LANGUAGES.includes(language)) {
        console.warn(`Invalid language code: ${language}`);
        return;
      }

      const userDocRef = doc(db, 'users', userId);
      await setDoc(
        userDocRef,
        {
          languagePreference: language,
          languagePreferenceUpdatedAt: Timestamp.now(),
        },
        { merge: true }
      );
    } catch (error) {
      console.warn('Error saving language preference to Firestore:', error);
      throw error;
    }
  },

  /**
   * Get language with fallback priority
   * Firestore → localStorage → browser default → English
   */
  async getLanguageWithFallback(userId: string | null): Promise<LanguageCode> {
    // If user is logged in, try Firestore first
    if (userId) {
      const firestoreLanguage = await this.loadLanguagePreference(userId);
      if (firestoreLanguage) {
        return firestoreLanguage;
      }
    }

    // Try localStorage
    const storedLanguage = this.getLocalStorageLanguage();
    if (storedLanguage) {
      return storedLanguage;
    }

    // Try browser default
    const browserDefault = this.getBrowserDefaultLanguage();
    if (browserDefault) {
      return browserDefault;
    }

    // Fallback to English
    return 'en';
  },

  /**
   * Migrate language from localStorage to Firestore (one-time migration)
   */
  async migrateToFirestore(userId: string): Promise<boolean> {
    try {
      const storedLanguage = this.getLocalStorageLanguage();
      if (storedLanguage) {
        await this.saveLanguagePreference(userId, storedLanguage);
        return true;
      }
    } catch (error) {
      console.warn('Error migrating language to Firestore:', error);
    }
    return false;
  },
};

export default languagePersistenceService;
