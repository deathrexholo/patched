/**
 * Hook to initialize talentVideos collection on app startup
 *
 * This hook ensures the talentVideos collection exists in Firebase Firestore
 * and is properly structured for the talent video feature.
 */

import { useEffect } from 'react';
import { initializeTalentVideosCollection, verifyTalentVideosCollection } from '../utils/firebase/initializeTalentVideosCollection';

export const useInitializeTalentVideosCollection = () => {
  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize the collection
        await initializeTalentVideosCollection();

        // Verify it was created successfully
        const isVerified = await verifyTalentVideosCollection();

        if (isVerified) {} else {
          console.warn('⚠️ talentVideos collection verification failed');
        }
      } catch (error) {
        console.error('❌ Failed to initialize talentVideos collection:', error);
      }
    };

    initialize();
  }, []);
};

export default useInitializeTalentVideosCollection;
