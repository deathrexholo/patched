// Events service for main app - connects to Firebase events-db database
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { eventsDb as db } from '../../lib/firebase-events';
import { Event, EventStatus, CompetitionStatus, LeaderboardEntry, WinnerEntry } from '../../types/models/event';
import { EventSubmission } from '../../types/models/submission';

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

/**
 * Events service providing business logic for event operations
 */
class EventsService {
  private collectionName: string;

  constructor() {
    this.collectionName = 'events';
  }

  /**
   * Get all active events for the main app
   */
  async getActiveEvents(): Promise<Event[]> {
    try {const q = query(
        collection(db, this.collectionName),
        where('isActive', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      const events: Event[] = [];
      
      querySnapshot.forEach((doc) => {
        const eventData = doc.data();
        events.push({
          id: doc.id,
          ...eventData,
          // Convert Firebase timestamps to JavaScript Date objects
          date: eventData.date,
          createdAt: eventData.createdAt?.toDate?.() || eventData.createdAt,
          updatedAt: eventData.updatedAt?.toDate?.() || eventData.updatedAt
        } as Event);
      });return events;
    } catch (error) {
      console.error('Error fetching active events:', error);
      return [];
    }
  }

  /**
   * Get all events (for comprehensive display)
   */
  async getAllEvents(): Promise<Event[]> {
    try {const startTime = performance.now();

      const q = query(
        collection(db, this.collectionName),
        where('isActive', '==', true)
      );

      const querySnapshot = await getDocs(q);
      const events: Event[] = [];

      querySnapshot.forEach((doc) => {
        const eventData = doc.data();
        events.push({
          id: doc.id,
          ...eventData,
          // Convert Firebase timestamps
          date: eventData.date,
          createdAt: eventData.createdAt?.toDate?.() || eventData.createdAt,
          updatedAt: eventData.updatedAt?.toDate?.() || eventData.updatedAt
        } as Event);
      });

      // Sort by date (newest first for admin-created events)
      events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const endTime = performance.now();return events;
    } catch (error) {
      console.error('Error fetching all events:', error);
      return [];
    }
  }

  /**
   * Convert admin event format to app event format
   */
  formatEventForApp(adminEvent: Event): Event {
    return {
      id: adminEvent.id,
      title: adminEvent.title,
      date: adminEvent.date,
      location: adminEvent.location,
      category: adminEvent.category || 'Event',
      description: adminEvent.description || 'No description available',
      image: adminEvent.imageUrl || 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=200&fit=crop',
      imageUrl: adminEvent.imageUrl,
      status: this.getEventStatus(adminEvent),
      participants: `${adminEvent.maxParticipants || 'Unlimited'} participants`,
      maxParticipants: adminEvent.maxParticipants,
      priority: 'medium',
      registrationUrl: adminEvent.registrationUrl,
      organizer: adminEvent.organizer || 'AmaPlayer',
      contactEmail: adminEvent.contactEmail,
      contactPhone: adminEvent.contactPhone,
      requirements: adminEvent.requirements || [],
      prizes: adminEvent.prizes || [],
      tags: adminEvent.tags || [],
      isActive: adminEvent.isActive,
      startTime: adminEvent.startTime,
      duration: adminEvent.duration,
      createdAt: adminEvent.createdAt,
      updatedAt: adminEvent.updatedAt
    };
  }

  /**
   * Determine event status based on date, time, and duration
   */
  getEventStatus(event: Event): EventStatus {
    const now = new Date();
    const eventDate = new Date(event.date);
    const todayDate = new Date();
    
    // Check if event is on the same date (ignoring time)
    const isSameDay = eventDate.toDateString() === todayDate.toDateString();
    
    // If event has start time, use it; otherwise default to 00:00
    const eventStartDate = new Date(event.date);
    if (event.startTime) {
      const [hours, minutes] = event.startTime.split(':').map(Number);
      eventStartDate.setHours(hours, minutes, 0, 0);
    }
    
    // Calculate event end time
    let eventEndDate = new Date(eventStartDate);
    if (event.duration) {
      // Duration in hours (e.g., 2.5 for 2 hours 30 minutes)
      eventEndDate.setHours(eventEndDate.getHours() + Math.floor(event.duration));
      eventEndDate.setMinutes(eventEndDate.getMinutes() + ((event.duration % 1) * 60));
    } else {
      // Default duration of 8 hours for same-day events, 2 hours for others
      const defaultDuration = isSameDay ? 8 : 2;
      eventEndDate.setHours(eventEndDate.getHours() + defaultDuration);
    }
    
    // Determine status with preference for live on same day
    if (eventDate > todayDate) {
      return 'upcoming';
    } else if (isSameDay) {
      // If it's the same day, show as live unless duration has clearly ended
      if (now > eventEndDate) {
        return 'completed';
      } else {
        return 'live';
      }
    } else if (now >= eventStartDate && now <= eventEndDate) {
      return 'live';
    } else {
      return 'completed';
    }
  }

  /**
   * Get detailed competition status for display
   */
  getCompetitionStatus(event: Event): CompetitionStatus {
    const status = this.getEventStatus(event);
    const now = new Date();
    const eventDate = new Date(event.date);
    const isSameDay = eventDate.toDateString() === now.toDateString();
    
    switch (status) {
      case 'upcoming':
        return {
          status: 'upcoming',
          displayText: 'Competition Opens Soon',
          statusClass: 'status-upcoming'
        };
      case 'live':
        if (isSameDay) {
          return {
            status: 'live',
            displayText: 'Competition Ongoing',
            statusClass: 'status-live'
          };
        } else {
          return {
            status: 'live',
            displayText: 'Competition Ongoing',
            statusClass: 'status-live'
          };
        }
      case 'completed':
      default:
        return {
          status: 'completed',
          displayText: 'Competition Ended',
          statusClass: 'status-completed'
        };
    }
  }

  /**
   * Get events by status (upcoming, live, completed)
   */
  async getEventsByStatus(status: EventStatus): Promise<Event[]> {
    try {
      const allEvents = await this.getAllEvents();
      const formattedEvents = allEvents.map(event => this.formatEventForApp(event));
      
      return formattedEvents.filter(event => event.status === status);
    } catch (error) {
      console.error(`Error fetching ${status} events:`, error);
      return [];
    }
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(): Promise<Event[]> {
    return this.getEventsByStatus('upcoming');
  }

  /**
   * Get live events
   */
  async getLiveEvents(): Promise<Event[]> {
    return this.getEventsByStatus('live');
  }

  /**
   * Get completed events
   */
  async getCompletedEvents(): Promise<Event[]> {
    return this.getEventsByStatus('completed');
  }

  /**
   * Declare winners for an event with admin authorization
   * @param eventId - The event ID
   * @param winners - Array of winner entries with submissionId, userId, and rank
   * @param currentUserId - The admin user ID declaring winners
   * @returns Updated event with leaderboard
   * @throws Error if operation fails
   */
  async declareWinners(
    eventId: string,
    winners: WinnerEntry[],
    currentUserId: string
  ): Promise<Event> {
    try {// Validate inputs
      if (!eventId || !Array.isArray(winners) || winners.length === 0) {
        throw new Error('Invalid event ID or empty winners array');
      }

      if (winners.length > 5) {
        throw new Error('Maximum 5 winners allowed');
      }

      // Validate winner entries
      const winnerIds = new Set<string>();
      const winnerRanks = new Set<number>();

      for (const winner of winners) {
        if (!winner.submissionId || !winner.userId) {
          throw new Error('All winners must have valid submissionId and userId');
        }

        if (typeof winner.rank !== 'number' || winner.rank < 1 || winner.rank > 5) {
          throw new Error(`Invalid rank ${winner.rank}. Must be between 1 and 5`);
        }

        if (winnerIds.has(winner.submissionId)) {
          throw new Error(
            `Duplicate submission: ${winner.submissionId} cannot be a winner multiple times`
          );
        }

        if (winnerRanks.has(winner.rank)) {
          throw new Error(`Duplicate rank: ${winner.rank} assigned to multiple winners`);
        }

        winnerIds.add(winner.submissionId);
        winnerRanks.add(winner.rank);
      }

      // Get the event with timeout
      const eventRef = doc(db, this.collectionName, eventId);

      let eventSnap;
      try {
        const getDocPromise = getDoc(eventRef);
        eventSnap = await Promise.race([
          getDocPromise,
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Fetching event timed out (30s)')),
              30000
            )
          )
        ]) as any;
      } catch (timeoutError) {
        throw new Error(
          `Failed to fetch event: ${(timeoutError as Error).message}`
        );
      }

      if (!eventSnap.exists()) {
        throw new Error(`Event ${eventId} not found`);
      }

      const event = { id: eventSnap.id, ...eventSnap.data() } as Event;

      // Fetch submission details for each winner with error tracking
      const leaderboard: LeaderboardEntry[] = [];
      const failedSubmissions: string[] = [];

      for (const winner of winners) {
        try {
          const submissionRef = doc(db, 'eventSubmissions', winner.submissionId);

          let submissionSnap;
          try {
            const getDocPromise = getDoc(submissionRef);
            submissionSnap = await Promise.race([
              getDocPromise,
              new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error('Fetching submission timed out (15s)')),
                  15000
                )
              )
            ]) as any;
          } catch (timeoutError) {
            failedSubmissions.push(
              `${winner.submissionId}: ${(timeoutError as Error).message}`
            );
            continue;
          }

          if (submissionSnap.exists()) {
            const submission = {
              id: submissionSnap.id,
              ...submissionSnap.data()
            } as EventSubmission;

            // Calculate combined score from quality metrics if available
            const submissionScores = submission.scores;
            const combinedScore = submissionScores
              ? Math.round(
                  ((submissionScores.quality || 0) +
                    (submissionScores.time || 0) +
                    (submissionScores.difficulty || 0)) /
                    3
                )
              : 0;

            leaderboard.push({
              rank: winner.rank as 1 | 2 | 3 | 4 | 5,
              userId: winner.userId,
              userName: submission.userName || 'Unknown',
              userAvatar: submission.userAvatar || null,
              submissionId: winner.submissionId,
              score: combinedScore
            });
          } else {
            failedSubmissions.push(`${winner.submissionId}: Submission not found`);
          }
        } catch (error) {
          console.error(`Error fetching submission ${winner.submissionId}:`, error);
          failedSubmissions.push(
            `${winner.submissionId}: ${(error as Error).message}`
          );
        }
      }

      // Require at least some submissions to be found
      if (leaderboard.length === 0) {
        throw new Error(
          `No valid submissions found for any winners: ${failedSubmissions.join('; ')}`
        );
      }

      // Warn if some submissions failed
      if (failedSubmissions.length > 0) {
        console.warn(
          `⚠️ ${failedSubmissions.length} submissions failed to load: ${failedSubmissions.join('; ')}`
        );
      }

      // Create batch write for atomicity
      const batch = writeBatch(db);

      // Clean undefined values from leaderboard before saving
      const cleanedLeaderboard = cleanObject(leaderboard, true);

      // Update event with leaderboard
      batch.update(eventRef, {
        leaderboard: cleanedLeaderboard,
        eventState: 'results_declared',
        winnersAnnouncedAt: Timestamp.now(),
        announcedBy: currentUserId
      });

      // Update each winner submission with rank
      for (const winner of winners) {
        const submissionRef = doc(db, 'eventSubmissions', winner.submissionId);
        batch.update(submissionRef, {
          rank: winner.rank
        });
      }

      // Commit batch with timeout
      let batchCommitPromise;
      try {
        batchCommitPromise = batch.commit();
        await Promise.race([
          batchCommitPromise,
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Batch commit timed out (30s). Winners may not have been saved.')),
              30000
            )
          )
        ]);
      } catch (commitError) {
        throw new Error(
          `Failed to save winners: ${(commitError as Error).message}`
        );
      }// Return updated event
      return {
        ...event,
        leaderboard: cleanedLeaderboard,
        eventState: 'results_declared',
        winnersAnnouncedAt: new Date(),
        announcedBy: currentUserId
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown error declaring winners';

      console.error('❌ Error declaring winners:', errorMessage);
      throw new Error(`Failed to declare winners: ${errorMessage}`);
    }
  }

  /**
   * Update the leaderboard for an event (reranking, adding/removing winners)
   * @param eventId - The event ID
   * @param leaderboard - Updated leaderboard entries
   * @param currentUserId - The admin user ID making the update
   * @returns Updated event
   */
  async updateLeaderboard(
    eventId: string,
    leaderboard: LeaderboardEntry[],
    currentUserId: string
  ): Promise<Event | null> {
    try {const eventRef = doc(db, this.collectionName, eventId);
      const eventSnap = await getDoc(eventRef);

      if (!eventSnap.exists()) {
        console.error(`Event ${eventId} not found`);
        return null;
      }

      const event = { id: eventSnap.id, ...eventSnap.data() } as Event;

      // Create batch write
      const batch = writeBatch(db);

      // Clean undefined values from leaderboard before saving
      // Pass true to preserve optional fields like userAvatar as null
      const cleanedLeaderboard = cleanObject(leaderboard, true);

      // Update event leaderboard
      batch.update(eventRef, {
        leaderboard: cleanedLeaderboard,
        updatedAt: Timestamp.now()
      });

      // Update submission ranks using cleaned leaderboard
      for (const entry of cleanedLeaderboard) {
        const submissionRef = doc(db, 'eventSubmissions', entry.submissionId);
        batch.update(submissionRef, {
          rank: entry.rank
        });
      }

      await batch.commit();return {
        ...event,
        leaderboard: cleanedLeaderboard,
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error updating leaderboard:', error);
      return null;
    }
  }

  /**
   * Get event with full leaderboard details
   * @param eventId - The event ID
   * @returns Event with populated leaderboard
   */
  async getEventWithLeaderboard(eventId: string): Promise<Event | null> {
    try {const eventRef = doc(db, this.collectionName, eventId);
      const eventSnap = await getDoc(eventRef);

      if (!eventSnap.exists()) {
        console.error(`Event ${eventId} not found`);
        return null;
      }

      const eventData = eventSnap.data();
      const event: Event = {
        id: eventSnap.id,
        ...eventData,
        createdAt: eventData.createdAt?.toDate?.() || eventData.createdAt,
        updatedAt: eventData.updatedAt?.toDate?.() || eventData.updatedAt,
        winnersAnnouncedAt: eventData.winnersAnnouncedAt?.toDate?.() || eventData.winnersAnnouncedAt
      } as Event;return event;
    } catch (error) {
      console.error('Error fetching event with leaderboard:', error);
      return null;
    }
  }

  /**
   * Check if user can declare winners for an event
   * Currently only admins can declare winners
   * @param userId - The user ID to check
   * @param adminIds - Array of admin user IDs (from event or app config)
   * @returns Whether user is authorized to declare winners
   */
  canDeclareWinners(userId: string, adminIds?: string[]): boolean {
    // If adminIds is provided, check if user is in the admin list
    if (adminIds && Array.isArray(adminIds)) {
      return adminIds.includes(userId);
    }

    // TODO: Implement more robust admin check
    // This could check:
    // 1. Firebase custom claims
    // 2. User document admin field
    // 3. App-level admin list from config
    // For now, return false if no admin list provided
    return false;
  }
}

export const eventsService = new EventsService();
export default eventsService;
