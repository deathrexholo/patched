import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  ValidationResult, 
  ValidationRules, 
  validateField,
  shouldShowValidationError 
} from '../utils/validationUtils';

interface UseValidationOptions {
  rules: ValidationRules;
  fieldName: string;
  initialValue?: any;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  debounceMs?: number;
}

interface UseValidationReturn {
  value: any;
  error: string | null;
  isValid: boolean;
  hasError: boolean;
  hasUserInteracted: boolean;
  isValidating: boolean;
  setValue: (value: any) => void;
  validate: () => ValidationResult;
  clearError: () => void;
  markAsInteracted: () => void;
  reset: () => void;
}

/**
 * Hook for real-time field validation with user interaction tracking
 */
export const useValidation = (options: UseValidationOptions): UseValidationReturn => {
  const {
    rules,
    fieldName,
    initialValue = '',
    validateOnChange = true,
    validateOnBlur = true,
    debounceMs = 300
  } = options;

  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(true);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  
  const debounceTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isSubmittingRef = useRef(false);

  const validate = useCallback((): ValidationResult => {
    const result = validateField(value, rules, fieldName);
    return result;
  }, [value, rules, fieldName]);

  const performValidation = useCallback((isSubmitting = false) => {
    setIsValidating(true);
    
    const result = validate();
    const shouldShow = shouldShowValidationError(hasUserInteracted, isSubmitting, result);
    
    setIsValid(result.isValid);
    setError(shouldShow && result.errors.length > 0 ? result.errors[0] : null);
    setIsValidating(false);
    
    return result;
  }, [validate, hasUserInteracted]);

  const debouncedValidation = useCallback((isSubmitting = false) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    if (debounceMs > 0 && !isSubmitting) {
      debounceTimeoutRef.current = setTimeout(() => {
        performValidation(isSubmitting);
      }, debounceMs);
    } else {
      performValidation(isSubmitting);
    }
  }, [performValidation, debounceMs]);

  const handleSetValue = useCallback((newValue: any) => {
    setValue(newValue);
    setHasUserInteracted(true);
    
    if (validateOnChange) {
      debouncedValidation();
    }
  }, [validateOnChange, debouncedValidation]);

  const markAsInteracted = useCallback(() => {
    setHasUserInteracted(true);
    if (validateOnBlur) {
      debouncedValidation();
    }
  }, [validateOnBlur, debouncedValidation]);

  const clearError = useCallback(() => {
    setError(null);
    setIsValid(true);
  }, []);

  const reset = useCallback(() => {
    setValue(initialValue);
    setError(null);
    setIsValid(true);
    setHasUserInteracted(false);
    setIsValidating(false);
    
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
  }, [initialValue]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    value,
    error,
    isValid,
    hasError: error !== null,
    hasUserInteracted,
    isValidating,
    setValue: handleSetValue,
    validate: () => performValidation(true), // Force validation for submit
    clearError,
    markAsInteracted,
    reset
  };
};

/**
 * Hook for validating multiple fields together
 */
interface UseFormValidationOptions {
  fields: Record<string, UseValidationOptions>;
  validateOnSubmit?: boolean;
}

interface UseFormValidationReturn {
  fields: Record<string, UseValidationReturn>;
  isFormValid: boolean;
  hasFormErrors: boolean;
  formErrors: string[];
  validateForm: () => boolean;
  clearFormErrors: () => void;
  resetForm: () => void;
}

export const useFormValidation = (options: UseFormValidationOptions): UseFormValidationReturn => {
  const { fields: fieldConfigs, validateOnSubmit = true } = options;
  
  // Create validation hooks for each field
  const fields = Object.keys(fieldConfigs).reduce((acc, fieldKey) => {
    acc[fieldKey] = useValidation(fieldConfigs[fieldKey]);
    return acc;
  }, {} as Record<string, UseValidationReturn>);

  const isFormValid = Object.values(fields).every(field => field.isValid);
  const hasFormErrors = Object.values(fields).some(field => field.hasError);
  const formErrors = Object.values(fields)
    .filter(field => field.hasError)
    .map(field => field.error)
    .filter(Boolean) as string[];

  const validateForm = useCallback((): boolean => {
    if (!validateOnSubmit) return isFormValid;
    
    // Trigger validation on all fields
    const results = Object.values(fields).map(field => field.validate());
    return results.every(result => result.isValid);
  }, [fields, isFormValid, validateOnSubmit]);

  const clearFormErrors = useCallback(() => {
    Object.values(fields).forEach(field => field.clearError());
  }, [fields]);

  const resetForm = useCallback(() => {
    Object.values(fields).forEach(field => field.reset());
  }, [fields]);

  return {
    fields,
    isFormValid,
    hasFormErrors,
    formErrors,
    validateForm,
    clearFormErrors,
    resetForm
  };
};

/**
 * Hook for step-by-step validation in multi-step forms
 */
interface UseStepValidationOptions {
  steps: Record<number, () => ValidationResult>;
  currentStep: number;
}

interface UseStepValidationReturn {
  currentStepValid: boolean;
  allPreviousStepsValid: boolean;
  canProceedToNextStep: boolean;
  validateCurrentStep: () => boolean;
  validateAllSteps: () => boolean;
  getStepValidation: (stepNumber: number) => ValidationResult | null;
}

export const useStepValidation = (options: UseStepValidationOptions): UseStepValidationReturn => {
  const { steps, currentStep } = options;
  
  const [stepValidations, setStepValidations] = useState<Record<number, ValidationResult>>({});

  const validateStep = useCallback((stepNumber: number): ValidationResult | null => {
    const stepValidator = steps[stepNumber];
    if (!stepValidator) return null;
    
    const result = stepValidator();
    setStepValidations(prev => ({
      ...prev,
      [stepNumber]: result
    }));
    
    return result;
  }, [steps]);

  const validateCurrentStep = useCallback((): boolean => {
    const result = validateStep(currentStep);
    return result?.isValid ?? false;
  }, [validateStep, currentStep]);

  const validateAllSteps = useCallback((): boolean => {
    const results = Object.keys(steps).map(stepKey => {
      const stepNumber = parseInt(stepKey);
      return validateStep(stepNumber);
    });
    
    return results.every(result => result?.isValid ?? false);
  }, [steps, validateStep]);

  const currentStepValid = stepValidations[currentStep]?.isValid ?? false;
  const allPreviousStepsValid = Object.keys(steps)
    .map(key => parseInt(key))
    .filter(stepNumber => stepNumber < currentStep)
    .every(stepNumber => stepValidations[stepNumber]?.isValid ?? false);

  const canProceedToNextStep = currentStepValid;

  const getStepValidation = useCallback((stepNumber: number): ValidationResult | null => {
    return stepValidations[stepNumber] ?? null;
  }, [stepValidations]);

  return {
    currentStepValid,
    allPreviousStepsValid,
    canProceedToNextStep,
    validateCurrentStep,
    validateAllSteps,
    getStepValidation
  };
};