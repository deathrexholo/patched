import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { autoBackupOnboardingProgress, createOnboardingBackup } from '../utils/backupUtils';

export interface Sport {
  id: string;
  name: string;
  icon: string;
  image: string;
  description: string;
}

export interface Position {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

export interface Specialization {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface Subcategory {
  id: string;
  name: string;
  description?: string;
}

export interface AthleteProfile {
  sports: Sport[];
  position: Position | null;
  subcategory: Subcategory | null;
  specializations: Record<string, string>;
  completedOnboarding: boolean;
  onboardingCompletedAt: Date | null;
}

interface OnboardingState {
  // Current selections
  selectedSports: Sport[];
  selectedPosition: Position | null;
  selectedSubcategory: Subcategory | null;
  selectedSpecializations: Record<string, string>;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  
  // Progress tracking
  completedSteps: Set<number>;
  
  // Actions
  toggleSport: (sport: Sport) => void;
  setSports: (sports: Sport[]) => void;
  setPosition: (position: Position) => void;
  setSubcategory: (subcategory: Subcategory) => void;
  setSpecialization: (category: string, value: string) => void;
  clearSpecializations: () => void;
  
  // Step management
  markStepCompleted: (stepNumber: number) => void;
  isStepCompleted: (stepNumber: number) => boolean;
  
  // Loading and error states
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Profile management
  getAthleteProfile: () => AthleteProfile;
  saveProfile: (userId?: string) => Promise<void>;
  loadProfile: (userId: string) => Promise<void>;
  
  // Reset functionality
  resetOnboarding: () => void;
  clearSelections: () => void;
}

const initialState = {
  selectedSports: [],
  selectedPosition: null,
  selectedSubcategory: null,
  selectedSpecializations: {},
  isLoading: false,
  error: null,
  completedSteps: new Set<number>(),
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      toggleSport: (sport: Sport) => {
        set((state) => {
          const isSelected = state.selectedSports.some(s => s.id === sport.id);
          const newSelectedSports = isSelected
            ? state.selectedSports.filter(s => s.id !== sport.id)
            : [...state.selectedSports, sport];
          
          const newState = {
            selectedSports: newSelectedSports,
            error: null,
            // Update completed steps if at least one sport is selected
            completedSteps: newSelectedSports.length > 0 
              ? new Set([...state.completedSteps, 1])
              : new Set([...state.completedSteps].filter(step => step !== 1))
          };
          
          // Create backup after state update
          setTimeout(() => {
            autoBackupOnboardingProgress(
              newSelectedSports,
              state.selectedPosition,
              state.selectedSpecializations,
              1
            );
          }, 0);
          
          return newState;
        });
      },

      setSports: (sports: Sport[]) => {
        set((state) => {
          const newState = {
            selectedSports: sports,
            error: null,
            // Update completed steps if at least one sport is selected
            completedSteps: sports.length > 0 
              ? new Set([...state.completedSteps, 1])
              : new Set([...state.completedSteps].filter(step => step !== 1))
          };
          
          return newState;
        });
      },
      
      setPosition: (position: Position) => {
        set((state) => {
          const newState = {
            selectedPosition: position,
            // Clear subcategory and specializations when position changes
            selectedSubcategory: null,
            selectedSpecializations: {},
            error: null,
            // Update completed steps
            completedSteps: new Set([...state.completedSteps, 2])
          };
          
          // Create backup after state update
          setTimeout(() => {
            autoBackupOnboardingProgress(
              state.selectedSports,
              position,
              {},
              2
            );
          }, 0);
          
          return newState;
        });
      },

      setSubcategory: (subcategory: Subcategory) => {
        set((state) => {
          const newState = {
            selectedSubcategory: subcategory,
            error: null,
            // Update completed steps
            completedSteps: new Set([...state.completedSteps, 3])
          };
          
          return newState;
        });
      },
      
      setSpecialization: (category: string, value: string) => {
        set((state) => {
          const newSpecializations = {
            ...state.selectedSpecializations,
            [category]: value
          };
          
          const newState = {
            selectedSpecializations: newSpecializations,
            error: null,
            // Update completed steps
            completedSteps: new Set([...state.completedSteps, 3])
          };
          
          // Create backup after state update
          setTimeout(() => {
            autoBackupOnboardingProgress(
              state.selectedSports,
              state.selectedPosition,
              newSpecializations,
              3
            );
          }, 0);
          
          return newState;
        });
      },
      
      clearSpecializations: () => {
        set((state) => ({
          selectedSpecializations: {},
          completedSteps: new Set([...state.completedSteps].filter(step => step !== 3))
        }));
      },
      
      markStepCompleted: (stepNumber: number) => {
        set((state) => ({
          completedSteps: new Set([...state.completedSteps, stepNumber])
        }));
      },
      
      isStepCompleted: (stepNumber: number) => {
        return get().completedSteps.has(stepNumber);
      },
      
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
      
      setError: (error: string | null) => {
        set({ error });
      },
      
      getAthleteProfile: (): AthleteProfile => {
        const state = get();
        return {
          sports: state.selectedSports,
          position: state.selectedPosition,
          subcategory: state.selectedSubcategory,
          specializations: state.selectedSpecializations,
          completedOnboarding: state.selectedSports.length > 0 && state.selectedPosition !== null && state.selectedSubcategory !== null,
          onboardingCompletedAt: null // Will be set when saved to Firebase
        };
      },
      
      saveProfile: async (userId?: string) => {
        const state = get();
        
        if (state.selectedSports.length === 0 || !state.selectedPosition || !state.selectedSubcategory) {
          set({ error: 'Please complete sport, position, and subcategory selection before saving.' });
          return;
        }

        if (!userId) {
          set({ error: 'User ID is required to save profile.' });
          return;
        }
        
        try {
          set({ isLoading: true, error: null });
          
          // Import the service dynamically to avoid circular dependencies
          const { default: athleteProfileService } = await import('../../../services/api/athleteProfileService');
          
          // Validate profile data before saving
          const profileData = {
            sports: state.selectedSports,
            position: state.selectedPosition,
            specializations: state.selectedSpecializations,
            completedOnboarding: true,
            onboardingCompletedAt: new Date()
          };
          
          const validation = athleteProfileService.validateAthleteProfile(profileData);
          if (!validation.isValid) {
            set({ 
              isLoading: false, 
              error: `Profile validation failed: ${validation.errors.join(', ')}` 
            });
            return;
          }// Save to Firebase
          const savedProfile = await athleteProfileService.createAthleteProfile({
            userId,
            sports: state.selectedSports,
            position: state.selectedPosition,
            subcategory: state.selectedSubcategory,
            specializations: state.selectedSpecializations
          });// Also save to localStorage as backup
          try {
            localStorage.setItem('athlete-profile', JSON.stringify(savedProfile));} catch (storageError) {
            console.warn('Failed to backup to localStorage:', storageError);
          }
          
          // Mark onboarding as completed
          set({ 
            isLoading: false,
            completedSteps: new Set([...state.completedSteps, 4]) // Mark final step as completed
          });
          
        } catch (error) {
          console.error('Failed to save athlete profile:', error);
          
          // Provide user-friendly error messages
          let errorMessage = 'Failed to save your profile. Please try again.';
          
          if (error instanceof Error) {
            if (error.message.includes('permission')) {
              errorMessage = 'You do not have permission to save this profile. Please check your account status.';
            } else if (error.message.includes('network')) {
              errorMessage = 'Network error. Please check your connection and try again.';
            } else if (error.message.includes('validation')) {
              errorMessage = error.message;
            }
          }
          
          set({ 
            isLoading: false, 
            error: errorMessage
          });
          
          // Re-throw error for component handling
          throw error;
        }
      },
      
      loadProfile: async (userId: string) => {
        try {
          set({ isLoading: true, error: null });
          
          // Import the service dynamically to avoid circular dependencies
          const { default: athleteProfileService } = await import('../../../services/api/athleteProfileService');// Load from Firebase
          const profile = await athleteProfileService.getAthleteProfile(userId);
          
          if (profile) {// Update store with loaded profile
            set({
              selectedSports: profile.sports || [],
              selectedPosition: profile.position,
              selectedSpecializations: profile.specializations,
              isLoading: false,
              error: null,
              // Mark all steps as completed if profile exists
              completedSteps: new Set([1, 2, 3, 4])
            });
          } else {set({ isLoading: false, error: null });
          }
          
        } catch (error) {
          console.error('Failed to load athlete profile:', error);
          
          // Try to load from localStorage as fallback
          try {
            const localProfile = localStorage.getItem('athlete-profile');
            if (localProfile) {
              const parsedProfile = JSON.parse(localProfile) as AthleteProfile;set({
                selectedSports: parsedProfile.sports || [],
                selectedPosition: parsedProfile.position,
                selectedSpecializations: parsedProfile.specializations,
                isLoading: false,
                error: 'Loaded from local backup. Changes may not be synced.',
                completedSteps: new Set([1, 2, 3, 4])
              });
              return;
            }
          } catch (localError) {
            console.warn('Failed to load from localStorage:', localError);
          }
          
          set({ 
            isLoading: false, 
            error: 'Failed to load your profile. Please try again or restart the onboarding process.' 
          });
        }
      },
      
      resetOnboarding: () => {
        set({
          ...initialState,
          completedSteps: new Set<number>()
        });
      },
      
      clearSelections: () => {
        set({
          selectedSports: [],
          selectedPosition: null,
          selectedSubcategory: null,
          selectedSpecializations: {},
          completedSteps: new Set<number>(),
          error: null
        });
      }
    }),
    {
      name: 'athlete-onboarding-storage',
      // Only persist the selections, not UI state
      partialize: (state) => ({
        selectedSports: state.selectedSports,
        selectedPosition: state.selectedPosition,
        selectedSubcategory: state.selectedSubcategory,
        selectedSpecializations: state.selectedSpecializations,
        completedSteps: Array.from(state.completedSteps) // Convert Set to Array for serialization
      }),
      // Convert Array back to Set when rehydrating
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray((state as any).completedSteps)) {
          state.completedSteps = new Set((state as any).completedSteps);
        }
      }
    }
  )
);