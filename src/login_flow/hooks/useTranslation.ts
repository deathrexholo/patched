/**
 * DEPRECATED: Use useLanguage from @hooks/useLanguage instead
 *
 * This hook is deprecated and only kept for backward compatibility.
 * It delegates to the new unified useLanguage hook.
 *
 * Migration path:
 * OLD: import useTranslation from '@login_flow/hooks/useTranslation'
 * NEW: import { useLanguage } from '@hooks/useLanguage'
 *      OR: import { useTranslation } from '@hooks/useLanguage'
 *
 * This file will be removed in a future version.
 */

import { useLanguage } from '@hooks/useLanguage';

const useTranslation = () => {
  console.warn('⚠️ DEPRECATED: useTranslation from login_flow is deprecated. Use useLanguage from @hooks/useLanguage instead.');

  const languageContext = useLanguage();
  const { t, currentLanguage } = languageContext;

  return { t, language: currentLanguage };
};

export default useTranslation;
