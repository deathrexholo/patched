import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  where,
  writeBatch,
  Timestamp,
  getDoc

} from 'firebase/firestore';
import { eventsDb as db } from '../firebase/config-events';
import { WinnerEntry, LeaderboardEntry, Event, EventRequirements } from '../types/models/event';

// Re-export types for use in components
export type { Event, EventRequirements } from '../types/models/event';
export type { WinnerEntry, LeaderboardEntry } from '../types/models/event';

export interface EventSubmission {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  videoUrl: string;
  thumbnail?: string;
  title: string;
  description?: string;
  status: 'draft' | 'submitted';
  rank?: number;
  uploadedAt?: any;
  updatedAt?: any;
}

/**
 * Helper function to remove undefined values from objects
 * Firestore doesn't accept undefined - only null or omitted fields
 * For leaderboard entries, preserve optional fields as null instead of removing them
 */
const cleanObject = (obj: any, isLeaderboardEntry = false): any => {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj;
  if (obj instanceof Timestamp) return obj;
  if (Array.isArray(obj)) return obj.map(item => cleanObject(item, isLeaderboardEntry));
  if (typeof obj === 'object') {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = cleanObject(value, isLeaderboardEntry);
      } else if (isLeaderboardEntry && ['userAvatar', 'prize', 'score'].includes(key)) {
        // Keep optional fields as null instead of removing them
        // This ensures leaderboard entries maintain schema consistency
        acc[key] = null;
      }
      return acc;
    }, {} as any);
  }
  return obj;
};

class EventsService {
  private collectionName = 'events';

  // Create new event
  async createEvent(eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt' | 'participants'>): Promise<string> {
    try {
      // Filter out undefined values - Firestore doesn't allow undefined
      const cleanedData: any = {};
      Object.keys(eventData).forEach(key => {
        const value = (eventData as any)[key];
        if (value !== undefined) {
          cleanedData[key] = value;
        }
      });

      const docRef = await addDoc(collection(db, this.collectionName), {
        ...cleanedData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        participants: [],
        organizer: cleanedData.organizer || 'Admin',
        contactEmail: cleanedData.contactEmail || 'admin@amaplayer.com'
      });

      console.log('Event created successfully with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  // Get all events
  async getAllEvents(): Promise<Event[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const events: Event[] = [];
      
      querySnapshot.forEach((doc) => {
        events.push({ id: doc.id, ...doc.data() } as Event);
      });
      
      return events;
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  }

  // Get active events (for mobile app)
  async getActiveEvents(): Promise<Event[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('isActive', '==', true),
        orderBy('date', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      const events: Event[] = [];
      
      querySnapshot.forEach((doc) => {
        events.push({ id: doc.id, ...doc.data() } as Event);
      });
      
      return events;
    } catch (error) {
      console.error('Error fetching active events:', error);
      throw error;
    }
  }

  // Update event
  async updateEvent(eventId: string, updates: Partial<Event>): Promise<void> {
    try {
      const eventRef = doc(db, this.collectionName, eventId);

      // Filter out undefined values - Firestore doesn't allow undefined
      const cleanedUpdates: any = {};
      Object.keys(updates).forEach(key => {
        const value = (updates as any)[key];
        if (value !== undefined) {
          cleanedUpdates[key] = value;
        }
      });

      await updateDoc(eventRef, {
        ...cleanedUpdates,
        updatedAt: serverTimestamp()
      });

      console.log('Event updated successfully:', eventId);
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  // Delete event
  async deleteEvent(eventId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.collectionName, eventId));
      console.log('Event deleted successfully:', eventId);
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  // Toggle event active status
  async toggleEventStatus(eventId: string, isActive: boolean): Promise<void> {
    try {
      await this.updateEvent(eventId, { isActive });
      console.log(`Event ${eventId} ${isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error toggling event status:', error);
      throw error;
    }
  }

  // Bulk activate events
  async bulkActivateEvents(eventIds: string[], reason?: string): Promise<{ processedCount: number; failedCount: number; errors: Array<{ eventId: string; error: string }> }> {
    const result = {
      processedCount: 0,
      failedCount: 0,
      errors: [] as Array<{ eventId: string; error: string }>
    };

    for (const eventId of eventIds) {
      try {
        await this.toggleEventStatus(eventId, true);
        result.processedCount++;
      } catch (error) {
        result.failedCount++;
        result.errors.push({
          eventId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return result;
  }

  // Bulk deactivate events
  async bulkDeactivateEvents(eventIds: string[], reason?: string): Promise<{ processedCount: number; failedCount: number; errors: Array<{ eventId: string; error: string }> }> {
    const result = {
      processedCount: 0,
      failedCount: 0,
      errors: [] as Array<{ eventId: string; error: string }>
    };

    for (const eventId of eventIds) {
      try {
        await this.toggleEventStatus(eventId, false);
        result.processedCount++;
      } catch (error) {
        result.failedCount++;
        result.errors.push({
          eventId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return result;
  }

  // Get all submissions for an event
  async getEventSubmissions(eventId: string): Promise<EventSubmission[]> {
    try {
      const q = query(
        collection(db, 'eventSubmissions'),
        where('eventId', '==', eventId),
        orderBy('uploadedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const submissions: EventSubmission[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        submissions.push({
          id: doc.id,
          ...data,
          uploadedAt: data.uploadedAt?.toDate?.() || data.uploadedAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
        } as EventSubmission);
      });

      console.log(`📸 Fetched ${submissions.length} submissions for event ${eventId}`);
      return submissions;
    } catch (error) {
      console.error('Error fetching event submissions:', error);
      return [];
    }
  }

  // Get event with submissions
  async getEventWithSubmissions(eventId: string): Promise<{ event: Event | null; submissions: EventSubmission[] }> {
    try {
      const eventRef = doc(db, this.collectionName, eventId);
      const eventSnap = await getDoc(eventRef);

      let event: Event | null = null;
      if (eventSnap.exists()) {
        event = { id: eventSnap.id, ...eventSnap.data() } as Event;
      }

      const submissions = await this.getEventSubmissions(eventId);

      return { event, submissions };
    } catch (error) {
      console.error('Error fetching event with submissions:', error);
      return { event: null, submissions: [] };
    }
  }

  // Declare winners for an event
  async declareWinners(
    eventId: string,
    winners: WinnerEntry[],
    adminId: string
  ): Promise<Event | null> {
    try {
      console.log(`🏆 Declaring winners for event ${eventId}...`);

      // Get the event
      const eventRef = doc(db, this.collectionName, eventId);
      const eventSnap = await getDoc(eventRef);

      if (!eventSnap.exists()) {
        console.error(`Event ${eventId} not found`);
        throw new Error('Event not found');
      }

      const event = { id: eventSnap.id, ...eventSnap.data() } as Event;

      // Fetch submission details for each winner
      const leaderboard: LeaderboardEntry[] = [];

      for (const winner of winners) {
        try {
          const submissionRef = doc(db, 'eventSubmissions', winner.submissionId);
          const submissionSnap = await getDoc(submissionRef);

          if (submissionSnap.exists()) {
            const submission = { id: submissionSnap.id, ...submissionSnap.data() } as EventSubmission;
            leaderboard.push({
              rank: winner.rank as 1 | 2 | 3 | 4 | 5,
              userId: winner.userId,
              userName: submission.userName,
              userAvatar: submission.userAvatar,
              submissionId: winner.submissionId,
              score: 0
            });
          }
        } catch (error) {
          console.error(`Error fetching submission ${winner.submissionId}:`, error);
        }
      }

      // Create batch write for atomicity
      const batch = writeBatch(db);

      // Clean undefined values from leaderboard before saving
      // Pass true to preserve optional fields like userAvatar as null
      const cleanedLeaderboard = cleanObject(leaderboard, true);

      // Update event with leaderboard
      batch.update(eventRef, {
        leaderboard: cleanedLeaderboard,
        eventState: 'results_declared',
        winnersAnnouncedAt: Timestamp.now(),
        announcedBy: adminId,
        updatedAt: serverTimestamp()
      });

      // Update each winner submission with rank
      for (const winner of winners) {
        const submissionRef = doc(db, 'eventSubmissions', winner.submissionId);
        batch.update(submissionRef, {
          rank: winner.rank
        });
      }

      // Commit batch
      await batch.commit();

      console.log(`✅ Winners declared successfully for event ${eventId}:`, {
        winnerCount: cleanedLeaderboard.length,
        declaredBy: adminId
      });

      // Return updated event with all required properties
      const updatedEvent: Event = {
        ...event,
        leaderboard: cleanedLeaderboard,
        eventState: 'results_declared',
        winnersAnnouncedAt: new Date(),
        announcedBy: adminId
      };
      return updatedEvent;
    } catch (error) {
      console.error('Error declaring winners:', error);
      throw error;
    }
  }
}

export const eventsService = new EventsService();