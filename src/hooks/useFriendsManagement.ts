// React Query hooks for friends management with caching
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import { Friend } from '../types/models';

// Mock services until they're implemented
const friendsService = {
  getUserFriends: async (userId: string, limit?: number) => [] as Friend[],
  searchUserFriends: async (userId: string, searchTerm: string, limit?: number) => [] as Friend[],
  getPendingFriendRequests: async (userId: string) => [] as any[],
  getSentFriendRequests: async (userId: string) => [] as any[],
  getFriendshipStatus: async (userId1: string, userId2: string) => ({ status: 'none' }),
  getMutualFriends: async (userId1: string, userId2: string, limit?: number) => [] as Friend[],
  getFriendsCount: async (userId: string) => 0,
  sendFriendRequest: async (senderId: string, receiverId: string, senderName: string) => ({ id: 'temp' }),
  acceptFriendRequest: async (requestId: string, userId: string) => ({ user1: '', user2: '' }),
  rejectFriendRequest: async (requestId: string, userId: string) => ({ success: true }),
  removeFriend: async (userId: string, friendId: string) => ({ success: true })
};

const getUserCacheManager = (userId: string) => null;

interface UsersQueryOptions {
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
}

// Hook for getting user's friends list
export const useUserFriends = (userId: string, options: UsersQueryOptions & { limit?: number } = {}) => {
  return useQuery<Friend[]>({
    queryKey: queryKeys.userFriends(userId),
    queryFn: async () => {
      return await friendsService.getUserFriends(userId, options.limit || 50);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    ...options,
  });
};

// Hook for searching user's friends
export const useSearchFriends = (userId: string, searchTerm: string, options: UsersQueryOptions & { limit?: number } = {}) => {
  return useQuery<Friend[]>({
    queryKey: ['friends', 'search', userId, searchTerm],
    queryFn: () => friendsService.searchUserFriends(userId, searchTerm, options.limit || 20),
    enabled: !!userId && !!searchTerm && searchTerm.length >= 2,
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    ...options,
  });
};

// Hook for getting pending friend requests (received)
export const usePendingFriendRequests = (userId: string, options: any = {}) => {
  return useQuery<any[]>({
    queryKey: ['friendRequests', 'pending', userId],
    queryFn: () => friendsService.getPendingFriendRequests(userId),
    enabled: !!userId,
    staleTime: 30 * 1000,
    cacheTime: 2 * 60 * 1000,
    refetchInterval: 60 * 1000,
    ...options,
  });
};

// Hook for getting sent friend requests
export const useSentFriendRequests = (userId: string, options: any = {}) => {
  return useQuery<any[]>({
    queryKey: ['friendRequests', 'sent', userId],
    queryFn: () => friendsService.getSentFriendRequests(userId),
    enabled: !!userId,
    staleTime: 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    ...options,
  });
};

// Hook for getting friendship status between two users
export const useFriendshipStatus = (userId1: string, userId2: string, options: any = {}) => {
  return useQuery<any>({
    queryKey: ['friendship', 'status', userId1, userId2],
    queryFn: () => friendsService.getFriendshipStatus(userId1, userId2),
    enabled: !!userId1 && !!userId2 && userId1 !== userId2,
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    ...options,
  });
};

// Hook for getting mutual friends
export const useMutualFriends = (userId1: string, userId2: string, options: any & { limit?: number } = {}) => {
  return useQuery<Friend[]>({
    queryKey: ['friends', 'mutual', userId1, userId2],
    queryFn: () => friendsService.getMutualFriends(userId1, userId2, options.limit || 10),
    enabled: !!userId1 && !!userId2 && userId1 !== userId2,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    ...options,
  });
};

// Hook for getting friends count
export const useFriendsCount = (userId: string, options: any = {}) => {
  return useQuery<number>({
    queryKey: ['friends', 'count', userId],
    queryFn: () => friendsService.getFriendsCount(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    ...options,
  });
};

// Mutation for sending friend request
export const useSendFriendRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ senderId, receiverId, senderName }: { senderId: string; receiverId: string; senderName: string }) => 
      friendsService.sendFriendRequest(senderId, receiverId, senderName),
    onMutate: async ({ senderId, receiverId }) => {
      await queryClient.cancelQueries({ 
        queryKey: ['friendship', 'status', senderId, receiverId] 
      });
      
      const previousStatus = queryClient.getQueryData(['friendship', 'status', senderId, receiverId]);
      
      queryClient.setQueryData(['friendship', 'status', senderId, receiverId], {
        status: 'pending',
        direction: 'sent'
      });

      return { previousStatus };
    },
    onError: (err, { senderId, receiverId }, context: any) => {
      if (context?.previousStatus) {
        queryClient.setQueryData(['friendship', 'status', senderId, receiverId], context.previousStatus);
      }
    },
    onSettled: (data, error, { senderId, receiverId }) => {
      queryClient.invalidateQueries({ queryKey: ['friendship', 'status', senderId, receiverId] });
      queryClient.invalidateQueries({ queryKey: ['friendRequests', 'sent', senderId] });
      queryClient.invalidateQueries({ queryKey: ['friendRequests', 'pending', receiverId] });
    },
  });
};

// Mutation for accepting friend request
export const useAcceptFriendRequest = (currentUserId: string) => {
  const queryClient = useQueryClient();
  const cacheManager = getUserCacheManager(currentUserId);

  return useMutation({
    mutationFn: ({ requestId }: { requestId: string }) => friendsService.acceptFriendRequest(requestId, currentUserId),
    onMutate: async ({ requestId }) => {
      await queryClient.cancelQueries({ queryKey: ['friendRequests', 'pending', currentUserId] });
      await queryClient.cancelQueries({ queryKey: queryKeys.userFriends(currentUserId) });

      const previousRequests = queryClient.getQueryData(['friendRequests', 'pending', currentUserId]);
      const previousFriends = queryClient.getQueryData(queryKeys.userFriends(currentUserId));

      if (previousRequests) {
        queryClient.setQueryData(['friendRequests', 'pending', currentUserId], 
          (previousRequests as any[]).filter((req: any) => req.id !== requestId)
        );
      }

      return { previousRequests, previousFriends };
    },
    onError: (err, { requestId }, context: any) => {
      if (context?.previousRequests) {
        queryClient.setQueryData(['friendRequests', 'pending', currentUserId], context.previousRequests);
      }
      if (context?.previousFriends) {
        queryClient.setQueryData(queryKeys.userFriends(currentUserId), context.previousFriends);
      }
    },
    onSettled: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests', 'pending', currentUserId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.userFriends(currentUserId) });
      queryClient.invalidateQueries({ queryKey: ['friends', 'count', currentUserId] });
      
      if (cacheManager) {
        await cacheManager.clearUserCache('FRIENDS_LIST');
      }
      
      if (data) {
        const otherUserId = (data as any).user1 === currentUserId ? (data as any).user2 : (data as any).user1;
        queryClient.invalidateQueries({ queryKey: queryKeys.userFriends(otherUserId) });
        queryClient.invalidateQueries({ queryKey: ['friends', 'count', otherUserId] });
        queryClient.invalidateQueries({ queryKey: ['friendship', 'status', currentUserId, otherUserId] });
      }
    },
  });
};

// Mutation for rejecting friend request
export const useRejectFriendRequest = (currentUserId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId }: { requestId: string }) => friendsService.rejectFriendRequest(requestId, currentUserId),
    onMutate: async ({ requestId }) => {
      await queryClient.cancelQueries({ queryKey: ['friendRequests', 'pending', currentUserId] });

      const previousRequests = queryClient.getQueryData(['friendRequests', 'pending', currentUserId]);

      if (previousRequests) {
        queryClient.setQueryData(['friendRequests', 'pending', currentUserId], 
          (previousRequests as any[]).filter((req: any) => req.id !== requestId)
        );
      }

      return { previousRequests };
    },
    onError: (err, { requestId }, context: any) => {
      if (context?.previousRequests) {
        queryClient.setQueryData(['friendRequests', 'pending', currentUserId], context.previousRequests);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests', 'pending', currentUserId] });
    },
  });
};

// Mutation for removing friend
export const useRemoveFriend = (currentUserId: string) => {
  const queryClient = useQueryClient();
  const cacheManager = getUserCacheManager(currentUserId);

  return useMutation({
    mutationFn: ({ friendId }: { friendId: string }) => friendsService.removeFriend(currentUserId, friendId),
    onMutate: async ({ friendId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.userFriends(currentUserId) });
      await queryClient.cancelQueries({ queryKey: ['friendship', 'status', currentUserId, friendId] });

      const previousFriends = queryClient.getQueryData(queryKeys.userFriends(currentUserId));
      const previousStatus = queryClient.getQueryData(['friendship', 'status', currentUserId, friendId]);

      if (previousFriends) {
        queryClient.setQueryData(queryKeys.userFriends(currentUserId), 
          (previousFriends as Friend[]).filter((friend: Friend) => friend.id !== friendId)
        );
      }

      queryClient.setQueryData(['friendship', 'status', currentUserId, friendId], {
        status: 'none'
      });

      return { previousFriends, previousStatus };
    },
    onError: (err, { friendId }, context: any) => {
      if (context?.previousFriends) {
        queryClient.setQueryData(queryKeys.userFriends(currentUserId), context.previousFriends);
      }
      if (context?.previousStatus) {
        queryClient.setQueryData(['friendship', 'status', currentUserId, friendId], context.previousStatus);
      }
    },
    onSettled: async (data, error, { friendId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userFriends(currentUserId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.userFriends(friendId) });
      queryClient.invalidateQueries({ queryKey: ['friends', 'count', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['friends', 'count', friendId] });
      queryClient.invalidateQueries({ queryKey: ['friendship', 'status', currentUserId, friendId] });
      queryClient.invalidateQueries({ queryKey: ['friends', 'mutual', currentUserId, friendId] });
      
      if (cacheManager) {
        await cacheManager.clearUserCache('FRIENDS_LIST');
      }
    },
  });
};

// Hook for prefetching friends data
export const usePrefetchFriendsData = () => {
  const queryClient = useQueryClient();

  const prefetchUserFriends = async (userId: string): Promise<void> => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.userFriends(userId),
      queryFn: () => friendsService.getUserFriends(userId),
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchFriendRequests = async (userId: string): Promise<void> => {
    await queryClient.prefetchQuery({
      queryKey: ['friendRequests', 'pending', userId],
      queryFn: () => friendsService.getPendingFriendRequests(userId),
      staleTime: 30 * 1000,
    });
  };

  const prefetchFriendsCount = async (userId: string): Promise<void> => {
    await queryClient.prefetchQuery({
      queryKey: ['friends', 'count', userId],
      queryFn: () => friendsService.getFriendsCount(userId),
      staleTime: 5 * 60 * 1000,
    });
  };

  return {
    prefetchUserFriends,
    prefetchFriendRequests,
    prefetchFriendsCount,
  };
};

// Hook for managing friends cache
export const useFriendsCache = (userId: string) => {
  const cacheManager = getUserCacheManager(userId);

  const clearFriendsCache = async (): Promise<boolean> => {
    if (cacheManager) {
      return await cacheManager.clearUserCache('FRIENDS_LIST');
    }
    return false;
  };

  const refreshFriendsCache = async (): Promise<boolean> => {
    if (cacheManager) {
      const friends = await friendsService.getUserFriends(userId);
      return await cacheManager.cacheUserData('FRIENDS_LIST', friends);
    }
    return false;
  };

  return {
    clearFriendsCache,
    refreshFriendsCache,
    cacheManager,
  };
};
