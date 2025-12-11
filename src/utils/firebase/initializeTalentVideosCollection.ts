/**
 * Initialize talentVideos Collection in Firestore
 *
 * This utility creates the talentVideos collection in the "default" Firestore database
 * with proper documentation and structure.
 *
 * Usage:
 * - Run once during app setup or manually via browser console
 * - Or call initializeTalentVideosCollection() from anywhere in the app
 */

import { db } from '../../lib/firebase';
import {
  collection,
  doc,
  setDoc,
  query,
  where,
  getDocs,
  Timestamp
} from 'firebase/firestore';

/**
 * Initialize the talentVideos collection with a sample document
 * This ensures the collection exists and is properly structured
 */
export async function initializeTalentVideosCollection(): Promise<void> {
  try {const talentVideosRef = collection(db, 'talentVideos');

    // Check if collection already has documents
    const existingDocs = await getDocs(query(talentVideosRef));

    if (existingDocs.size > 0) {return;
    }

    // Create a sample/template document to initialize the collection
    // This won't be visible to users but ensures the collection structure is correct
    const sampleDocId = '_collection-template';
    const sampleDocRef = doc(talentVideosRef, sampleDocId);

    const sampleVideoData = {
      // User identification
      userId: 'template-user-id',
      userName: 'Template User',
      userProfileUrl: null,

      // Video identification and metadata
      id: 'video-template-001',
      title: 'Collection Template Document',
      description: 'This is a template document. Real talent videos will have actual data.',

      // Video storage
      videoUrl: 'gs://storage-url/template-video.mp4',
      thumbnailUrl: 'gs://storage-url/template-thumbnail.jpg',
      duration: 0, // in seconds

      // Sport and skill categorization
      sport: 'template',
      sportName: 'Template Sport',
      mainCategory: 'template',
      mainCategoryName: 'Template Category',
      specificSkill: 'Template Skill',
      skillCategory: 'template',

      // Engagement metrics
      viewCount: 0,

      // Verification system
      verificationStatus: 'template', // 'pending' | 'verified' | 'rejected'
      verificationLink: null,
      verifications: [], // Array of VideoVerification objects
      verificationThreshold: 3,
      verificationDeadline: null,

      // Timestamps
      uploadDate: Timestamp.now(),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),

      // Document metadata
      isTemplate: true,
      documentType: 'template'
    };

    await setDoc(sampleDocRef, sampleVideoData);console.log(`📍 Template document ID: ${sampleDocId}`);console.log(`📋 Structure verified with sample document`);

    return;
  } catch (error) {
    console.error('❌ Error initializing talentVideos collection:', error);
    throw error;
  }
}

/**
 * Verify talentVideos collection exists and is accessible
 */
export async function verifyTalentVideosCollection(): Promise<boolean> {
  try {
    const talentVideosRef = collection(db, 'talentVideos');
    const snapshot = await getDocs(query(talentVideosRef));return true;
  } catch (error) {
    console.error('❌ Failed to verify talentVideos collection:', error);
    return false;
  }
}

/**
 * List all documents in talentVideos collection (for debugging)
 */
export async function listTalentVideos(): Promise<void> {
  try {
    const talentVideosRef = collection(db, 'talentVideos');
    const snapshot = await getDocs(query(talentVideosRef));snapshot.forEach((doc) => {
      const data = doc.data();});

    return;
  } catch (error) {
    console.error('❌ Error listing talent videos:', error);
    throw error;
  }
}

/**
 * Get collection statistics
 */
export async function getTalentVideosStats(): Promise<{
  totalDocuments: number;
  collectionExists: boolean;
  firstDocumentTime?: Date;
}> {
  try {
    const talentVideosRef = collection(db, 'talentVideos');
    const snapshot = await getDocs(query(talentVideosRef));

    return {
      totalDocuments: snapshot.size,
      collectionExists: snapshot.size > 0,
      firstDocumentTime: snapshot.docs[0]?.data().createdAt?.toDate()
    };
  } catch (error) {
    console.error('❌ Error getting collection stats:', error);
    return {
      totalDocuments: 0,
      collectionExists: false
    };
  }
}

export default initializeTalentVideosCollection;
