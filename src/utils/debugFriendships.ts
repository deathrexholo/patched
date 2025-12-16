import { collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const debugFriendshipsCollection = async () => {
  console.log('🐞 DEBUG: Inspecting "friendships" collection...');
  try {
    const q = query(collection(db, 'friendships'), limit(5));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('🐞 DEBUG: "friendships" collection is EMPTY.');
      return;
    }

    console.log(`🐞 DEBUG: Found ${snapshot.size} documents in "friendships":`);
    snapshot.forEach(doc => {
      console.log(`📄 Doc ID: ${doc.id}`, doc.data());
    });
  } catch (error) {
    console.error('🐞 DEBUG: Error fetching friendships:', error);
  }
};
