// Hook for managing athlete profile operations
import { useState, useCallback } from 'react';
import { useOnboardingStore } from '../store/onboardingStore';
import athleteProfileService from '../../../services/api/athleteProfileService';
import { AthleteProfile } from '../store/onboardingStore';

interface UseAthleteProfileReturn {
  isLoading: boolean;
  error: string | null;
  saveProfile: (userId: string) => Promise<void>;
  loadProfile: (userId: string) => Promise<AthleteProfile | null>;
  updateProfile: (userId: string, updateData: Partial<AthleteProfile>) => Promise<AthleteProfile>;
  hasCompletedOnboarding: (userId: string) => Promise<boolean>;
  clearError: () => void;
}

/**
 * Hook for managing athlete profile operations with Firebase integration
 */
export const useAthleteProfile = (): UseAthleteProfileReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { 
    selectedSports, 
    selectedPosition, 
    selectedSpecializations,
    saveProfile: saveProfileToStore,
    loadProfile: loadProfileToStore
  } = useOnboardingStore();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const saveProfile = useCallback(async (userId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Use the store's save method which includes validation and Firebase integration
      await saveProfileToStore(userId);} catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save profile';
      setError(errorMessage);
      console.error('❌ Failed to save profile via hook:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [saveProfileToStore]);

  const loadProfile = useCallback(async (userId: string): Promise<AthleteProfile | null> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Load directly from service for more control
      const profile = await athleteProfileService.getAthleteProfile(userId);
      
      if (profile) {
        // Also update the store
        await loadProfileToStore(userId);
      }return profile;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load profile';
      setError(errorMessage);
      console.error('❌ Failed to load profile via hook:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [loadProfileToStore]);

  const updateProfile = useCallback(async (
    userId: string, 
    updateData: Partial<AthleteProfile>
  ): Promise<AthleteProfile> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Update via service
      const updatedProfile = await athleteProfileService.updateAthleteProfile(userId, updateData);
      
      // Reload the profile in the store to keep it in sync
      await loadProfileToStore(userId);return updatedProfile;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMessage);
      console.error('❌ Failed to update profile via hook:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadProfileToStore]);

  const hasCompletedOnboarding = useCallback(async (userId: string): Promise<boolean> => {
    try {
      setError(null);
      
      const completed = await athleteProfileService.hasCompletedOnboarding(userId);return completed;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check onboarding status';
      setError(errorMessage);
      console.error('❌ Failed to check onboarding completion via hook:', err);
      return false;
    }
  }, []);

  return {
    isLoading,
    error,
    saveProfile,
    loadProfile,
    updateProfile,
    hasCompletedOnboarding,
    clearError
  };
};