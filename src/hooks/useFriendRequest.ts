import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/firebase';
import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import friendsService from '../services/api/friendsService';
import { organizationConnectionService } from '../services/api/organizationConnectionService';
import { useQueryClient } from '@tanstack/react-query';

export type FriendRequestStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'loading';

export interface FriendRequestState {
  status: FriendRequestStatus;
  requestId: string | null;
  loading: boolean;
  error: string | null;
}

export interface UseFriendRequestReturn {
  requestState: FriendRequestState;
  sendRequest: () => Promise<void>;
  cancelRequest: () => Promise<void>;
  acceptRequest: () => Promise<void>;
  rejectRequest: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

export interface UseFriendRequestParams {
  currentUserId: string;
  currentUserName: string;
  currentUserRole?: string;
  currentUserPhoto?: string;
  targetUserId: string;
  targetUserName: string;
  targetUserRole?: string;
  targetUserPhoto?: string;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

/**
 * Unified Friend Request Hook
 * Handles friend requests for both athlete-to-athlete and organization-to-athlete connections
 * Provides consistent behavior across Search and Profile pages
 */
export function useFriendRequest({
  currentUserId,
  currentUserName,
  currentUserRole = 'athlete',
  currentUserPhoto,
  targetUserId,
  targetUserName,
  targetUserRole = 'athlete',
  targetUserPhoto,
  onSuccess,
  onError
}: UseFriendRequestParams): UseFriendRequestReturn {
  const [requestState, setRequestState] = useState<FriendRequestState>({
    status: 'loading',
    requestId: null,
    loading: true,
    error: null
  });

  const queryClient = useQueryClient();

  /**
   * Check current friend request status
   */
  const checkStatus = useCallback(async () => {
    try {
      setRequestState(prev => ({ ...prev, loading: true, error: null }));

      console.log(`🔍 checkStatus: Checking status between Current: '${currentUserId}' and Target: '${targetUserId}'`);

      if (!currentUserId || !targetUserId) {
        console.warn('⚠️ checkStatus: Missing IDs, skipping check.');
        setRequestState({
          status: 'none',
          requestId: null,
          loading: false,
          error: null
        });
        return;
      }

      // 1. Determine if this is a Supported Organization Connection Context
      let isSupportedOrgConnection = false;
      let sentType: any = null;
      let receivedType: any = null;

      if (currentUserRole === 'organization') {
        if (targetUserRole === 'athlete') {
          isSupportedOrgConnection = true;
          sentType = 'org_to_athlete';
          receivedType = 'athlete_to_org';
        } else if (targetUserRole === 'coach') {
          isSupportedOrgConnection = true;
          sentType = 'org_to_coach';
          receivedType = 'coach_to_org';
        }
      } else if (targetUserRole === 'organization') {
        if (currentUserRole === 'athlete') {
          isSupportedOrgConnection = true;
          sentType = 'athlete_to_org';
          receivedType = 'org_to_athlete';
        } else if (currentUserRole === 'coach') {
          isSupportedOrgConnection = true;
          sentType = 'coach_to_org';
          receivedType = 'org_to_coach';
        }
      }

      // 2. If it IS an Organization Connection, ONLY check Organization Service
      if (isSupportedOrgConnection) {
        // Check if I sent a request
        if (sentType) {
          const sent = await organizationConnectionService.checkConnectionExists(currentUserId, targetUserId, sentType);
          if (sent) {
            if (sent.status === 'pending') {
              console.log('✅ Status determined: pending_sent (Organization)');
              setRequestState({
                status: 'pending_sent',
                requestId: sent.id,
                loading: false,
                error: null
              });
              return;
            } else if (sent.status === 'accepted') {
              console.log('✅ Status determined: accepted (Organization)');
              setRequestState({
                status: 'accepted',
                requestId: sent.id,
                loading: false,
                error: null
              });
              return;
            }
          }
        }

        // Check if I received a request
        if (receivedType) {
          const received = await organizationConnectionService.checkConnectionExists(targetUserId, currentUserId, receivedType);
          if (received) {
            if (received.status === 'pending') {
              console.log('✅ Status determined: pending_received (Organization)');
              setRequestState({
                status: 'pending_received',
                requestId: received.id,
                loading: false,
                error: null
              });
              return;
            } else if (received.status === 'accepted') {
              console.log('✅ Status determined: accepted (Organization)');
              setRequestState({
                status: 'accepted',
                requestId: received.id,
                loading: false,
                error: null
              });
              return;
            }
          }
        }

        // If no Org connection found, return 'none' (Ignore standard friend requests)
        console.log('✅ Status determined: none (Organization Context)');
        setRequestState({
          status: 'none',
          requestId: null,
          loading: false,
          error: null
        });
        return;
      }

      // 3. Fallback: Standard Friend Request Checks (Only if NOT a supported Org Connection)
      
      // Check if already friends
      const areFriends = await friendsService.areFriends(currentUserId, targetUserId, currentUserId);
      console.log(`🤝 areFriends result: ${areFriends}`);
      
      if (areFriends) {
        console.log('✅ Status determined: accepted');
        setRequestState({
          status: 'accepted',
          requestId: null,
          loading: false,
          error: null
        });
        return;
      }

      // Check for existing friend requests (bidirectional)
      const sentRequest = await friendsService.checkFriendRequestExists(currentUserId, targetUserId);
      const receivedRequest = await friendsService.checkFriendRequestExists(targetUserId, currentUserId);

      console.log('📨 Request check:', { sentRequest, receivedRequest });

      // Check if current user sent a request
      if (sentRequest && sentRequest.status === 'pending') {
        console.log('✅ Status determined: pending_sent');
        setRequestState({
          status: 'pending_sent',
          requestId: sentRequest.id,
          loading: false,
          error: null
        });
        return;
      }

      // Check if target user sent a request
      if (receivedRequest && receivedRequest.status === 'pending') {
        console.log('✅ Status determined: pending_received');
        setRequestState({
          status: 'pending_received',
          requestId: receivedRequest.id,
          loading: false,
          error: null
        });
        return;
      }

      // No connection exists
      console.log('✅ Status determined: none');
      setRequestState({
        status: 'none',
        requestId: null,
        loading: false,
        error: null
      });
    } catch (error: any) {
      console.error('Error checking friend request status:', error);
      setRequestState({
        status: 'none',
        requestId: null,
        loading: false,
        error: error.message || 'Failed to check status'
      });
    }
  }, [currentUserId, targetUserId, currentUserRole, targetUserRole]);

  /**
   * Send a friend request
   */
  const sendRequest = useCallback(async () => {
    try {
      setRequestState(prev => ({ ...prev, loading: true, error: null }));

      // Determine if this is a supported Organization Connection
      // Organization Connection Service only supports Org<->Athlete and Org<->Coach
      let orgConnectionType: 'org_to_athlete' | 'athlete_to_org' | 'org_to_coach' | 'coach_to_org' | null = null;

      if (currentUserRole === 'organization') {
        if (targetUserRole === 'athlete') orgConnectionType = 'org_to_athlete';
        else if (targetUserRole === 'coach') orgConnectionType = 'org_to_coach';
      } else if (targetUserRole === 'organization') {
        if (currentUserRole === 'athlete') orgConnectionType = 'athlete_to_org';
        else if (currentUserRole === 'coach') orgConnectionType = 'coach_to_org';
      }

      // 1. Organization Connections (Specific supported types)
      if (orgConnectionType) {
        await organizationConnectionService.sendConnectionRequest({
          senderId: currentUserId,
          senderName: currentUserName,
          senderPhotoURL: currentUserPhoto || '',
          senderRole: currentUserRole as 'organization' | 'coach' | 'athlete',
          recipientId: targetUserId,
          recipientName: targetUserName,
          recipientPhotoURL: targetUserPhoto || '',
          recipientRole: targetUserRole as 'organization' | 'coach' | 'athlete',
          connectionType: orgConnectionType
        });

        setRequestState({
          status: 'pending_sent',
          requestId: null,
          loading: false,
          error: null
        });

        if (onSuccess) {
          onSuccess('Connection request sent!');
        }
      }
      // 2. Standard Friend Requests (Universal Fallback)
      // Handles ALL other combinations:
      // - Athlete <-> Athlete
      // - Athlete <-> Parent
      // - Coach <-> Coach
      // - Coach <-> Parent
      // - Parent <-> Parent
      // - Organization <-> Parent (Fallback)
      // - Organization <-> Organization (Fallback)
      else {
        const docRef = await addDoc(collection(db, 'friendRequests'), {
          requesterId: currentUserId,
          requesterName: currentUserName,
          requesterPhotoURL: currentUserPhoto || '',
          recipientId: targetUserId,
          recipientName: targetUserName,
          recipientPhotoURL: targetUserPhoto || '',
          status: 'pending',
          timestamp: serverTimestamp(),
          createdAt: serverTimestamp(),
          message: `${currentUserName} wants to be your friend`
        });

        setRequestState({
          status: 'pending_sent',
          requestId: docRef.id,
          loading: false,
          error: null
        });

        // Invalidate React Query caches
        queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
        queryClient.invalidateQueries({ queryKey: ['friends'] });

        if (onSuccess) {
          onSuccess('Friend request sent!');
        }
      }
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      const errorMessage = error.message || 'Failed to send request';
      setRequestState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));

      if (onError) {
        onError(errorMessage);
      }
    }
  }, [
    currentUserId,
    currentUserName,
    currentUserPhoto,
    currentUserRole,
    targetUserId,
    targetUserName,
    targetUserPhoto,
    targetUserRole,
    queryClient,
    onSuccess,
    onError
  ]);

  /**
   * Cancel a sent friend request
   */
  const cancelRequest = useCallback(async () => {
    // Confirmation dialog
    if (!window.confirm('Are you sure you want to cancel this friend request?')) {
      return;
    }

    try {
      setRequestState(prev => ({ ...prev, loading: true, error: null }));

      // 1. Try to cancel standard friend request if requestId exists
      if (requestState.requestId) {
        await deleteDoc(doc(db, 'friendRequests', requestState.requestId));
      }
      // 2. Try to cancel organization connection request
      else if (
        currentUserRole === 'organization' || 
        targetUserRole === 'organization'
      ) {
        // Determine connection type to find the request
        let orgConnectionType: 'org_to_athlete' | 'athlete_to_org' | 'org_to_coach' | 'coach_to_org' | null = null;

        if (currentUserRole === 'organization') {
          if (targetUserRole === 'athlete') orgConnectionType = 'org_to_athlete';
          else if (targetUserRole === 'coach') orgConnectionType = 'org_to_coach';
        } else if (targetUserRole === 'organization') {
          if (currentUserRole === 'athlete') orgConnectionType = 'athlete_to_org';
          else if (currentUserRole === 'coach') orgConnectionType = 'coach_to_org';
        }

        if (orgConnectionType) {
          // Check if I am the sender of this connection type
          const connection = await organizationConnectionService.checkConnectionExists(
            currentUserId,
            targetUserId,
            orgConnectionType
          );

          if (connection && connection.status === 'pending') {
            await organizationConnectionService.cancelConnectionRequest(connection.id, currentUserId);
          } else {
            console.warn('Could not find pending organization connection to cancel');
          }
        }
      }

      setRequestState({
        status: 'none',
        requestId: null,
        loading: false,
        error: null
      });

      // Invalidate React Query caches
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });

      if (onSuccess) {
        onSuccess('Friend request cancelled');
      }
    } catch (error: any) {
      console.error('Error cancelling friend request:', error);
      const errorMessage = error.message || 'Failed to cancel request';
      setRequestState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));

      if (onError) {
        onError(errorMessage);
      }
    }
  }, [requestState.requestId, currentUserId, currentUserRole, targetUserId, targetUserRole, queryClient, onSuccess, onError]);

  /**
   * Accept a received friend request
   */
  const acceptRequest = useCallback(async () => {
    if (!requestState.requestId) {
      console.warn('No request ID to accept');
      return;
    }

    try {
      setRequestState(prev => ({ ...prev, loading: true, error: null }));

      // Check if it's an organization connection by checking if current or target is an organization
      // Note: We use the role logic to determine context, but rely on the requestId presence
      const isOrgConnection = currentUserRole === 'organization' || targetUserRole === 'organization';

      if (isOrgConnection) {
        // Use Organization Service
        await organizationConnectionService.acceptConnectionRequest({
          connectionId: requestState.requestId,
          acceptedByUserId: currentUserId,
          acceptedByName: currentUserName
        });
      } else {
        // Use Standard Friend Request Service
        // Update request status to accepted
        await updateDoc(doc(db, 'friendRequests', requestState.requestId), {
          status: 'accepted',
          updatedAt: serverTimestamp()
        });

        // Create friendship document (bidirectional)
        await addDoc(collection(db, 'friendships'), {
          user1: targetUserId, // The requester
          user2: currentUserId, // The current user (recipient)
          status: 'accepted',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      setRequestState({
        status: 'accepted',
        requestId: null,
        loading: false,
        error: null
      });

      // Invalidate React Query caches
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });

      if (onSuccess) {
        onSuccess('Request accepted!');
      }
    } catch (error: any) {
      console.error('Error accepting request:', error);
      const errorMessage = error.message || 'Failed to accept request';
      setRequestState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));

      if (onError) {
        onError(errorMessage);
      }
    }
  }, [requestState.requestId, currentUserId, currentUserName, currentUserRole, targetUserId, targetUserRole, queryClient, onSuccess, onError]);

  /**
   * Reject a received friend request
   */
  const rejectRequest = useCallback(async () => {
    if (!requestState.requestId) {
      console.warn('No request ID to reject');
      return;
    }

    // Confirmation dialog
    if (!window.confirm('Are you sure you want to reject this request?')) {
      return;
    }

    try {
      setRequestState(prev => ({ ...prev, loading: true, error: null }));

      const isOrgConnection = currentUserRole === 'organization' || targetUserRole === 'organization';

      if (isOrgConnection) {
        // Use Organization Service
        await organizationConnectionService.rejectConnectionRequest({
          connectionId: requestState.requestId,
          rejectedByUserId: currentUserId,
          rejectedByName: currentUserName,
          reason: 'User rejected request'
        });
      } else {
        // Use Standard Friend Request Service
        // Update request status to rejected
        await updateDoc(doc(db, 'friendRequests', requestState.requestId), {
          status: 'rejected',
          updatedAt: serverTimestamp()
        });
      }

      setRequestState({
        status: 'none',
        requestId: null,
        loading: false,
        error: null
      });

      // Invalidate React Query caches
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });

      if (onSuccess) {
        onSuccess('Request rejected');
      }
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      const errorMessage = error.message || 'Failed to reject request';
      setRequestState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));

      if (onError) {
        onError(errorMessage);
      }
    }
  }, [requestState.requestId, currentUserId, currentUserName, currentUserRole, targetUserRole, queryClient, onSuccess, onError]);

  /**
   * Check status on mount and when dependencies change
   */
  useEffect(() => {
    if (currentUserId && targetUserId && currentUserId !== targetUserId) {
      checkStatus();
    }
  }, [currentUserId, targetUserId, checkStatus]);

  return {
    requestState,
    sendRequest,
    cancelRequest,
    acceptRequest,
    rejectRequest,
    refreshStatus: checkStatus
  };
}
