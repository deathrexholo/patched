import { useState, useEffect, useCallback, useRef } from 'react';
import friendsService from '../services/api/friendsService';
import { UI_CONSTANTS } from '../constants/sharing';
import { UseLazyFriendsReturn } from '../types/hooks/custom';
import { Friend } from '../types/models';

interface UseLazyFriendsOptions {
  pageSize?: number;
  searchDebounce?: number;
  autoLoad?: boolean;
}

export const useLazyFriends = (userId: string, options: UseLazyFriendsOptions = {}): UseLazyFriendsReturn => {
  const {
    pageSize = UI_CONSTANTS.PAGINATION_SIZE,
    searchDebounce = UI_CONSTANTS.SEARCH_DEBOUNCE_DELAY,
    autoLoad = true
  } = options;

  const [friends, setFriends] = useState<Friend[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const allFriendsRef = useRef<Friend[]>([]);

  const loadFriends = useCallback(async (skipCache: boolean = false): Promise<void> => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const friendsList = await friendsService.getFriendsList(userId, { skipCache });
      allFriendsRef.current = friendsList;
      setFriends(friendsList);
      
      const paginatedFriends = friendsList.slice(0, pageSize);
      setFilteredFriends(paginatedFriends);
      setHasMore(friendsList.length > pageSize);
      setPage(1);} catch (err: any) {
      console.error('❌ Error loading friends:', err);
      setError(err.message || 'Failed to load friends');
    } finally {
      setLoading(false);
    }
  }, [userId, pageSize]);

  const loadMore = useCallback((): Promise<void> => {
    if (!hasMore || loading) return Promise.resolve();

    const nextPage = page + 1;
    const endIndex = nextPage * pageSize;
    
    const currentList = searchTerm ? 
      allFriendsRef.current.filter(f => 
        f.displayName.toLowerCase().includes(searchTerm.toLowerCase())
      ) : 
      allFriendsRef.current;

    const paginatedFriends = currentList.slice(0, endIndex);
    setFilteredFriends(paginatedFriends);
    setPage(nextPage);
    setHasMore(currentList.length > endIndex);
    
    return Promise.resolve();
  }, [page, pageSize, hasMore, loading, searchTerm]);

  const searchFriends = useCallback((query: string): Friend[] => {
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) return allFriendsRef.current;
    
    return allFriendsRef.current.filter(friend =>
      friend.displayName.toLowerCase().includes(trimmedQuery)
    );
  }, []);

  const refresh = useCallback((): Promise<void> => {
    return loadFriends(true);
  }, [loadFriends]);

  useEffect(() => {
    if (autoLoad && userId) {
      loadFriends();
    }
  }, [userId, autoLoad, loadFriends]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return {
    friends: filteredFriends,
    loading,
    hasMore,
    error,
    loadMore,
    refresh,
    searchFriends
  };
};

export default useLazyFriends;
