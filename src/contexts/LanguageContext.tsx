/**
 * Language Context - Unified System
 *
 * Provides application-wide language management with:
 * - localStorage persistence (immediate)
 * - Firestore persistence (async, debounced)
 * - Fallback priority: Firestore → localStorage → browser default → English
 *
 * Uses unified translations from src/services/i18n/translations.ts
 */

import { createContext, useContext, useState, useEffect, ReactElement } from 'react';
import {
  LanguageContextValue,
  LanguageProviderProps,
  Language,
  LanguageCode,
  TranslationKey
} from '../types/contexts/language';
import { translations } from '@services/i18n/translations';
import { languagePersistenceService } from '@services/i18n/languagePersistenceService';

export const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

// Re-export useLanguage from hooks for backward compatibility
export { useLanguage } from '../hooks/useLanguage';

// Indian Regional Languages
export const languages: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমीয়া' }
];

// Re-export unified translations
export { translations };

export function LanguageProvider({ children }: LanguageProviderProps): ReactElement {
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>('en');

  // Initialize language from localStorage on mount
  useEffect(() => {
    const savedLanguage = languagePersistenceService.getLocalStorageLanguage();
    if (savedLanguage) {
      setCurrentLanguage(savedLanguage);} else {
      // Fall back to browser default
      const browserDefault = languagePersistenceService.getBrowserDefaultLanguage();
      setCurrentLanguage(browserDefault);}
  }, []);

  const changeLanguage = (languageCode: LanguageCode): void => {
    setCurrentLanguage(languageCode);
    languagePersistenceService.saveLocalStorageLanguage(languageCode);};

  const getCurrentLanguage = (): Language => {
    return languages.find(lang => lang.code === currentLanguage) || languages[0];
  };

  const t = (key: TranslationKey, fallback?: string): string => {
    return (
      (translations[currentLanguage] as any)?.[key] ||
      (translations.en as any)?.[key] ||
      fallback ||
      key
    );
  };

  const value: LanguageContextValue = {
    currentLanguage,
    changeLanguage,
    getCurrentLanguage,
    t,
    languages
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
