// React Query hooks for groups management with caching
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import { Group } from '../types/models';

// Mock services until they're implemented
const groupsService = {
  getUserGroups: async (userId: string, limit?: number) => [] as Group[],
  getGroupById: async (groupId: string) => ({} as Group),
  getGroupMembers: async (groupId: string, limit?: number) => [] as any[],
  searchPublicGroups: async (searchTerm: string, limit?: number) => [] as Group[],
  createGroup: async (groupData: Partial<Group>, creatorId: string) => ({ id: 'temp' } as Group),
  joinGroup: async (groupId: string, userId: string) => ({ success: true }),
  leaveGroup: async (groupId: string, userId: string) => ({ success: true })
};

const getUserCacheManager = (userId: string) => null;

// Hook for getting user's groups
export const useUserGroups = (userId: string, options: any & { limit?: number } = {}) => {
  return useQuery<Group[]>({
    queryKey: queryKeys.userGroups(userId),
    queryFn: async () => {
      return await groupsService.getUserGroups(userId, options.limit || 50);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    ...options,
  });
};

// Hook for getting group details
export const useGroupDetail = (groupId: string, options: any = {}) => {
  return useQuery<Group>({
    queryKey: queryKeys.groupDetail(groupId),
    queryFn: () => groupsService.getGroupById(groupId),
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000,
    cacheTime: 15 * 60 * 1000,
    ...options,
  });
};

// Hook for getting group members
export const useGroupMembers = (groupId: string, options: any & { limit?: number } = {}) => {
  return useQuery<any[]>({
    queryKey: queryKeys.groupMembers(groupId),
    queryFn: () => groupsService.getGroupMembers(groupId, options.limit || 50),
    enabled: !!groupId,
    staleTime: 2 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    ...options,
  });
};

// Hook for searching public groups
export const useSearchGroups = (searchTerm: string, options: any & { limit?: number } = {}) => {
  return useQuery<Group[]>({
    queryKey: ['groups', 'search', searchTerm],
    queryFn: () => groupsService.searchPublicGroups(searchTerm, options.limit || 20),
    enabled: !!searchTerm && searchTerm.length >= 2,
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    ...options,
  });
};

// Mutation for creating a group
export const useCreateGroup = (creatorId: string) => {
  const queryClient = useQueryClient();
  const cacheManager = getUserCacheManager(creatorId);

  return useMutation({
    mutationFn: (groupData: Partial<Group>) => groupsService.createGroup(groupData, creatorId),
    onSuccess: async (newGroup) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userGroups(creatorId) });
      
      const currentGroups = queryClient.getQueryData<Group[]>(queryKeys.userGroups(creatorId)) || [];
      queryClient.setQueryData(queryKeys.userGroups(creatorId), [newGroup, ...currentGroups]);
      
      if (cacheManager) {
        await cacheManager.clearUserCache('GROUPS_LIST');
      }},
  });
};

// Mutation for joining a group
export const useJoinGroup = (userId: string) => {
  const queryClient = useQueryClient();
  const cacheManager = getUserCacheManager(userId);

  return useMutation({
    mutationFn: ({ groupId }: { groupId: string }) => groupsService.joinGroup(groupId, userId),
    onSettled: async (data, error, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userGroups(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.groupDetail(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.groupMembers(groupId) });
      
      if (cacheManager) {
        await cacheManager.clearUserCache('GROUPS_LIST');
      }
    },
  });
};

// Mutation for leaving a group
export const useLeaveGroup = (userId: string) => {
  const queryClient = useQueryClient();
  const cacheManager = getUserCacheManager(userId);

  return useMutation({
    mutationFn: ({ groupId }: { groupId: string }) => groupsService.leaveGroup(groupId, userId),
    onSettled: async (data, error, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userGroups(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.groupDetail(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.groupMembers(groupId) });
      
      if (cacheManager) {
        await cacheManager.clearUserCache('GROUPS_LIST');
      }
    },
  });
};
