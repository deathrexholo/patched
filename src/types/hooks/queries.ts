import { 
  UseQueryOptions, 
  UseInfiniteQueryOptions,
  UseQueryResult,
  UseInfiniteQueryResult
} from '@tanstack/react-query';
import { Post, User, Comment, Story, Event, Message } from '../models';
import { ApiError, PaginatedResponse } from '../api/responses';

// Base query options types
export type BaseQueryOptions<TData, TError = ApiError> = Omit<
  UseQueryOptions<TData, TError>,
  'queryKey' | 'queryFn'
>;

export type BaseInfiniteQueryOptions<TData, TError = ApiError> = Omit<
  UseInfiniteQueryOptions<TData, TError>,
  'queryKey' | 'queryFn' | 'getNextPageParam'
>;

// Post query options
export type PostsQueryOptions = BaseQueryOptions<Post[]>;
export type PostQueryOptions = BaseQueryOptions<Post>;
export type InfinitePostsQueryOptions = BaseInfiniteQueryOptions<PaginatedResponse<Post>>;

// User query options
export type UserQueryOptions = BaseQueryOptions<User>;
export type UsersQueryOptions = BaseQueryOptions<User[]>;

// Comment query options
export type CommentsQueryOptions = BaseQueryOptions<Comment[]>;
export type CommentQueryOptions = BaseQueryOptions<Comment>;

// Story query options
export type StoriesQueryOptions = BaseQueryOptions<Story[]>;
export type StoryQueryOptions = BaseQueryOptions<Story>;

// Event query options
export type EventsQueryOptions = BaseQueryOptions<Event[]>;
export type EventQueryOptions = BaseQueryOptions<Event>;

// Message query options
export type MessagesQueryOptions = BaseQueryOptions<Message[]>;
export type MessageQueryOptions = BaseQueryOptions<Message>;

// Query result types
export type PostsQueryResult = UseQueryResult<Post[], ApiError>;
export type PostQueryResult = UseQueryResult<Post, ApiError>;
export type InfinitePostsQueryResult = UseInfiniteQueryResult<PaginatedResponse<Post>, ApiError>;
export type UserQueryResult = UseQueryResult<User, ApiError>;
export type UsersQueryResult = UseQueryResult<User[], ApiError>;
export type CommentsQueryResult = UseQueryResult<Comment[], ApiError>;
export type StoriesQueryResult = UseQueryResult<Story[], ApiError>;
export type EventsQueryResult = UseQueryResult<Event[], ApiError>;
export type MessagesQueryResult = UseQueryResult<Message[], ApiError>;

// Prefetch function types
export interface PrefetchFunctions {
  prefetchPostsFeed: () => Promise<void>;
  prefetchUserPosts: (userId: string) => Promise<void>;
  prefetchPostDetail: (postId: string) => Promise<void>;
  prefetchUserProfile: (userId: string) => Promise<void>;
  prefetchStories: () => Promise<void>;
  prefetchEvents: () => Promise<void>;
}

// Cache management types
export interface CacheOperations<T> {
  clearCache: () => Promise<boolean>;
  cacheData: (data: T, key?: string) => Promise<boolean>;
  getCachedData: (key?: string) => Promise<T | null>;
}

// Share analytics types for queries
export interface ShareAnalyticsQuery {
  totalShares: number;
  shareBreakdown: {
    friends: number;
    feeds: number;
    groups: number;
  };
  timeline: Array<{
    date: Date;
    count: number;
  }>;
  topSharers: Array<{
    userId: string;
    displayName: string;
    photoURL: string | null;
    shareCount: number;
  }>;
  recentShares: Array<{
    userId: string;
    displayName: string;
    photoURL: string | null;
    sharedAt: Date;
    shareType: 'friends' | 'feeds' | 'groups';
  }>;
}

export type ShareAnalyticsQueryOptions = BaseQueryOptions<ShareAnalyticsQuery>;
export type ShareAnalyticsQueryResult = UseQueryResult<ShareAnalyticsQuery, ApiError>;
