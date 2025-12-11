import React, { ReactNode } from 'react';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';
import './FormField.css';

export interface FormFieldProps {
  label: string;
  name: string;
  error?: string;
  warning?: string;
  success?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
  helpText?: string;
  showValidationIcon?: boolean;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  error,
  warning,
  success,
  required = false,
  disabled = false,
  className = '',
  children,
  helpText,
  showValidationIcon = true
}) => {
  const hasError = !!error;
  const hasWarning = !!warning && !hasError;
  const hasSuccess = !!success && !hasError && !hasWarning;

  const getValidationIcon = () => {
    if (!showValidationIcon) return null;
    
    if (hasError) return <AlertCircle size={16} className="validation-icon error-icon" />;
    if (hasWarning) return <AlertCircle size={16} className="validation-icon warning-icon" />;
    if (hasSuccess) return <CheckCircle size={16} className="validation-icon success-icon" />;
    
    return null;
  };

  const getValidationMessage = () => {
    if (hasError) return error;
    if (hasWarning) return warning;
    if (hasSuccess) return success;
    return null;
  };

  const getValidationClass = () => {
    if (hasError) return 'has-error';
    if (hasWarning) return 'has-warning';
    if (hasSuccess) return 'has-success';
    return '';
  };

  return (
    <div className={`form-field ${getValidationClass()} ${disabled ? 'disabled' : ''} ${className}`}>
      <label htmlFor={name} className="form-label">
        {label}
        {required && <span className="required-indicator" aria-label="required">*</span>}
      </label>
      
      <div className="form-input-container">
        {children}
        {getValidationIcon()}
      </div>
      
      {helpText && !getValidationMessage() && (
        <div className="form-help-text">
          <Info size={14} />
          <span>{helpText}</span>
        </div>
      )}
      
      {getValidationMessage() && (
        <div 
          className={`form-validation-message ${hasError ? 'error' : hasWarning ? 'warning' : 'success'}`}
          id={`${name}-error`}
          role={hasError ? 'alert' : 'status'}
          aria-live={hasError ? 'assertive' : 'polite'}
        >
          {getValidationMessage()}
        </div>
      )}
    </div>
  );
};

export default FormField;