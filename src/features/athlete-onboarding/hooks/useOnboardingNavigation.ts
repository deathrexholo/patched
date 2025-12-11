import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export interface OnboardingStep {
  id: string;
  path: string;
  title: string;
  stepNumber: number;
  isOptional?: boolean;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'sport-selection',
    path: '/athlete-onboarding/sport',
    title: 'Choose Your Sport',
    stepNumber: 1
  },
  {
    id: 'position-selection',
    path: '/athlete-onboarding/position',
    title: 'Select Your Position',
    stepNumber: 2
  },
  {
    id: 'subcategory-selection',
    path: '/athlete-onboarding/subcategory',
    title: 'Choose Your Subcategory',
    stepNumber: 3
  },
  {
    id: 'specialization-selection',
    path: '/athlete-onboarding/specialization',
    title: 'Choose Specializations',
    stepNumber: 4,
    isOptional: true
  }
];

export const useOnboardingNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const getCurrentStep = useCallback((): OnboardingStep | null => {
    return ONBOARDING_STEPS.find(step => 
      location.pathname.startsWith(step.path)
    ) || null;
  }, [location.pathname]);

  const getCurrentStepNumber = useCallback((): number => {
    const currentStep = getCurrentStep();
    return currentStep?.stepNumber || 1;
  }, [getCurrentStep]);

  const getTotalSteps = useCallback((): number => {
    return ONBOARDING_STEPS.length;
  }, []);

  const canGoBack = useCallback((): boolean => {
    const currentStep = getCurrentStep();
    if (!currentStep) return false;
    return currentStep.stepNumber > 1;
  }, [getCurrentStep]);

  const canGoForward = useCallback((): boolean => {
    const currentStep = getCurrentStep();
    if (!currentStep) return false;
    return currentStep.stepNumber < ONBOARDING_STEPS.length;
  }, [getCurrentStep]);

  const goBack = useCallback(() => {
    const currentStep = getCurrentStep();
    if (!currentStep || !canGoBack()) {
      // If we're on the first step or can't determine current step,
      // go back to welcome page
      navigate('/');
      return;
    }

    const previousStepNumber = currentStep.stepNumber - 1;
    const previousStep = ONBOARDING_STEPS.find(step =>
      step.stepNumber === previousStepNumber
    );

    if (previousStep) {
      navigate(previousStep.path);
    } else {
      // Fallback to welcome page if no previous step found
      navigate('/');
    }
  }, [getCurrentStep, canGoBack, navigate]);

  const goForward = useCallback(() => {
    const currentStep = getCurrentStep();
    if (!currentStep || !canGoForward()) {
      return;
    }

    const nextStepNumber = currentStep.stepNumber + 1;
    const nextStep = ONBOARDING_STEPS.find(step => 
      step.stepNumber === nextStepNumber
    );

    if (nextStep) {
      navigate(nextStep.path);
    }
  }, [getCurrentStep, canGoForward, navigate]);

  const goToStep = useCallback((stepNumber: number) => {
    const targetStep = ONBOARDING_STEPS.find(step => 
      step.stepNumber === stepNumber
    );

    if (targetStep) {
      navigate(targetStep.path);
    }
  }, [navigate]);

  const completeOnboarding = useCallback(() => {
    // Navigate directly to login after completing onboarding
    navigate('/login');
  }, [navigate]);

  const validateStepProgression = useCallback((
    fromStep: number, 
    toStep: number
  ): boolean => {
    // Allow going back to any previous step
    if (toStep < fromStep) {
      return true;
    }

    // Allow going forward only one step at a time
    if (toStep === fromStep + 1) {
      return true;
    }

    // Don't allow skipping steps forward
    return false;
  }, []);

  const isFirstStep = useCallback((): boolean => {
    const currentStep = getCurrentStep();
    return currentStep?.stepNumber === 1;
  }, [getCurrentStep]);

  const isLastStep = useCallback((): boolean => {
    const currentStep = getCurrentStep();
    return currentStep?.stepNumber === ONBOARDING_STEPS.length;
  }, [getCurrentStep]);

  return {
    // Step information
    getCurrentStep,
    getCurrentStepNumber,
    getTotalSteps,
    
    // Navigation capabilities
    canGoBack,
    canGoForward,
    isFirstStep,
    isLastStep,
    
    // Navigation actions
    goBack,
    goForward,
    goToStep,
    completeOnboarding,
    
    // Validation
    validateStepProgression,
    
    // Constants
    ONBOARDING_STEPS
  };
};