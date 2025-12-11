import { useReducer, useCallback, useRef, useEffect } from 'react';

export interface LoadingState {
  isInitialLoad: boolean;
  isLoadingMore: boolean;
  hasError: boolean;
  errorMessage?: string;
  transitionState: 'idle' | 'loading' | 'success' | 'error';
}

export interface LoadingTransition {
  from: LoadingState['transitionState'];
  to: LoadingState['transitionState'];
  duration: number;
}

type LoadingAction = 
  | { type: 'START_INITIAL_LOAD' }
  | { type: 'START_LOAD_MORE' }
  | { type: 'LOAD_SUCCESS' }
  | { type: 'LOAD_ERROR'; payload: { message: string } }
  | { type: 'RESET' }
  | { type: 'TRANSITION_COMPLETE' };

const initialLoadingState: LoadingState = {
  isInitialLoad: false,
  isLoadingMore: false,
  hasError: false,
  errorMessage: undefined,
  transitionState: 'idle'
};

function loadingStateReducer(state: LoadingState, action: LoadingAction): LoadingState {
  switch (action.type) {
    case 'START_INITIAL_LOAD':
      return {
        ...state,
        isInitialLoad: true,
        isLoadingMore: false,
        hasError: false,
        errorMessage: undefined,
        transitionState: 'loading'
      };
    
    case 'START_LOAD_MORE':
      return {
        ...state,
        isInitialLoad: false,
        isLoadingMore: true,
        hasError: false,
        errorMessage: undefined,
        transitionState: 'loading'
      };
    
    case 'LOAD_SUCCESS':
      return {
        ...state,
        isInitialLoad: false,
        isLoadingMore: false,
        hasError: false,
        errorMessage: undefined,
        transitionState: 'success'
      };
    
    case 'LOAD_ERROR':
      return {
        ...state,
        isInitialLoad: false,
        isLoadingMore: false,
        hasError: true,
        errorMessage: action.payload.message,
        transitionState: 'error'
      };
    
    case 'RESET':
      return initialLoadingState;
    
    case 'TRANSITION_COMPLETE':
      return {
        ...state,
        transitionState: 'idle'
      };
    
    default:
      return state;
  }
}

export interface UseLoadingStateManagerReturn {
  loadingState: LoadingState;
  startInitialLoad: () => void;
  startLoadMore: () => void;
  markLoadSuccess: () => void;
  markLoadError: (message: string) => void;
  reset: () => void;
  isLoading: boolean;
  canLoadMore: boolean;
}

/**
 * Loading State Manager Hook
 * 
 * Manages loading states with smooth transitions and proper cleanup.
 * Prevents flickering by managing state transitions properly.
 */
export const useLoadingStateManager = (): UseLoadingStateManagerReturn => {
  const [loadingState, dispatch] = useReducer(loadingStateReducer, initialLoadingState);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear transition timeout on unmount
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  // Handle transition completion with delay to prevent flickering
  const completeTransition = useCallback(() => {
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    
    transitionTimeoutRef.current = setTimeout(() => {
      dispatch({ type: 'TRANSITION_COMPLETE' });
    }, 150); // Small delay to ensure smooth visual transition
  }, []);

  const startInitialLoad = useCallback(() => {
    dispatch({ type: 'START_INITIAL_LOAD' });
  }, []);

  const startLoadMore = useCallback(() => {
    dispatch({ type: 'START_LOAD_MORE' });
  }, []);

  const markLoadSuccess = useCallback(() => {
    dispatch({ type: 'LOAD_SUCCESS' });
    completeTransition();
  }, [completeTransition]);

  const markLoadError = useCallback((message: string) => {
    dispatch({ type: 'LOAD_ERROR', payload: { message } });
    completeTransition();
  }, [completeTransition]);

  const reset = useCallback(() => {
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    dispatch({ type: 'RESET' });
  }, []);

  // Computed values for easier consumption
  const isLoading = loadingState.isInitialLoad || loadingState.isLoadingMore;
  const canLoadMore = !isLoading && !loadingState.hasError;

  return {
    loadingState,
    startInitialLoad,
    startLoadMore,
    markLoadSuccess,
    markLoadError,
    reset,
    isLoading,
    canLoadMore
  };
};