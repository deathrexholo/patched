// Conflict resolution system for offline edits - Phase 3 implementation
// Intelligent conflict resolution for simultaneous online/offline edits

import { idbStore } from './indexedDB';
import { queryClient } from '../../lib/queryClient';

// Conflict resolution strategies
export const CONFLICT_STRATEGIES = {
  LAST_WRITE_WINS: 'last_write_wins',
  MERGE: 'merge',
  SERVER_WINS: 'server_wins',
  CLIENT_WINS: 'client_wins',
  MANUAL_RESOLUTION: 'manual_resolution'
};

// Conflict types
export const CONFLICT_TYPES = {
  POST_UPDATE: 'post_update',
  USER_PROFILE: 'user_profile',
  SOCIAL_INTERACTION: 'social_interaction',
  PREFERENCE_UPDATE: 'preference_update'
};

// Conflict resolution manager
export class ConflictResolver {
  static instance = null;

  constructor() {
    if (ConflictResolver.instance) {
      return ConflictResolver.instance;
    }
    ConflictResolver.instance = this;
  }

  // Main conflict resolution method as per documentation
  async resolveConflicts(localData, serverData, entityType, entityId) {
    try {const conflictId = `conflict_${entityType}_${entityId}_${Date.now()}`;
      const conflict = {
        id: conflictId,
        entityType,
        entityId,
        localData,
        serverData,
        createdAt: Date.now(),
        resolved: false,
        resolution: null,
        resolvedAt: null as number | null
      };

      // Store conflict for potential manual resolution
      await idbStore.addConflict(conflict);

      let resolvedData;
      
      switch (entityType) {
        case CONFLICT_TYPES.USER_PROFILE:
          resolvedData = await this.resolveUserProfileConflict(localData, serverData);
          break;
        case CONFLICT_TYPES.POST_UPDATE:
          resolvedData = await this.resolvePostConflict(localData, serverData);
          break;
        case CONFLICT_TYPES.SOCIAL_INTERACTION:
          resolvedData = await this.resolveSocialInteractionConflict(localData, serverData);
          break;
        case CONFLICT_TYPES.PREFERENCE_UPDATE:
          resolvedData = await this.resolvePreferenceConflict(localData, serverData);
          break;
        default:
          // Default to last-write-wins
          resolvedData = await this.resolveLastWriteWins(localData, serverData);
      }

      // Mark conflict as resolved
      conflict.resolved = true;
      conflict.resolution = resolvedData;
      conflict.resolvedAt = Date.now();
      await idbStore.addConflict(conflict);return resolvedData;
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      throw error;
    }
  }

  // Resolve user profile conflicts
  async resolveUserProfileConflict(localData, serverData) {const conflictResolution = {
      // Last-write-wins for user preferences
      userPreferences: serverData.updatedAt > localData.updatedAt ? serverData : localData,
      
      // Server-wins for critical data
      followersCount: serverData.followersCount,
      followingCount: serverData.followingCount,
      verificationStatus: serverData.verificationStatus,
      
      // Client-wins for personal settings
      displayName: localData.displayName || serverData.displayName,
      bio: localData.bio !== undefined ? localData.bio : serverData.bio,
      location: localData.location !== undefined ? localData.location : serverData.location,
      
      // Merge approach for preferences
      preferences: this.mergePreferences(localData.preferences, serverData.preferences),
      
      // Keep latest timestamp
      updatedAt: Math.max(
        new Date(localData.updatedAt || 0).getTime(),
        new Date(serverData.updatedAt || 0).getTime()
      )
    };

    return conflictResolution;
  }

  // Resolve post conflicts
  async resolvePostConflict(localData, serverData) {const conflictResolution = {
      // Keep original post content (server-wins for core content)
      caption: serverData.caption,
      mediaUrl: serverData.mediaUrl,
      mediaType: serverData.mediaType,
      userId: serverData.userId,
      
      // Merge social interactions
      likes: this.mergeLikes(localData.likes, serverData.likes),
      comments: this.mergeCommentsByTimestamp(localData.comments, serverData.comments),
      
      // Server-wins for counts (they are authoritative)
      likesCount: serverData.likesCount,
      commentsCount: serverData.commentsCount,
      sharesCount: serverData.sharesCount,
      
      // Keep server metadata
      createdAt: serverData.createdAt,
      updatedAt: serverData.updatedAt,
      id: serverData.id
    };

    return conflictResolution;
  }

  // Resolve social interaction conflicts as per documentation
  async resolveSocialInteractionConflict(localData, serverData) {const conflictResolution = {
      // Merge strategy for social interactions
      likes: [...new Set([...(localData.likes || []), ...(serverData.likes || [])])],
      comments: this.mergeCommentsByTimestamp(
        localData.comments || [], 
        serverData.comments || []
      ),
      
      // Server-wins for follower relationships (authoritative)
      followers: serverData.followers || localData.followers,
      following: serverData.following || localData.following,
      
      // Merge user interactions
      userInteractions: this.mergeUserInteractions(
        localData.userInteractions, 
        serverData.userInteractions
      ),
      
      // Keep latest update time
      lastInteractionAt: Math.max(
        new Date(localData.lastInteractionAt || 0).getTime(),
        new Date(serverData.lastInteractionAt || 0).getTime()
      )
    };

    return conflictResolution;
  }

  // Resolve preference conflicts
  async resolvePreferenceConflict(localData, serverData) {const conflictResolution = {
      // Client-wins for UI preferences (user knows best)
      theme: localData.theme !== undefined ? localData.theme : serverData.theme,
      language: localData.language !== undefined ? localData.language : serverData.language,
      notifications: this.mergeNotificationPreferences(
        localData.notifications, 
        serverData.notifications
      ),
      
      // Server-wins for account-level settings
      privacy: serverData.privacy || localData.privacy,
      security: serverData.security || localData.security,
      
      // Merge sports and interests
      favoriteAthletes: this.mergeArraysUnique(
        localData.favoriteAthletes, 
        serverData.favoriteAthletes
      ),
      followingSports: this.mergeArraysUnique(
        localData.followingSports, 
        serverData.followingSports
      ),
      
      // Keep latest timestamp
      updatedAt: Math.max(
        new Date(localData.updatedAt || 0).getTime(),
        new Date(serverData.updatedAt || 0).getTime()
      )
    };

    return conflictResolution;
  }

  // Last-write-wins resolution
  async resolveLastWriteWins(localData, serverData) {
    const localTime = new Date(localData.updatedAt || localData.createdAt || 0).getTime();
    const serverTime = new Date(serverData.updatedAt || serverData.createdAt || 0).getTime();
    
    return serverTime > localTime ? serverData : localData;
  }

  // Merge comments by timestamp
  mergeCommentsByTimestamp(localComments, serverComments) {
    const allComments = [...(localComments || []), ...(serverComments || [])];
    
    // Remove duplicates by ID and sort by timestamp
    const uniqueComments = allComments.reduce((acc, comment) => {
      const existing = acc.find(c => c.id === comment.id);
      if (!existing) {
        acc.push(comment);
      } else {
        // Keep the comment with the latest timestamp
        const existingTime = new Date(existing.createdAt || 0).getTime();
        const currentTime = new Date(comment.createdAt || 0).getTime();
        if (currentTime > existingTime) {
          const index = acc.indexOf(existing);
          acc[index] = comment;
        }
      }
      return acc;
    }, []);

    // Sort by creation time
    return uniqueComments.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  // Merge likes arrays
  mergeLikes(localLikes, serverLikes) {
    const allLikes = [...(localLikes || []), ...(serverLikes || [])];
    
    // Remove duplicates by userId
    const uniqueLikes = allLikes.reduce((acc, like) => {
      if (!acc.find(l => l.userId === like.userId)) {
        acc.push(like);
      }
      return acc;
    }, []);

    return uniqueLikes;
  }

  // Merge user interactions
  mergeUserInteractions(localInteractions, serverInteractions) {
    const local = localInteractions || {};
    const server = serverInteractions || {};
    
    const merged = { ...server };
    
    // Merge each interaction type
    Object.keys(local).forEach(userId => {
      if (merged[userId]) {
        // Merge interactions for this user
        merged[userId] = {
          ...merged[userId],
          ...local[userId],
          lastInteraction: Math.max(
            new Date(merged[userId].lastInteraction || 0).getTime(),
            new Date(local[userId].lastInteraction || 0).getTime()
          )
        };
      } else {
        merged[userId] = local[userId];
      }
    });

    return merged;
  }

  // Merge notification preferences
  mergeNotificationPreferences(localPrefs, serverPrefs) {
    const local = localPrefs || {};
    const server = serverPrefs || {};
    
    return {
      // Client-wins for notification preferences
      push: local.push !== undefined ? local.push : server.push,
      email: local.email !== undefined ? local.email : server.email,
      sms: local.sms !== undefined ? local.sms : server.sms,
      
      // Merge specific notification types
      types: {
        ...(server.types || {}),
        ...(local.types || {})
      },
      
      // Keep latest update time
      updatedAt: Math.max(
        new Date(local.updatedAt || 0).getTime(),
        new Date(server.updatedAt || 0).getTime()
      )
    };
  }

  // Merge preferences objects
  mergePreferences(localPrefs, serverPrefs) {
    const local = localPrefs || {};
    const server = serverPrefs || {};
    
    return {
      ...server,
      ...local,
      
      // Special handling for nested objects
      notifications: this.mergeNotificationPreferences(
        local.notifications, 
        server.notifications
      ),
      
      // Arrays should be merged uniquely
      favoriteAthletes: this.mergeArraysUnique(
        local.favoriteAthletes, 
        server.favoriteAthletes
      ),
      followingSports: this.mergeArraysUnique(
        local.followingSports, 
        server.followingSports
      )
    };
  }

  // Merge arrays with unique values
  mergeArraysUnique(localArray, serverArray) {
    const local = localArray || [];
    const server = serverArray || [];
    return [...new Set([...server, ...local])];
  }

  // Get all unresolved conflicts
  async getUnresolvedConflicts() {
    try {
      const allConflicts = await idbStore.getConflicts();
      return allConflicts.filter(conflict => !conflict.resolved);
    } catch (error) {
      console.error('Failed to get unresolved conflicts:', error);
      return [];
    }
  }

  // Get conflicts by entity
  async getConflictsByEntity(entityType, entityId) {
    try {
      return await idbStore.getConflictsByEntity(entityType, entityId);
    } catch (error) {
      console.error('Failed to get conflicts by entity:', error);
      return [];
    }
  }

  // Manually resolve conflict
  async manuallyResolveConflict(conflictId, resolution) {
    try {
      const conflicts = await idbStore.getConflicts();
      const conflict = conflicts.find(c => c.id === conflictId);
      
      if (!conflict) {
        throw new Error(`Conflict ${conflictId} not found`);
      }

      const resolvedConflict = {
        ...conflict,
        resolved: true,
        resolution,
        resolvedAt: Date.now(),
        resolvedBy: 'manual'
      };

      await idbStore.addConflict(resolvedConflict);
      
      // Update React Query cache with resolution
      this.updateCacheWithResolution(conflict.entityType, conflict.entityId, resolution);
      
      return resolvedConflict;
    } catch (error) {
      console.error('Failed to manually resolve conflict:', error);
      throw error;
    }
  }

  // Update cache with resolution
  updateCacheWithResolution(entityType, entityId, resolution) {
    try {
      switch (entityType) {
        case CONFLICT_TYPES.USER_PROFILE:
          queryClient.setQueryData(['user', 'profile', entityId], resolution);
          break;
        case CONFLICT_TYPES.POST_UPDATE:
          queryClient.setQueryData(['posts', entityId], resolution);
          queryClient.invalidateQueries({ queryKey: ['posts'] });
          break;
        case CONFLICT_TYPES.PREFERENCE_UPDATE:
          queryClient.setQueryData(['user', 'preferences', entityId], resolution);
          break;
      }
    } catch (error) {
      console.error('Failed to update cache with resolution:', error);
    }
  }

  // Clear resolved conflicts older than specified days
  async clearResolvedConflicts(olderThanDays = 7) {
    try {
      const allConflicts = await idbStore.getConflicts();
      const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
      
      for (const conflict of allConflicts) {
        if (conflict.resolved && conflict.resolvedAt < cutoffTime) {
          await idbStore.resolveConflict(conflict.id);
        }
      }} catch (error) {
      console.error('Failed to clear resolved conflicts:', error);
    }
  }

  // Generate conflict summary for UI
  generateConflictSummary(conflict) {
    const { entityType, localData, serverData } = conflict;
    
    const summary = {
      type: entityType,
      description: this.getConflictDescription(entityType),
      differences: this.findDataDifferences(localData, serverData),
      recommendedResolution: this.getRecommendedResolution(entityType),
      impact: this.assessConflictImpact(entityType, localData, serverData)
    };

    return summary;
  }

  // Get human-readable conflict description
  getConflictDescription(entityType) {
    const descriptions = {
      [CONFLICT_TYPES.USER_PROFILE]: 'Your profile was updated both locally and on the server',
      [CONFLICT_TYPES.POST_UPDATE]: 'A post was modified both offline and online',
      [CONFLICT_TYPES.SOCIAL_INTERACTION]: 'Social interactions occurred both offline and online',
      [CONFLICT_TYPES.PREFERENCE_UPDATE]: 'Settings were changed both locally and on the server'
    };

    return descriptions[entityType] || 'Data was modified in multiple places';
  }

  // Find key differences between local and server data
  findDataDifferences(localData, serverData) {
    const differences = [];
    
    const allKeys = new Set([...Object.keys(localData), ...Object.keys(serverData)]);
    
    allKeys.forEach(key => {
      const localValue = localData[key];
      const serverValue = serverData[key];
      
      if (JSON.stringify(localValue) !== JSON.stringify(serverValue)) {
        differences.push({
          field: key,
          localValue,
          serverValue,
          type: typeof localValue
        });
      }
    });

    return differences;
  }

  // Get recommended resolution strategy
  getRecommendedResolution(entityType) {
    const recommendations = {
      [CONFLICT_TYPES.USER_PROFILE]: CONFLICT_STRATEGIES.MERGE,
      [CONFLICT_TYPES.POST_UPDATE]: CONFLICT_STRATEGIES.SERVER_WINS,
      [CONFLICT_TYPES.SOCIAL_INTERACTION]: CONFLICT_STRATEGIES.MERGE,
      [CONFLICT_TYPES.PREFERENCE_UPDATE]: CONFLICT_STRATEGIES.CLIENT_WINS
    };

    return recommendations[entityType] || CONFLICT_STRATEGIES.LAST_WRITE_WINS;
  }

  // Assess the impact of the conflict
  assessConflictImpact(entityType, localData, serverData) {
    // Simple impact assessment based on data size and type
    const differences = this.findDataDifferences(localData, serverData);
    const criticalFields = ['id', 'userId', 'email', 'verificationStatus'];
    
    const hasCriticalChanges = differences.some(diff => 
      criticalFields.includes(diff.field)
    );

    if (hasCriticalChanges) return 'high';
    if (differences.length > 5) return 'medium';
    return 'low';
  }
}

// Create singleton instance
export const conflictResolver = new ConflictResolver();

// Convenience functions
export const resolveConflicts = async (localData, serverData, entityType, entityId) => {
  return await conflictResolver.resolveConflicts(localData, serverData, entityType, entityId);
};

export const getUnresolvedConflicts = async () => {
  return await conflictResolver.getUnresolvedConflicts();
};

export const manuallyResolveConflict = async (conflictId, resolution) => {
  return await conflictResolver.manuallyResolveConflict(conflictId, resolution);
};

export default conflictResolver;