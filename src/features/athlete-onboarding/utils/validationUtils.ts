import { Sport, Position } from '../store/onboardingStore';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface ValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

/**
 * Validates sport selection
 */
export const validateSportSelection = (sport: Sport | null): ValidationResult => {
  const errors: string[] = [];
  
  if (!sport) {
    errors.push('Please select a sport to continue');
    return { isValid: false, errors };
  }
  
  if (!sport.id || !sport.name) {
    errors.push('Invalid sport selection. Please choose a different sport');
    return { isValid: false, errors };
  }
  
  return { isValid: true, errors: [] };
};

/**
 * Validates position selection
 */
export const validatePositionSelection = (
  position: Position | null, 
  sport: Sport | null
): ValidationResult => {
  const errors: string[] = [];
  
  if (!sport) {
    errors.push('Sport information is missing. Please start over');
    return { isValid: false, errors };
  }
  
  if (!position) {
    errors.push('Please select a position to continue');
    return { isValid: false, errors };
  }
  
  if (!position.id || !position.name) {
    errors.push('Invalid position selection. Please choose a different position');
    return { isValid: false, errors };
  }
  
  return { isValid: true, errors: [] };
};

/**
 * Validates specialization selections
 */
export const validateSpecializationSelection = (
  specializations: Record<string, string>,
  requiredCategories: string[] = []
): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check required specializations
  for (const categoryId of requiredCategories) {
    if (!specializations[categoryId]) {
      errors.push(`Please select your ${categoryId.replace('_', ' ').toLowerCase()}`);
    }
  }
  
  // Validate specialization values
  Object.entries(specializations).forEach(([categoryId, value]) => {
    if (!value || value.trim() === '') {
      warnings.push(`Empty value for ${categoryId.replace('_', ' ').toLowerCase()}`);
    }
  });
  
  return { 
    isValid: errors.length === 0, 
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  };
};

/**
 * Validates complete athlete profile
 */
export const validateCompleteProfile = (
  sport: Sport | null,
  position: Position | null,
  specializations: Record<string, string>,
  requiredSpecializations: string[] = []
): ValidationResult => {
  const errors: string[] = [];
  
  // Validate sport
  const sportValidation = validateSportSelection(sport);
  if (!sportValidation.isValid) {
    errors.push(...sportValidation.errors);
  }
  
  // Validate position
  const positionValidation = validatePositionSelection(position, sport);
  if (!positionValidation.isValid) {
    errors.push(...positionValidation.errors);
  }
  
  // Validate specializations
  const specializationValidation = validateSpecializationSelection(
    specializations, 
    requiredSpecializations
  );
  if (!specializationValidation.isValid) {
    errors.push(...specializationValidation.errors);
  }
  
  return { isValid: errors.length === 0, errors };
};

/**
 * Real-time validation for form fields
 */
export const validateField = (
  value: any, 
  rules: ValidationRules, 
  fieldName: string
): ValidationResult => {
  const errors: string[] = [];
  
  // Required validation
  if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
    errors.push(`${fieldName} is required`);
    return { isValid: false, errors };
  }
  
  // Skip other validations if value is empty and not required
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return { isValid: true, errors: [] };
  }
  
  // String length validations
  if (typeof value === 'string') {
    if (rules.minLength && value.length < rules.minLength) {
      errors.push(`${fieldName} must be at least ${rules.minLength} characters long`);
    }
    
    if (rules.maxLength && value.length > rules.maxLength) {
      errors.push(`${fieldName} must be no more than ${rules.maxLength} characters long`);
    }
    
    // Pattern validation
    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push(`${fieldName} format is invalid`);
    }
  }
  
  // Custom validation
  if (rules.custom) {
    const customError = rules.custom(value);
    if (customError) {
      errors.push(customError);
    }
  }
  
  return { isValid: errors.length === 0, errors };
};

/**
 * Debounced validation for real-time feedback
 */
export const createDebouncedValidator = (
  validator: (value: any) => ValidationResult,
  delay: number = 300
) => {
  let timeoutId: NodeJS.Timeout;
  
  return (value: any, callback: (result: ValidationResult) => void) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      const result = validator(value);
      callback(result);
    }, delay);
  };
};

/**
 * Validation error messages for common scenarios
 */
export const ValidationMessages = {
  SPORT_REQUIRED: 'Please select a sport to continue',
  SPORT_INVALID: 'Invalid sport selection. Please choose a different sport',
  POSITION_REQUIRED: 'Please select a position to continue',
  POSITION_INVALID: 'Invalid position selection. Please choose a different position',
  SPECIALIZATION_REQUIRED: 'Please complete all required specializations',
  PROFILE_INCOMPLETE: 'Please complete all required fields before continuing',
  NETWORK_ERROR: 'Network error. Please check your connection and try again',
  SAVE_ERROR: 'Failed to save your profile. Please try again',
  LOAD_ERROR: 'Failed to load your profile. Please try again or restart the onboarding process',
  PERMISSION_ERROR: 'You do not have permission to perform this action. Please check your account status',
  VALIDATION_ERROR: 'Please correct the errors below and try again'
} as const;

/**
 * Helper to format validation errors for display
 */
export const formatValidationErrors = (errors: string[]): string => {
  if (errors.length === 0) return '';
  if (errors.length === 1) return errors[0];
  
  return `Please fix the following issues:\n• ${errors.join('\n• ')}`;
};

/**
 * Helper to check if validation should show errors immediately or wait for user interaction
 */
export const shouldShowValidationError = (
  hasUserInteracted: boolean,
  isSubmitting: boolean,
  validationResult: ValidationResult
): boolean => {
  // Always show errors when submitting
  if (isSubmitting) return !validationResult.isValid;
  
  // Show errors after user has interacted with the field
  if (hasUserInteracted) return !validationResult.isValid;
  
  // Don't show errors before user interaction
  return false;
};