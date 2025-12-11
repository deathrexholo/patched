// Form validation utilities for settings and other forms

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

// Email validation
export const validateEmailField = (email: string): ValidationResult => {
  if (!email.trim()) {
    return { isValid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  return { isValid: true };
};

// Display name validation
export const validateDisplayName = (name: string): ValidationResult => {
  if (!name.trim()) {
    return { isValid: false, error: 'Display name is required' };
  }

  if (name.length < 2) {
    return { isValid: false, error: 'Display name must be at least 2 characters' };
  }

  if (name.length > 50) {
    return { isValid: false, error: 'Display name must be less than 50 characters' };
  }

  // Check for inappropriate characters
  const invalidChars = /[<>"'&]/;
  if (invalidChars.test(name)) {
    return { isValid: false, error: 'Display name contains invalid characters' };
  }

  return { isValid: true };
};

// Phone number validation (optional field)
export const validatePhoneNumber = (phone: string): ValidationResult => {
  if (!phone.trim()) {
    return { isValid: true }; // Phone is optional
  }

  // Remove all non-digit characters for validation
  const digitsOnly = phone.replace(/\D/g, '');
  
  if (digitsOnly.length < 10) {
    return { isValid: false, error: 'Phone number must be at least 10 digits' };
  }

  if (digitsOnly.length > 15) {
    return { isValid: false, error: 'Phone number must be less than 15 digits' };
  }

  return { isValid: true };
};

// Bio/description validation
export const validateBio = (bio: string): ValidationResult => {
  if (bio.length > 500) {
    return { isValid: false, error: 'Bio must be less than 500 characters' };
  }

  return { isValid: true };
};

// URL validation (for profile links)
export const validateUrl = (url: string): ValidationResult => {
  if (!url.trim()) {
    return { isValid: true }; // URL is optional
  }

  try {
    new URL(url);
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Please enter a valid URL' };
  }
};

// Generic text field validation
export const validateTextField = (
  value: string,
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    patternMessage?: string;
  } = {}
): ValidationResult => {
  const { required = false, minLength, maxLength, pattern, patternMessage } = options;

  if (required && !value.trim()) {
    return { isValid: false, error: 'This field is required' };
  }

  if (!value.trim() && !required) {
    return { isValid: true }; // Empty optional field is valid
  }

  if (minLength && value.length < minLength) {
    return { isValid: false, error: `Must be at least ${minLength} characters` };
  }

  if (maxLength && value.length > maxLength) {
    return { isValid: false, error: `Must be less than ${maxLength} characters` };
  }

  if (pattern && !pattern.test(value)) {
    return { isValid: false, error: patternMessage || 'Invalid format' };
  }

  return { isValid: true };
};

// Notification preferences validation
export const validateNotificationPreferences = (preferences: {
  email: boolean;
  push: boolean;
  sms: boolean;
}): ValidationResult => {
  // At least one notification method should be enabled
  if (!preferences.email && !preferences.push && !preferences.sms) {
    return { 
      isValid: true, // Not invalid, but show warning
      warnings: ['Consider enabling at least one notification method to stay updated']
    };
  }

  return { isValid: true };
};

// Privacy settings validation
export const validatePrivacySettings = (settings: {
  profileVisibility: 'public' | 'friends' | 'private';
  allowMessages: boolean;
  showOnlineStatus: boolean;
}): ValidationResult => {
  // Warn if profile is private but messages are allowed from everyone
  if (settings.profileVisibility === 'private' && settings.allowMessages) {
    return {
      isValid: true,
      warnings: ['Your profile is private but you allow messages from everyone. Consider adjusting these settings for consistency.']
    };
  }

  return { isValid: true };
};

// Form field error display helper
export const getFieldErrorProps = (
  fieldName: string,
  errors: Record<string, string>,
  touched: Record<string, boolean>
) => {
  const hasError = errors[fieldName] && touched[fieldName];
  return {
    'aria-invalid': hasError ? 'true' : 'false',
    'aria-describedby': hasError ? `${fieldName}-error` : undefined,
    className: hasError ? 'input-error' : ''
  };
};

// Debounced validation helper
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

// Batch validation for multiple fields
export const validateFields = (
  fields: Record<string, any>,
  validators: Record<string, (value: any) => ValidationResult>
): Record<string, ValidationResult> => {
  const results: Record<string, ValidationResult> = {};
  
  Object.keys(fields).forEach(fieldName => {
    const validator = validators[fieldName];
    if (validator) {
      results[fieldName] = validator(fields[fieldName]);
    }
  });
  
  return results;
};

// Check if form has any validation errors
export const hasValidationErrors = (results: Record<string, ValidationResult>): boolean => {
  return Object.values(results).some(result => !result.isValid);
};

// Get all validation errors as a flat array
export const getValidationErrors = (results: Record<string, ValidationResult>): string[] => {
  return Object.values(results)
    .filter(result => !result.isValid && result.error)
    .map(result => result.error!);
};

// Get all validation warnings as a flat array
export const getValidationWarnings = (results: Record<string, ValidationResult>): string[] => {
  return Object.values(results)
    .filter(result => result.warnings && result.warnings.length > 0)
    .flatMap(result => result.warnings!);
};