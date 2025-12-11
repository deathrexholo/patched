/**
 * Unified Language Hook
 * Replaces dual translation systems with a single, centralized hook
 * Supports real-time language switching with Firestore persistence
 */

import { useContext } from 'react';
import { LanguageContext } from '../contexts/LanguageContext';

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }

  return context;
}

/**
 * Lightweight translation-only hook (no language switching)
 * Use this when you only need the `t()` function for translations
 */
export function useTranslation() {
  const { t } = useLanguage();
  return { t };
}

export default useLanguage;
