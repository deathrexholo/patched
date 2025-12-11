// Cleanup utility to remove corrupted notification data
import { db } from '../../lib/firebase';
import { collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';

export const cleanupCorruptedNotifications = async (userId) => {
  try {// Query all notifications for the user
    const notificationsRef = collection(db, 'notifications');
    const q = query(notificationsRef, where('receiverId', '==', userId));
    const snapshot = await getDocs(q);
    
    let deletedCount = 0;
    let checkedCount = 0;
    
    for (const docSnapshot of snapshot.docs) {
      checkedCount++;
      const data = docSnapshot.data();
      
      // Check if any field contains objects (corrupted data)
      const hasObjects = Object.values(data).some(value => 
        typeof value === 'object' && value !== null && 
        !value.toDate && // Not a Firestore timestamp
        !Array.isArray(value) && // Not an array
        typeof value.seconds === 'undefined' // Not a timestamp object
      );
      
      if (hasObjects) {await deleteDoc(doc(db, 'notifications', docSnapshot.id));
        deletedCount++;
      }
    }return { checked: checkedCount, deleted: deletedCount };
    
  } catch (error) {
    console.error('❌ Error during notification cleanup:', error);
    throw error;
  }
};

// Cleanup all notifications globally (admin function)
export const cleanupAllCorruptedNotifications = async () => {
  try {const notificationsRef = collection(db, 'notifications');
    const snapshot = await getDocs(notificationsRef);
    
    let deletedCount = 0;
    let checkedCount = 0;
    
    for (const docSnapshot of snapshot.docs) {
      checkedCount++;
      const data = docSnapshot.data();
      
      // Check if any field contains objects (corrupted data)
      const hasObjects = Object.values(data).some(value => 
        typeof value === 'object' && value !== null && 
        !value.toDate && // Not a Firestore timestamp
        !Array.isArray(value) && // Not an array
        typeof value.seconds === 'undefined' // Not a timestamp object
      );
      
      if (hasObjects) {await deleteDoc(doc(db, 'notifications', docSnapshot.id));
        deletedCount++;
      }
    }return { checked: checkedCount, deleted: deletedCount };
    
  } catch (error) {
    console.error('❌ Error during global notification cleanup:', error);
    throw error;
  }
};