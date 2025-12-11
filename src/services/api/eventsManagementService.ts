import { doc, updateDoc, getDoc, writeBatch, collection, query, where, getDocs } from 'firebase/firestore';
import { eventsDb as db } from '../../lib/firebase-events';
import { Event } from '@/types/models';

export interface EventManagementResult {
  success: boolean;
  message: string;
  updatedEvent?: Partial<Event>;
}

export interface BulkEventManagementResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: Array<{ eventId: string; error: string; }>;
}

/**
 * Enhanced events management service with bulk operations support
 */
class EventsManagementService {
  private readonly COLLECTION_NAME = 'events';

  /**
   * Activate a single event
   */
  async activateEvent(eventId: string, reason?: string): Promise<EventManagementResult> {
    try {
      const eventRef = doc(db, this.COLLECTION_NAME, eventId);
      const eventDoc = await getDoc(eventRef);
      
      if (!eventDoc.exists()) {
        return {
          success: false,
          message: 'Event not found'
        };
      }

      const updateData = {
        isActive: true,
        status: 'active',
        activatedAt: new Date().toISOString(),
        activationReason: reason || 'Administrative activation',
        updatedAt: new Date().toISOString()
      };

      await updateDoc(eventRef, updateData);return {
        success: true,
        message: 'Event activated successfully',
        updatedEvent: { id: eventId, ...updateData } as Partial<Event>
      };
    } catch (error) {
      console.error('Error activating event:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to activate event'
      };
    }
  }

  /**
   * Deactivate a single event
   */
  async deactivateEvent(eventId: string, reason?: string): Promise<EventManagementResult> {
    try {
      const eventRef = doc(db, this.COLLECTION_NAME, eventId);
      const eventDoc = await getDoc(eventRef);
      
      if (!eventDoc.exists()) {
        return {
          success: false,
          message: 'Event not found'
        };
      }

      const updateData = {
        isActive: false,
        status: 'inactive',
        deactivatedAt: new Date().toISOString(),
        deactivationReason: reason || 'Administrative deactivation',
        updatedAt: new Date().toISOString()
      };

      await updateDoc(eventRef, updateData);return {
        success: true,
        message: 'Event deactivated successfully',
        updatedEvent: { id: eventId, ...updateData } as Partial<Event>
      };
    } catch (error) {
      console.error('Error deactivating event:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to deactivate event'
      };
    }
  }

  /**
   * Cancel a single event
   */
  async cancelEvent(eventId: string, reason?: string): Promise<EventManagementResult> {
    try {
      const eventRef = doc(db, this.COLLECTION_NAME, eventId);
      const eventDoc = await getDoc(eventRef);
      
      if (!eventDoc.exists()) {
        return {
          success: false,
          message: 'Event not found'
        };
      }

      const updateData = {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancellationReason: reason || 'Administrative cancellation',
        isActive: false,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(eventRef, updateData);return {
        success: true,
        message: 'Event cancelled successfully',
        updatedEvent: { id: eventId, ...updateData } as Partial<Event>
      };
    } catch (error) {
      console.error('Error cancelling event:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to cancel event'
      };
    }
  }

  /**
   * Bulk activate events
   */
  async bulkActivateEvents(eventIds: string[], reason?: string): Promise<BulkEventManagementResult> {
    return this.executeBulkEventOperation(eventIds, 'activate', reason);
  }

  /**
   * Bulk deactivate events
   */
  async bulkDeactivateEvents(eventIds: string[], reason?: string): Promise<BulkEventManagementResult> {
    return this.executeBulkEventOperation(eventIds, 'deactivate', reason);
  }

  /**
   * Bulk cancel events
   */
  async bulkCancelEvents(eventIds: string[], reason?: string): Promise<BulkEventManagementResult> {
    return this.executeBulkEventOperation(eventIds, 'cancel', reason);
  }

  /**
   * Execute bulk event operation
   */
  private async executeBulkEventOperation(
    eventIds: string[],
    operation: 'activate' | 'deactivate' | 'cancel',
    reason?: string
  ): Promise<BulkEventManagementResult> {
    const result: BulkEventManagementResult = {
      success: false,
      processedCount: 0,
      failedCount: 0,
      errors: []
    };

    if (eventIds.length === 0) {
      result.success = true;
      return result;
    }// Process in batches of 500 (Firestore batch limit)
    const batchSize = 500;
    const batches = [];
    
    for (let i = 0; i < eventIds.length; i += batchSize) {
      batches.push(eventIds.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      try {
        await this.processBatch(batch, operation, reason);
        result.processedCount += batch.length;
      } catch (error) {
        console.error(`Batch operation failed, processing individually:`, error);
        
        // Process individually to identify specific failures
        for (const eventId of batch) {
          try {
            switch (operation) {
              case 'activate':
                await this.activateEvent(eventId, reason);
                break;
              case 'deactivate':
                await this.deactivateEvent(eventId, reason);
                break;
              case 'cancel':
                await this.cancelEvent(eventId, reason);
                break;
            }
            result.processedCount++;
          } catch (error) {
            result.failedCount++;
            result.errors.push({
              eventId,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }
    }

    result.success = result.processedCount > 0;return result;
  }

  /**
   * Process a batch of events using Firestore batch operations
   */
  private async processBatch(
    eventIds: string[],
    operation: 'activate' | 'deactivate' | 'cancel',
    reason?: string
  ): Promise<void> {
    const batch = writeBatch(db);
    const timestamp = new Date().toISOString();

    for (const eventId of eventIds) {
      const eventRef = doc(db, this.COLLECTION_NAME, eventId);
      let updateData: Record<string, any>;

      switch (operation) {
        case 'activate':
          updateData = {
            isActive: true,
            status: 'active',
            activatedAt: timestamp,
            activationReason: reason || 'Administrative activation',
            updatedAt: timestamp
          };
          break;
        case 'deactivate':
          updateData = {
            isActive: false,
            status: 'inactive',
            deactivatedAt: timestamp,
            deactivationReason: reason || 'Administrative deactivation',
            updatedAt: timestamp
          };
          break;
        case 'cancel':
          updateData = {
            status: 'cancelled',
            cancelledAt: timestamp,
            cancellationReason: reason || 'Administrative cancellation',
            isActive: false,
            updatedAt: timestamp
          };
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      batch.update(eventRef, updateData);
    }

    await batch.commit();
  }

  /**
   * Get event management statistics
   */
  async getEventManagementStats(): Promise<{
    totalEvents: number;
    activeEvents: number;
    inactiveEvents: number;
    cancelledEvents: number;
    upcomingEvents: number;
  }> {
    try {
      const eventsRef = collection(db, this.COLLECTION_NAME);
      
      // Get counts for each status
      const [activeQuery, inactiveQuery, cancelledQuery] = await Promise.all([
        getDocs(query(eventsRef, where('isActive', '==', true))),
        getDocs(query(eventsRef, where('isActive', '==', false))),
        getDocs(query(eventsRef, where('status', '==', 'cancelled')))
      ]);

      // Calculate upcoming events (events with future dates)
      const now = new Date();
      const allEventsQuery = await getDocs(eventsRef);
      let upcomingCount = 0;
      
      allEventsQuery.forEach((doc) => {
        const eventData = doc.data();
        const eventDate = new Date(eventData.date);
        if (eventDate > now && eventData.isActive) {
          upcomingCount++;
        }
      });

      return {
        totalEvents: allEventsQuery.size,
        activeEvents: activeQuery.size,
        inactiveEvents: inactiveQuery.size,
        cancelledEvents: cancelledQuery.size,
        upcomingEvents: upcomingCount
      };
    } catch (error) {
      console.error('Error getting event management stats:', error);
      return {
        totalEvents: 0,
        activeEvents: 0,
        inactiveEvents: 0,
        cancelledEvents: 0,
        upcomingEvents: 0
      };
    }
  }

  /**
   * Get events by status
   */
  async getEventsByStatus(status: 'active' | 'inactive' | 'cancelled', limit: number = 50): Promise<Event[]> {
    try {
      const eventsRef = collection(db, this.COLLECTION_NAME);
      let q;
      
      if (status === 'cancelled') {
        q = query(eventsRef, where('status', '==', 'cancelled'));
      } else {
        q = query(eventsRef, where('isActive', '==', status === 'active'));
      }
      
      const querySnapshot = await getDocs(q);
      const events: Event[] = [];
      
      querySnapshot.forEach((doc) => {
        const eventData = doc.data();
        const data = eventData as any;
        events.push({
          id: doc.id,
          ...data,
          // Convert Firebase timestamps
          date: data.date,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
        } as Event);
      });
      
      return events.slice(0, limit);
    } catch (error) {
      console.error(`Error getting ${status} events:`, error);
      return [];
    }
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(limit: number = 50): Promise<Event[]> {
    try {
      const eventsRef = collection(db, this.COLLECTION_NAME);
      const q = query(eventsRef, where('isActive', '==', true));
      
      const querySnapshot = await getDocs(q);
      const events: Event[] = [];
      const now = new Date();
      
      querySnapshot.forEach((doc) => {
        const eventData = doc.data();
        const eventDate = new Date(eventData.date);
        
        if (eventDate > now) {
          events.push({
            id: doc.id,
            ...eventData,
            date: eventData.date,
            createdAt: eventData.createdAt?.toDate?.() || eventData.createdAt,
            updatedAt: eventData.updatedAt?.toDate?.() || eventData.updatedAt
          } as Event);
        }
      });
      
      // Sort by date (earliest first)
      events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      return events.slice(0, limit);
    } catch (error) {
      console.error('Error getting upcoming events:', error);
      return [];
    }
  }

  /**
   * Validate event operation
   */
  validateEventOperation(operation: string, eventIds: string[]): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (eventIds.length === 0) {
      errors.push('No events selected');
    }

    if (eventIds.length > 1000) {
      errors.push('Too many events selected. Maximum 1000 events per operation');
    }

    const validOperations = ['activate', 'deactivate', 'cancel'];
    if (!validOperations.includes(operation)) {
      errors.push(`Invalid operation: ${operation}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default new EventsManagementService();