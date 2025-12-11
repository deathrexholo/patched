/**
 * Validation utilities
 */

// Main validation functions
export * from './validation';

// Form validation functions
export {
  validateEmailField,
  validateDisplayName,
  validatePhoneNumber,
  validateBio,
  validateUrl,
  validateTextField,
  validateNotificationPreferences,
  validatePrivacySettings,
  getFieldErrorProps,
  createDebouncedValidator,
  validateFields,
  hasValidationErrors,
  getValidationErrors,
  getValidationWarnings
} from './formValidation';

// Engagement validation functions
export {
  validateLikes,
  validateComments,
  validateShares,
  sanitizeEngagementData,
  hasUserLikedPost,
  hasUserSharedPost,
  validatePostEngagement,
  calculateEngagementScore
} from './engagementValidation';

// Config validation functions
export * from './configValidation';

// Firestore validation functions
export * from './firestoreValidation';