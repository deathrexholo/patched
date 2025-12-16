import { db } from '../lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { Announcement, CreateAnnouncementData, AnnouncementStats } from '../types/models/announcement';

/**
 * Announcement Service
 * Handles all CRUD operations for admin-created announcements
 */
class AnnouncementService {
  private collectionName = 'announcements';

  /**
   * Create a new announcement
   * @param data Announcement data (title, message, expiresAt)
   * @param adminId Admin UID creating the announcement
   * @param adminName Admin display name
   * @returns Promise<string> - ID of created announcement
   */
  async createAnnouncement(
    data: CreateAnnouncementData,
    adminId: string,
    adminName: string
  ): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        title: data.title.trim(),
        message: data.message.trim(),
        expiresAt: Timestamp.fromDate(data.expiresAt),
        createdAt: Timestamp.now(),
        createdBy: adminId,
        createdByName: adminName,
        isActive: true,
        priority: data.priority || 'normal',
        ...(data.actionUrl && { actionUrl: data.actionUrl.trim() })
      });

      console.log('✅ Announcement created:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating announcement:', error);
      throw new Error('Failed to create announcement');
    }
  }

  /**
   * Get all announcements (including expired and inactive)
   * For admin view only
   * @returns Promise<Announcement[]>
   */
  async getAllAnnouncements(): Promise<Announcement[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const announcements = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Announcement[];

      console.log(`📢 Fetched ${announcements.length} announcements`);
      return announcements;
    } catch (error) {
      console.error('❌ Error fetching announcements:', error);
      throw new Error('Failed to fetch announcements');
    }
  }

  /**
   * Get active, non-expired announcements
   * For preview/testing purposes
   * @returns Promise<Announcement[]>
   */
  async getActiveAnnouncements(): Promise<Announcement[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('isActive', '==', true),
        where('expiresAt', '>', Timestamp.now()),
        orderBy('expiresAt', 'asc'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const announcements = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Announcement[];

      console.log(`📢 Fetched ${announcements.length} active announcements`);
      return announcements;
    } catch (error) {
      console.error('❌ Error fetching active announcements:', error);
      throw new Error('Failed to fetch active announcements');
    }
  }

  /**
   * Update an existing announcement
   * @param announcementId ID of announcement to update
   * @param updates Partial<Announcement> - fields to update
   */
  async updateAnnouncement(
    announcementId: string,
    updates: Partial<Announcement>
  ): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, announcementId);

      // Convert Date to Timestamp if expiresAt is being updated
      const updateData = { ...updates };
      if (updateData.expiresAt && updateData.expiresAt instanceof Date) {
        updateData.expiresAt = Timestamp.fromDate(updateData.expiresAt as Date);
      }

      // Trim string fields
      if (updateData.title) {
        updateData.title = updateData.title.trim();
      }
      if (updateData.message) {
        updateData.message = updateData.message.trim();
      }
      if (updateData.actionUrl) {
        updateData.actionUrl = updateData.actionUrl.trim();
      }

      await updateDoc(docRef, updateData);
      console.log('✅ Announcement updated:', announcementId);
    } catch (error) {
      console.error('❌ Error updating announcement:', error);
      throw new Error('Failed to update announcement');
    }
  }

  /**
   * Delete a single announcement
   * @param announcementId ID of announcement to delete
   */
  async deleteAnnouncement(announcementId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.collectionName, announcementId));
      console.log('✅ Announcement deleted:', announcementId);
    } catch (error) {
      console.error('❌ Error deleting announcement:', error);
      throw new Error('Failed to delete announcement');
    }
  }

  /**
   * Bulk delete all expired announcements
   * @returns Promise<number> - Number of deleted announcements
   */
  async bulkDeleteExpired(): Promise<number> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('expiresAt', '<=', Timestamp.now())
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        console.log('No expired announcements to delete');
        return 0;
      }

      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`✅ Deleted ${snapshot.size} expired announcements`);
      return snapshot.size;
    } catch (error) {
      console.error('❌ Error bulk deleting expired announcements:', error);
      throw new Error('Failed to bulk delete expired announcements');
    }
  }

  /**
   * Toggle active status of an announcement
   * @param announcementId ID of announcement
   * @param isActive New active status
   */
  async toggleActive(announcementId: string, isActive: boolean): Promise<void> {
    try {
      await this.updateAnnouncement(announcementId, { isActive });
      console.log(`✅ Announcement ${announcementId} set to ${isActive ? 'active' : 'inactive'}`);
    } catch (error) {
      console.error('❌ Error toggling announcement status:', error);
      throw new Error('Failed to toggle announcement status');
    }
  }

  /**
   * Get announcement statistics
   * @returns Promise<AnnouncementStats>
   */
  async getStats(): Promise<AnnouncementStats> {
    try {
      const allAnnouncements = await this.getAllAnnouncements();
      const now = Timestamp.now();
      const oneDayFromNow = Timestamp.fromMillis(now.toMillis() + 24 * 60 * 60 * 1000);

      const stats: AnnouncementStats = {
        total: allAnnouncements.length,
        active: 0,
        expired: 0,
        expiringSoon: 0
      };

      allAnnouncements.forEach(announcement => {
        const expiresAt = announcement.expiresAt as Timestamp;

        if (announcement.isActive && expiresAt.toMillis() > now.toMillis()) {
          stats.active++;

          // Check if expiring within 24 hours
          if (expiresAt.toMillis() <= oneDayFromNow.toMillis()) {
            stats.expiringSoon++;
          }
        } else if (expiresAt.toMillis() <= now.toMillis()) {
          stats.expired++;
        }
      });

      return stats;
    } catch (error) {
      console.error('❌ Error calculating announcement stats:', error);
      throw new Error('Failed to calculate announcement stats');
    }
  }
}

// Export singleton instance
export const announcementService = new AnnouncementService();
export default announcementService;
