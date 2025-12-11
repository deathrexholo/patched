import {
  doc,
  collection,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import { eventsDb as db } from '../../lib/firebase-events';
import { ParticipationType } from '../../types/models/event';

/**
 * Participation data structure
 */
export interface EventParticipation {
  userId: string;
  userName: string;
  userAvatar?: string;
  eventId: string;
  type: ParticipationType;
  timestamp: Date;
}

/**
 * Participation counts
 */
export interface ParticipationCounts {
  going: number;
  interested: number;
  maybe: number;
  total: number;
}

/**
 * Participation Service for Firebase
 * Handles user participation in events (Going/Interested/Maybe)
 */
class ParticipationService {
  private eventsCollection = 'events';
  private participationsCollection = 'participations';

  /**
   * Join or update participation for an event
   */
  async joinEvent(
    eventId: string,
    userId: string,
    userName: string,
    type: ParticipationType,
    userAvatar?: string
  ): Promise<EventParticipation> {
    try {
      // Create participation document
      const participationId = `${eventId}_${userId}`;
      const participationRef = doc(db, this.participationsCollection, participationId);

      const participation: EventParticipation = {
        userId,
        userName,
        userAvatar,
        eventId,
        type,
        timestamp: new Date()
      };

      // Save participation
      await setDoc(participationRef, {
        ...participation,
        timestamp: serverTimestamp()
      });

      // Update event participant arrays
      await this.updateEventParticipantArrays(eventId, userId, type);

      return participation;
    } catch (error) {
      console.error('Error joining event:', error);
      throw new Error('Failed to join event');
    }
  }

  /**
   * Leave an event (remove participation)
   */
  async leaveEvent(eventId: string, userId: string): Promise<void> {
    try {
      const participationId = `${eventId}_${userId}`;
      const participationRef = doc(db, this.participationsCollection, participationId);

      // Get current participation to know which array to remove from
      const participationSnap = await getDoc(participationRef);

      if (participationSnap.exists()) {
        const participation = participationSnap.data() as EventParticipation;

        // Remove from participation collection
        await deleteDoc(participationRef);

        // Remove from event arrays
        await this.removeFromEventArrays(eventId, userId, participation.type);
      }
    } catch (error) {
      console.error('Error leaving event:', error);
      throw new Error('Failed to leave event');
    }
  }

  /**
   * Get user's participation for an event
   */
  async getParticipation(eventId: string, userId: string): Promise<EventParticipation | null> {
    try {
      const participationId = `${eventId}_${userId}`;
      const participationRef = doc(db, this.participationsCollection, participationId);
      const participationSnap = await getDoc(participationRef);

      if (participationSnap.exists()) {
        const data = participationSnap.data();
        return {
          ...data,
          timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp)
        } as EventParticipation;
      }

      return null;
    } catch (error) {
      console.error('Error getting participation:', error);
      return null;
    }
  }

  /**
   * Check if user is participating in an event
   */
  async isParticipating(eventId: string, userId: string): Promise<boolean> {
    const participation = await this.getParticipation(eventId, userId);
    return participation !== null;
  }

  /**
   * Get all participants for an event
   */
  async getParticipants(eventId: string): Promise<EventParticipation[]> {
    try {
      const q = query(
        collection(db, this.participationsCollection),
        where('eventId', '==', eventId)
      );

      const querySnapshot = await getDocs(q);
      const participants: EventParticipation[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        participants.push({
          ...data,
          timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp)
        } as EventParticipation);
      });

      return participants;
    } catch (error) {
      console.error('Error getting participants:', error);
      return [];
    }
  }

  /**
   * Get participants by type (going, interested, maybe)
   */
  async getParticipantsByType(
    eventId: string,
    type: ParticipationType
  ): Promise<EventParticipation[]> {
    try {
      const q = query(
        collection(db, this.participationsCollection),
        where('eventId', '==', eventId),
        where('type', '==', type)
      );

      const querySnapshot = await getDocs(q);
      const participants: EventParticipation[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        participants.push({
          ...data,
          timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp)
        } as EventParticipation);
      });

      return participants;
    } catch (error) {
      console.error('Error getting participants by type:', error);
      return [];
    }
  }

  /**
   * Get participation counts for an event
   */
  async getParticipationCounts(eventId: string): Promise<ParticipationCounts> {
    try {
      const eventRef = doc(db, this.eventsCollection, eventId);
      const eventSnap = await getDoc(eventRef);

      if (eventSnap.exists()) {
        const data = eventSnap.data();
        const going = data.participantIds?.length || 0;
        const interested = data.interestedIds?.length || 0;
        const maybe = data.maybeIds?.length || 0;

        return {
          going,
          interested,
          maybe,
          total: going + interested + maybe
        };
      }

      return { going: 0, interested: 0, maybe: 0, total: 0 };
    } catch (error) {
      console.error('Error getting participation counts:', error);
      return { going: 0, interested: 0, maybe: 0, total: 0 };
    }
  }

  /**
   * Update event participant arrays
   * This updates the participantIds, interestedIds, and maybeIds arrays in the event document
   */
  private async updateEventParticipantArrays(
    eventId: string,
    userId: string,
    type: ParticipationType
  ): Promise<void> {
    try {
      const eventRef = doc(db, this.eventsCollection, eventId);

      // First, remove user from all arrays
      await this.removeFromAllArrays(eventId, userId);

      // Then add to the appropriate array based on type
      const updateData: any = {
        updatedAt: serverTimestamp()
      };

      switch (type) {
        case 'going':
          updateData.participantIds = arrayUnion(userId);
          updateData.participantCount = increment(1);
          break;
        case 'interested':
          updateData.interestedIds = arrayUnion(userId);
          break;
        case 'maybe':
          updateData.maybeIds = arrayUnion(userId);
          break;
      }

      await updateDoc(eventRef, updateData);
    } catch (error) {
      console.error('Error updating event participant arrays:', error);
    }
  }

  /**
   * Remove user from specific array in event
   */
  private async removeFromEventArrays(
    eventId: string,
    userId: string,
    type: ParticipationType
  ): Promise<void> {
    try {
      const eventRef = doc(db, this.eventsCollection, eventId);
      const updateData: any = {
        updatedAt: serverTimestamp()
      };

      switch (type) {
        case 'going':
          updateData.participantIds = arrayRemove(userId);
          updateData.participantCount = increment(-1);
          break;
        case 'interested':
          updateData.interestedIds = arrayRemove(userId);
          break;
        case 'maybe':
          updateData.maybeIds = arrayRemove(userId);
          break;
      }

      await updateDoc(eventRef, updateData);
    } catch (error) {
      console.error('Error removing from event arrays:', error);
    }
  }

  /**
   * Remove user from all participation arrays (helper for switching types)
   */
  private async removeFromAllArrays(eventId: string, userId: string): Promise<void> {
    try {
      const eventRef = doc(db, this.eventsCollection, eventId);

      await updateDoc(eventRef, {
        participantIds: arrayRemove(userId),
        interestedIds: arrayRemove(userId),
        maybeIds: arrayRemove(userId)
      });
    } catch (error) {
      console.error('Error removing from all arrays:', error);
    }
  }

  /**
   * Get all events a user is participating in
   */
  async getUserEvents(userId: string): Promise<EventParticipation[]> {
    try {
      const q = query(
        collection(db, this.participationsCollection),
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      const participations: EventParticipation[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        participations.push({
          ...data,
          timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp)
        } as EventParticipation);
      });

      return participations;
    } catch (error) {
      console.error('Error getting user events:', error);
      return [];
    }
  }

  /**
   * Check if event is at capacity
   */
  async isEventFull(eventId: string): Promise<boolean> {
    try {
      const eventRef = doc(db, this.eventsCollection, eventId);
      const eventSnap = await getDoc(eventRef);

      if (eventSnap.exists()) {
        const data = eventSnap.data();
        const maxParticipants = typeof data.maxParticipants === 'number'
          ? data.maxParticipants
          : parseInt(String(data.maxParticipants || '0'));

        if (!maxParticipants || maxParticipants === 0) {
          return false; // No limit
        }

        const participantCount = data.participantIds?.length || 0;
        return participantCount >= maxParticipants;
      }

      return false;
    } catch (error) {
      console.error('Error checking if event is full:', error);
      return false;
    }
  }
}

export const participationService = new ParticipationService();
export default participationService;
