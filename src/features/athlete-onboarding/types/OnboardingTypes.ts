// Re-export types from store for convenience
export type {
  Sport,
  Position,
  Subcategory,
  Specialization,
  AthleteProfile
} from '../store/onboardingStore';

// Re-export types from navigation hook
export type {
  OnboardingStep
} from '../hooks/useOnboardingNavigation';

// Additional component-specific types
export interface OnboardingPageProps {
  className?: string;
}

export interface SelectionCardProps {
  id: string;
  title: string;
  description: string;
  icon?: string;
  image?: string;
  selected?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export interface OnboardingFormProps {
  onSubmit: () => void;
  onBack?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

// Validation types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface StepValidation {
  [stepNumber: number]: (data: any) => ValidationResult;
}

// Navigation types
export interface NavigationState {
  canGoBack: boolean;
  canGoForward: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
  currentStepNumber: number;
  totalSteps: number;
}