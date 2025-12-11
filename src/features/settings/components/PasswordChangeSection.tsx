import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import LoadingSpinner from '../../../components/common/ui/LoadingSpinner';
import ToastContainer from '../../../components/common/ui/ToastContainer';
import ConfirmationDialog from '../../../components/common/ui/ConfirmationDialog';
import { useToast } from '../../../hooks/useToast';
import { useConfirmation } from '../../../hooks/useConfirmation';
import { 
  validatePassword, 
  validatePasswordConfirmation, 
  validatePasswordForLogin,
  getPasswordStrengthColor,
  getPasswordStrengthText,
  PasswordValidationResult 
} from '../../../utils/validation/validation';
import '../styles/PasswordChangeSection.css';

interface PasswordChangeState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  showCurrentPassword: boolean;
  showNewPassword: boolean;
  showConfirmPassword: boolean;
  isLoading: boolean;
  error: string;
  success: string;
  passwordValidation: PasswordValidationResult | null;
  confirmPasswordError: string;
  forgotPasswordMode: boolean;
  verificationMethod: 'none' | 'oauth' | 'email';
}

const PasswordChangeSection: React.FC = () => {
  const { currentUser, changePassword, reauthenticateWithGoogle, reauthenticateWithApple, resetPassword } = useAuth();
  const { toasts, showSuccess, showError, showWarning } = useToast();
  const { confirmationState, showConfirmation, hideConfirmation } = useConfirmation();
  const [state, setState] = useState<PasswordChangeState>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    showCurrentPassword: false,
    showNewPassword: false,
    showConfirmPassword: false,
    isLoading: false,
    error: '',
    success: '',
    passwordValidation: null,
    confirmPasswordError: '',
    forgotPasswordMode: false,
    verificationMethod: 'none'
  });

  // Determine if user is a social login user
  const isSocialUser = currentUser?.providerData.some(provider => 
    provider.providerId === 'google.com' || provider.providerId === 'apple.com'
  ) && !currentUser?.providerData.some(provider => provider.providerId === 'password');

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const hasEmailProvider = currentUser?.providerData.some(provider => 
    provider.providerId === 'password'
  );

  // Real-time password validation
  useEffect(() => {
    if (state.newPassword) {
      const validation = validatePassword(state.newPassword);
      setState(prev => ({ ...prev, passwordValidation: validation }));
    } else {
      setState(prev => ({ ...prev, passwordValidation: null }));
    }
  }, [state.newPassword]);

  // Real-time password confirmation validation
  useEffect(() => {
    if (state.confirmPassword) {
      const confirmValidation = validatePasswordConfirmation(state.newPassword, state.confirmPassword);
      setState(prev => ({ 
        ...prev, 
        confirmPasswordError: confirmValidation.isValid ? '' : (confirmValidation.error || '')
      }));
    } else {
      setState(prev => ({ ...prev, confirmPasswordError: '' }));
    }
  }, [state.newPassword, state.confirmPassword]);

  const handleInputChange = (field: keyof PasswordChangeState, value: string) => {
    setState(prev => ({
      ...prev,
      [field]: value,
      error: '', // Clear error when user starts typing
      success: ''
    }));
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    const fieldMap = {
      current: 'showCurrentPassword',
      new: 'showNewPassword',
      confirm: 'showConfirmPassword'
    } as const;

    setState(prev => ({
      ...prev,
      [fieldMap[field]]: !prev[fieldMap[field]]
    }));
  };

  const validateForm = (): boolean => {
    // For email users, current password is required
    if (!isSocialUser && !state.currentPassword.trim()) {
      setState(prev => ({ ...prev, error: 'Current password is required' }));
      return false;
    }

    // Validate current password format for email users
    if (!isSocialUser) {
      const currentPasswordValidation = validatePasswordForLogin(state.currentPassword);
      if (!currentPasswordValidation.isValid) {
        setState(prev => ({ ...prev, error: currentPasswordValidation.error || 'Invalid current password' }));
        return false;
      }
    }

    // Validate new password
    if (!state.passwordValidation?.isValid) {
      setState(prev => ({
        ...prev,
        error: state.passwordValidation?.error || 'New password does not meet requirements'
      }));
      return false;
    }

    // Validate password confirmation
    if (state.confirmPasswordError) {
      setState(prev => ({ ...prev, error: state.confirmPasswordError }));
      return false;
    }

    if (!state.confirmPassword.trim()) {
      setState(prev => ({ ...prev, error: 'Please confirm your new password' }));
      return false;
    }

    return true;
  };

  // Get OAuth provider for current user
  const getOAuthProvider = (): 'google.com' | 'apple.com' | null => {
    if (!currentUser) return null;
    const googleProvider = currentUser.providerData.find(p => p.providerId === 'google.com');
    if (googleProvider) return 'google.com';
    const appleProvider = currentUser.providerData.find(p => p.providerId === 'apple.com');
    if (appleProvider) return 'apple.com';
    return null;
  };

  // Get user's account email (may be different from auth email)
  const getUserEmail = (): string => {
    return currentUser?.email || '';
  };

  // Show forgot password mode with alternative verification options
  const handleForgotPassword = () => {
    setState(prev => ({
      ...prev,
      forgotPasswordMode: true,
      verificationMethod: 'none',
      error: ''
    }));
  };

  // Handle OAuth verification (Google or Apple)
  const handleOAuthVerification = async (provider: 'google.com' | 'apple.com') => {
    setState(prev => ({ ...prev, isLoading: true, error: '' }));

    try {// Call appropriate OAuth reauthentication method
      if (provider === 'google.com') {
        await reauthenticateWithGoogle();
      } else {
        await reauthenticateWithApple();
      }

      // After successful OAuth verification, show confirmation dialog
      const confirmationMessage = 'Are you sure you want to change your password? You will need to use the new password for future logins.';
      const confirmed = await showConfirmation({
        title: 'Change Password',
        message: confirmationMessage,
        confirmText: 'Change Password',
        cancelText: 'Cancel',
        variant: 'warning'
      });

      if (!confirmed) {
        hideConfirmation();
        setState(prev => ({
          ...prev,
          isLoading: false,
          forgotPasswordMode: false,
          verificationMethod: 'none'
        }));
        return;
      }

      // Now update the password with OAuth verification
      const result = await changePassword(state.newPassword, state.newPassword, false);

      if (result.success) {
        const successMessage = result.suggestedAction || 'Password updated successfully!';
        setState(prev => ({
          ...prev,
          isLoading: false,
          success: successMessage,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
          passwordValidation: null,
          confirmPasswordError: '',
          forgotPasswordMode: false,
          verificationMethod: 'none'
        }));

        showSuccess('Password Updated', successMessage);
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Failed to update password'
        }));

        showError('Failed to Update Password', result.error || 'An error occurred');
      }
    } catch (error: unknown) {
      const errorMessage = (error as { message?: string }).message || 'OAuth verification failed. Please try again.';

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      showError('Verification Failed', errorMessage);
    } finally {
      hideConfirmation();
    }
  };

  // Handle email-based password reset
  const handleEmailReset = async () => {
    const userEmail = getUserEmail();
    if (!userEmail) {
      setState(prev => ({
        ...prev,
        error: 'Email address not found on your account'
      }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: '' }));

    try {// Send password reset email
      await resetPassword(userEmail);

      setState(prev => ({
        ...prev,
        isLoading: false,
        success: `Password reset email sent to ${userEmail}. Please check your inbox and follow the link to set your new password.`,
        forgotPasswordMode: false,
        verificationMethod: 'none'
      }));

      showSuccess(
        'Reset Email Sent',
        `Check your inbox at ${userEmail} for password reset instructions`
      );
    } catch (error: unknown) {
      const errorMessage = (error as { message?: string }).message || 'Failed to send reset email. Please try again.';

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      showError('Reset Failed', errorMessage);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    // Show confirmation dialog for password changes
    const confirmationMessage = isSocialUser 
      ? 'Are you sure you want to set a password for your account? This will enable email/password login in addition to your social login.'
      : 'Are you sure you want to change your password? You will need to use the new password for future logins.';

    const confirmed = await showConfirmation({
      title: isSocialUser ? 'Set Password' : 'Change Password',
      message: confirmationMessage,
      confirmText: isSocialUser ? 'Set Password' : 'Change Password',
      cancelText: 'Cancel',
      variant: 'warning'
    });

    if (!confirmed) {
      hideConfirmation();
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: '', success: '' }));

    try {
      const result = await changePassword(
        state.currentPassword,
        state.newPassword,
        isSocialUser
      );

      if (result.success) {
        const successMessage = result.suggestedAction || 'Password updated successfully!';
        
        setState(prev => ({
          ...prev,
          isLoading: false,
          success: successMessage,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
          passwordValidation: null,
          confirmPasswordError: ''
        }));

        // Show success toast
        showSuccess(
          isSocialUser ? 'Password Set Successfully' : 'Password Updated',
          successMessage
        );
      } else {
        const errorMessage = result.error || 'Failed to update password';
        
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage
        }));

        // Show error toast with appropriate type
        if (result.requiresReauth) {
          showWarning(
            'Reauthentication Required',
            `${errorMessage} ${result.suggestedAction || ''}`
          );
          setState(prev => ({
            ...prev,
            error: `${errorMessage} ${result.suggestedAction || ''}`
          }));
        } else {
          showError(
            isSocialUser ? 'Failed to Set Password' : 'Failed to Update Password',
            errorMessage
          );
        }
      }
    } catch (error) {
      const errorMessage = 'An unexpected error occurred. Please try again.';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      showError('Unexpected Error', errorMessage);
    } finally {
      hideConfirmation();
    }
  };

  const renderPasswordStrengthIndicator = () => {
    if (!state.passwordValidation) return null;

    const { strength, score, requirements } = state.passwordValidation;
    const strengthColor = getPasswordStrengthColor(strength);
    const strengthText = getPasswordStrengthText(strength);

    return (
      <div className="password-strength-indicator">
        <div className="strength-bar-container">
          <div 
            className="strength-bar" 
            style={{ 
              width: `${score}%`, 
              backgroundColor: strengthColor 
            }}
          />
        </div>
        <div className="strength-info">
          <span className="strength-text" style={{ color: strengthColor }}>
            {strengthText}
          </span>
          <span className="strength-score">
            {score}/100
          </span>
        </div>
        
        {requirements && (
          <div className="password-requirements">
            <div className={`requirement ${requirements.minLength ? 'met' : 'unmet'}`}>
              {requirements.minLength ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              At least 8 characters
            </div>
            <div className={`requirement ${requirements.hasLowercase ? 'met' : 'unmet'}`}>
              {requirements.hasLowercase ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              Lowercase letter
            </div>
            <div className={`requirement ${requirements.hasUppercase ? 'met' : 'unmet'}`}>
              {requirements.hasUppercase ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              Uppercase letter
            </div>
            <div className={`requirement ${requirements.hasNumber ? 'met' : 'unmet'}`}>
              {requirements.hasNumber ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              Number
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderUserTypeInfo = () => {
    if (isSocialUser) {
      return (
        <div className="user-type-info social-user">
          <Info size={16} />
          <div>
            <p><strong>Setting up password for social account</strong></p>
            <p>You can set a password to enable email/password login in addition to your social login.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="user-type-info email-user">
        <Lock size={16} />
        <div>
          <p><strong>Change your password</strong></p>
          <p>Enter your current password and choose a new secure password.</p>
        </div>
      </div>
    );
  };

  // Render alternative verification options when user forgets password
  const renderAlternativeVerification = () => {
    const oauthProvider = getOAuthProvider();

    return (
      <div className="alternative-verification">
        <div className="verification-header">
          <AlertCircle size={20} />
          <h4>Don't Remember Your Password?</h4>
        </div>

        <p className="verification-info">
          Verify your identity using one of these methods:
        </p>

        <div className="verification-options">
          {oauthProvider === 'google.com' && (
            <button
              type="button"
              className="verification-button google"
              onClick={() => handleOAuthVerification('google.com')}
              disabled={state.isLoading}
            >
              {state.isLoading ? '🔄 Verifying...' : '🔵 Verify with Google'}
            </button>
          )}

          {oauthProvider === 'apple.com' && (
            <button
              type="button"
              className="verification-button apple"
              onClick={() => handleOAuthVerification('apple.com')}
              disabled={state.isLoading}
            >
              {state.isLoading ? '🔄 Verifying...' : '🍎 Verify with Apple'}
            </button>
          )}

          <button
            type="button"
            className="verification-button email"
            onClick={handleEmailReset}
            disabled={state.isLoading}
          >
            {state.isLoading ? '📧 Sending...' : '📧 Send Reset Email'}
          </button>
        </div>

        <button
          type="button"
          className="back-button"
          onClick={() => setState(prev => ({
            ...prev,
            forgotPasswordMode: false,
            verificationMethod: 'none',
            error: ''
          }))}
          disabled={state.isLoading}
        >
          ← Back to Password Form
        </button>
      </div>
    );
  };

  return (
    <>
      <ToastContainer toasts={toasts} position="top-right" />
      <ConfirmationDialog
        isOpen={confirmationState.isOpen}
        title={confirmationState.title}
        message={confirmationState.message}
        confirmText={confirmationState.confirmText}
        cancelText={confirmationState.cancelText}
        variant={confirmationState.variant}
        onConfirm={confirmationState.onConfirm}
        onCancel={confirmationState.onCancel}
        isLoading={confirmationState.isLoading}
      />
      <div className="password-change-section">
        <div className="section-header">
          <h3>Password Management</h3>
          <p>Update your password to keep your account secure</p>
        </div>

      {renderUserTypeInfo()}

      <form onSubmit={handleSubmit} className="password-change-form">
        {!state.forgotPasswordMode ? (
          <>
            {!isSocialUser && (
              <div className="form-group">
                <label htmlFor="currentPassword">Current Password</label>
                <div className="password-input-container">
                  <input
                    type={state.showCurrentPassword ? 'text' : 'password'}
                    id="currentPassword"
                    value={state.currentPassword}
                    onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                    placeholder="Enter your current password"
                    disabled={state.isLoading}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => togglePasswordVisibility('current')}
                    aria-label={state.showCurrentPassword ? 'Hide password' : 'Show password'}
                  >
                    {state.showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <button
                  type="button"
                  className="forgot-password-link"
                  onClick={handleForgotPassword}
                  disabled={state.isLoading}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="newPassword">
                {isSocialUser ? 'New Password' : 'New Password'}
              </label>
              <div className="password-input-container">
                <input
                  type={state.showNewPassword ? 'text' : 'password'}
                  id="newPassword"
                  value={state.newPassword}
                  onChange={(e) => handleInputChange('newPassword', e.target.value)}
                  placeholder={isSocialUser ? 'Create a password' : 'Enter your new password'}
                  disabled={state.isLoading}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => togglePasswordVisibility('new')}
                  aria-label={state.showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {state.showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {renderPasswordStrengthIndicator()}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <div className="password-input-container">
                <input
                  type={state.showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={state.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Confirm your new password"
                  disabled={state.isLoading}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => togglePasswordVisibility('confirm')}
                  aria-label={state.showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {state.showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {state.confirmPasswordError && (
                <div className="field-error">
                  <AlertCircle size={14} />
                  {state.confirmPasswordError}
                </div>
              )}
            </div>

            {state.error && (
              <div className="form-error">
                <AlertCircle size={16} />
                {state.error}
              </div>
            )}

            {state.success && (
              <div className="form-success">
                <CheckCircle size={16} />
                {state.success}
              </div>
            )}

            <div className="form-actions">
              <button
                type="submit"
                className="submit-button"
                disabled={state.isLoading || !state.passwordValidation?.isValid || !!state.confirmPasswordError}
              >
                {state.isLoading ? (
                  <>
                    <LoadingSpinner size="small" color="white" className="in-button" />
                    {isSocialUser ? 'Setting Password...' : 'Updating Password...'}
                  </>
                ) : (
                  isSocialUser ? 'Set Password' : 'Update Password'
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            {renderAlternativeVerification()}

            {state.error && (
              <div className="form-error">
                <AlertCircle size={16} />
                {state.error}
              </div>
            )}

            {state.success && (
              <div className="form-success">
                <CheckCircle size={16} />
                {state.success}
              </div>
            )}
          </>
        )}
      </form>
    </div>
    </>
  );
};

export default PasswordChangeSection;