import { useState, useCallback, useEffect, useRef } from 'react';

export interface FormField<T = any> {
  value: T;
  error?: string;
  touched: boolean;
  dirty: boolean;
}

export interface FormValidationRule<T = any> {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: T) => string | undefined;
}

export interface FormConfig<T extends Record<string, any>> {
  initialValues: T;
  validationRules?: Partial<Record<keyof T, FormValidationRule>>;
  autoSave?: boolean;
  autoSaveDelay?: number;
  onSave?: (values: T) => Promise<void>;
  onAutoSave?: (values: T) => Promise<void>;
}

export interface UseSettingsFormReturn<T extends Record<string, any>> {
  values: T;
  fields: Record<keyof T, FormField>;
  errors: Partial<Record<keyof T, string>>;
  isValid: boolean;
  isDirty: boolean;
  isLoading: boolean;
  isSaving: boolean;
  setValue: <K extends keyof T>(field: K, value: T[K]) => void;
  setFieldError: <K extends keyof T>(field: K, error: string | undefined) => void;
  validateField: <K extends keyof T>(field: K) => boolean;
  validateForm: () => boolean;
  resetForm: () => void;
  resetField: <K extends keyof T>(field: K) => void;
  save: () => Promise<boolean>;
  markFieldTouched: <K extends keyof T>(field: K) => void;
  clearErrors: () => void;
}

export function useSettingsForm<T extends Record<string, any>>({
  initialValues,
  validationRules = {},
  autoSave = false,
  autoSaveDelay = 2000,
  onSave,
  onAutoSave
}: FormConfig<T>): UseSettingsFormReturn<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [fields, setFields] = useState<Record<keyof T, FormField>>(() => {
    const initialFields = {} as Record<keyof T, FormField>;
    Object.keys(initialValues).forEach(key => {
      initialFields[key as keyof T] = {
        value: initialValues[key as keyof T],
        touched: false,
        dirty: false
      };
    });
    return initialFields;
  });
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const initialValuesRef = useRef(initialValues);

  // Update initial values if they change
  useEffect(() => {
    initialValuesRef.current = initialValues;
  }, [initialValues]);

  // Validate a single field
  const validateField = useCallback(<K extends keyof T>(field: K): boolean => {
    const value = values[field];
    const rules = validationRules[field];
    let error: string | undefined;

    if (rules) {
      if (rules.required && (!value || (typeof value === 'string' && !value.trim()))) {
        error = 'This field is required';
      } else if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
        error = `Minimum length is ${rules.minLength} characters`;
      } else if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
        error = `Maximum length is ${rules.maxLength} characters`;
      } else if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
        error = 'Invalid format';
      } else if (rules.custom) {
        error = rules.custom(value);
      }
    }

    setFields(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        error
      }
    }));

    return !error;
  }, [values, validationRules]);

  // Validate entire form
  const validateForm = useCallback((): boolean => {
    let isValid = true;
    Object.keys(values).forEach(key => {
      const fieldValid = validateField(key as keyof T);
      if (!fieldValid) isValid = false;
    });
    return isValid;
  }, [values, validateField]);

  // Set field value
  const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValues(prev => ({ ...prev, [field]: value }));
    setFields(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        value,
        dirty: value !== initialValuesRef.current[field],
        touched: true
      }
    }));

    // Clear existing auto-save timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set up auto-save if enabled
    if (autoSave && onAutoSave) {
      autoSaveTimeoutRef.current = setTimeout(() => {
        const updatedValues = { ...values, [field]: value };
        onAutoSave(updatedValues).catch(console.error);
      }, autoSaveDelay);
    }
  }, [values, autoSave, autoSaveDelay, onAutoSave]);

  // Set field error manually
  const setFieldError = useCallback(<K extends keyof T>(field: K, error: string | undefined) => {
    setFields(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        error
      }
    }));
  }, []);

  // Mark field as touched
  const markFieldTouched = useCallback(<K extends keyof T>(field: K) => {
    setFields(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        touched: true
      }
    }));
  }, []);

  // Reset entire form
  const resetForm = useCallback(() => {
    setValues(initialValuesRef.current);
    setFields(() => {
      const resetFields = {} as Record<keyof T, FormField>;
      Object.keys(initialValuesRef.current).forEach(key => {
        resetFields[key as keyof T] = {
          value: initialValuesRef.current[key as keyof T],
          touched: false,
          dirty: false
        };
      });
      return resetFields;
    });
  }, []);

  // Reset single field
  const resetField = useCallback(<K extends keyof T>(field: K) => {
    const initialValue = initialValuesRef.current[field];
    setValues(prev => ({ ...prev, [field]: initialValue }));
    setFields(prev => ({
      ...prev,
      [field]: {
        value: initialValue,
        touched: false,
        dirty: false
      }
    }));
  }, []);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setFields(prev => {
      const clearedFields = { ...prev };
      Object.keys(clearedFields).forEach(key => {
        clearedFields[key as keyof T] = {
          ...clearedFields[key as keyof T],
          error: undefined
        };
      });
      return clearedFields;
    });
  }, []);

  // Save form
  const save = useCallback(async (): Promise<boolean> => {
    if (!onSave) return false;

    const isValid = validateForm();
    if (!isValid) return false;

    setIsSaving(true);
    try {
      await onSave(values);
      
      // Mark all fields as clean after successful save
      setFields(prev => {
        const updatedFields = { ...prev };
        Object.keys(updatedFields).forEach(key => {
          updatedFields[key as keyof T] = {
            ...updatedFields[key as keyof T],
            dirty: false
          };
        });
        return updatedFields;
      });

      // Update initial values reference
      initialValuesRef.current = { ...values };
      
      return true;
    } catch (error) {
      console.error('Form save error:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [values, validateForm, onSave]);

  // Cleanup auto-save timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Computed properties
  const errors = Object.keys(fields).reduce((acc, key) => {
    const field = fields[key as keyof T];
    if (field.error) {
      acc[key as keyof T] = field.error;
    }
    return acc;
  }, {} as Partial<Record<keyof T, string>>);

  const isValid = Object.values(fields).every(field => !field.error);
  const isDirty = Object.values(fields).some(field => field.dirty);

  return {
    values,
    fields,
    errors,
    isValid,
    isDirty,
    isLoading,
    isSaving,
    setValue,
    setFieldError,
    validateField,
    validateForm,
    resetForm,
    resetField,
    save,
    markFieldTouched,
    clearErrors
  };
}