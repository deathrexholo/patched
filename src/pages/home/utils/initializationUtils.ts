import { User } from 'firebase/auth';
import { cleanupCorruptedPostComments } from '../../../utils/data/cleanupPosts';

export const initializeHomeFeatures = async (
  currentUser: User | null,
  isGuest: () => boolean,
  trackPageView: (path: string, data: any) => void,
  trackAnalytics: (event: string, data: any) => void,
  setPrefetchUser: ((user: User) => void) | null,
  loadPosts: () => Promise<void>,
  performHealthCheck: (() => Promise<void>) | null
): Promise<() => void> => {
  // Track page view for analytics
  trackPageView('/home', {
    userId: currentUser?.uid,
    isGuest: isGuest(),
    timestamp: Date.now()
  });

  // Set user for predictive prefetching (if available)
  if (currentUser && setPrefetchUser) {
    setPrefetchUser(currentUser);
  }

  // Initialize posts with cleanup
  try {
    await cleanupCorruptedPostComments();
    await loadPosts();
    trackAnalytics('SYSTEM_INITIALIZED', {
      userId: currentUser?.uid,
      componentsLoaded: ['posts', 'cleanup'],
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Initialization error:', error);
    trackAnalytics('ERROR_OCCURRED', {
      error: 'initialization_failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      userId: currentUser?.uid
    });
  }

  // Set up periodic cache health check (if available)
  if (performHealthCheck) {
    const cacheHealthInterval = setInterval(async () => {
      try {
        await performHealthCheck();
      } catch (error) {
        console.warn('Cache health check failed:', error);
      }
    }, 10 * 60 * 1000);

    return () => clearInterval(cacheHealthInterval);
  }

  // ✅ CRITICAL FIX: Always return a cleanup function
  return () => {
    // No cleanup needed when performHealthCheck is not available
  };
};
