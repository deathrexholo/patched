/**
 * Test utilities for AuthContext
 * 
 * This file contains testable versions of AuthContext methods
 * that can be unit tested without React component overhead.
 */

import { 
  updatePassword, 
  reauthenticateWithCredential, 
  EmailAuthProvider,
  User
} from 'firebase/auth';
import { validatePassword } from '@utils/validation/validation';
import authErrorHandler from '@utils/error/authErrorHandler';
import { PasswordChangeResult } from '../types/contexts/auth';

/**
 * Testable version of the changePassword logic from AuthContext
 * This extracts the core business logic for easier unit testing
 */
export async function changePasswordLogic(
  currentUser: User | null,
  currentPassword: string,
  newPassword: string,
  isSocialUser: boolean = false
): Promise<PasswordChangeResult> {
  try {
    if (!currentUser) {
      const error = new Error('No authenticated user found');
      authErrorHandler.logAuthError(error, 'AuthContext-ChangePassword');
      return {
        success: false,
        error: 'You must be logged in to change your password',
        suggestedAction: 'Please log in and try again'
      };
    }

    // Determine if user is actually a social user by checking provider data
    const isActuallySocialUser = isSocialUser || (
      currentUser.providerData.length > 0 && 
      currentUser.providerData.some(provider => 
        provider.providerId === 'google.com' || 
        provider.providerId === 'apple.com'
      )
    );

    // Validate new password before attempting change
    const passwordValidation = validatePassword(newPassword);
    
    if (!passwordValidation.isValid) {
      return {
        success: false,
        error: passwordValidation.error || 'Password does not meet requirements',
        suggestedAction: passwordValidation.suggestions?.[0]
      };
    }

    if (isActuallySocialUser) {
      // For social users setting their first password or users without email provider
      const hasEmailProvider = currentUser.providerData.some(provider => 
        provider.providerId === 'password'
      );

      if (!hasEmailProvider && !currentUser.email) {
        return {
          success: false,
          error: 'Cannot set password for this account type',
          suggestedAction: 'This account was created with a social login and cannot have a password'
        };
      }

      try {
        await updatePassword(currentUser, newPassword);
        
        authErrorHandler.logAuthError(
          new Error('Password set successfully for social user'), 
          'AuthContext-ChangePassword', 
          { 
            userId: currentUser.uid, 
            userType: 'social',
            hasEmailProvider: hasEmailProvider
          }
        );
        
        return { 
          success: true,
          suggestedAction: hasEmailProvider ? 
            'Password updated successfully' : 
            'Password set successfully. You can now use email/password to log in.'
        };
      } catch (error: unknown) {
        authErrorHandler.logAuthError(error, 'AuthContext-ChangePassword', {
          userId: currentUser.uid,
          userType: 'social',
          hasEmailProvider: hasEmailProvider
        });
        
        const errorResult = authErrorHandler.getAuthErrorMessage(error);
        
        if (authErrorHandler.requiresReauthentication(error)) {
          return {
            success: false,
            error: 'Recent authentication required for security',
            requiresReauth: true,
            suggestedAction: 'Please log out and log back in, then try setting your password again'
          };
        }
        
        // Handle specific social user password setting errors
        const errorCode = (error as { code?: string }).code;
        if (errorCode === 'auth/requires-recent-login') {
          return {
            success: false,
            error: 'For security, please log out and log back in first',
            requiresReauth: true,
            suggestedAction: 'Log out, log back in, then try setting your password'
          };
        }
        
        return {
          success: false,
          error: errorResult.message,
          suggestedAction: errorResult.action || 'Please try again or contact support'
        };
      }
    } else {
      // For email/password users changing their existing password
      if (!currentUser.email) {
        return {
          success: false,
          error: 'Email address is required to change password',
          suggestedAction: 'Please ensure your account has an email address'
        };
      }

      if (!currentPassword.trim()) {
        return {
          success: false,
          error: 'Current password is required',
          suggestedAction: 'Please enter your current password to verify your identity'
        };
      }

      try {
        // Step 1: Reauthenticate user with current password
        const credential = EmailAuthProvider.credential(
          currentUser.email,
          currentPassword
        );
        await reauthenticateWithCredential(currentUser, credential);

        // Step 2: Update to new password
        await updatePassword(currentUser, newPassword);
        
        authErrorHandler.logAuthError(
          new Error('Password change successful for email user'), 
          'AuthContext-ChangePassword', 
          { userId: currentUser.uid, userType: 'email' }
        );
        
        return { 
          success: true,
          suggestedAction: 'Password updated successfully'
        };
      } catch (error: unknown) {
        authErrorHandler.logAuthError(error, 'AuthContext-ChangePassword', {
          userId: currentUser.uid,
          userType: 'email',
          step: 'reauthentication_or_update'
        });
        
        const errorResult = authErrorHandler.getAuthErrorMessage(error);
        const errorCode = (error as { code?: string }).code;
        
        // Handle specific reauthentication errors
        if (errorCode === 'auth/wrong-password') {
          return {
            success: false,
            error: 'Current password is incorrect',
            suggestedAction: 'Please check your current password and try again'
          };
        }
        
        if (errorCode === 'auth/too-many-requests') {
          return {
            success: false,
            error: 'Too many failed attempts',
            suggestedAction: 'Please wait a few minutes before trying again'
          };
        }
        
        if (authErrorHandler.requiresReauthentication(error)) {
          return {
            success: false,
            error: 'Authentication session expired',
            requiresReauth: true,
            suggestedAction: 'Please log out and log back in, then try changing your password'
          };
        }
        
        return {
          success: false,
          error: errorResult.message,
          suggestedAction: errorResult.action || 'Please try again or contact support if the problem persists'
        };
      }
    }
  } catch (error: unknown) {
    // Catch-all for unexpected errors
    authErrorHandler.logAuthError(error, 'AuthContext-ChangePassword', {
      userId: currentUser?.uid,
      userType: isSocialUser ? 'social' : 'email',
      step: 'unexpected_error'
    });
    
    const errorResult = authErrorHandler.getAuthErrorMessage(error);
    
    return {
      success: false,
      error: errorResult.message,
      suggestedAction: errorResult.action || 'Please try again or contact support if the problem persists'
    };
  }
}