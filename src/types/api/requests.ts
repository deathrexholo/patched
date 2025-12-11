import { Post } from '../models/post';

/**
 * Pagination parameters for list queries
 */
export interface PaginationParams {
  limit?: number;
  startAfter?: string | null;
  orderBy?: string;
  direction?: 'asc' | 'desc';
}

/**
 * Request parameters for fetching posts
 */
export interface GetPostsRequest extends PaginationParams {
  userId?: string;
  visibility?: Array<Post['visibility']>;
}

/**
 * Request parameters for fetching user posts
 */
export interface GetUserPostsRequest extends PaginationParams {
  userId: string;
}

/**
 * Request parameters for creating a comment
 */
export interface CreateCommentRequest {
  postId: string;
  text: string;
  parentCommentId?: string;
}

/**
 * Request parameters for updating a comment
 */
export interface UpdateCommentRequest {
  commentId: string;
  text: string;
}

/**
 * Request parameters for fetching comments
 */
export interface GetCommentsRequest extends PaginationParams {
  postId: string;
}

/**
 * Request parameters for searching users
 */
export interface SearchUsersRequest extends PaginationParams {
  query: string;
  filters?: {
    isVerified?: boolean;
    location?: string;
  };
}

/**
 * Request parameters for searching posts
 */
export interface SearchPostsRequest extends PaginationParams {
  query: string;
  filters?: {
    mediaType?: 'image' | 'video';
    hasMedia?: boolean;
    tags?: string[];
    dateFrom?: Date;
    dateTo?: Date;
  };
}

/**
 * Request parameters for fetching notifications
 */
export interface GetNotificationsRequest extends PaginationParams {
  unreadOnly?: boolean;
}

/**
 * Request parameters for fetching messages
 */
export interface GetMessagesRequest extends PaginationParams {
  conversationId: string;
}

/**
 * Request parameters for fetching conversations
 */
export interface GetConversationsRequest extends PaginationParams {
  userId: string;
}

/**
 * Request parameters for fetching events
 */
export interface GetEventsRequest extends PaginationParams {
  userId?: string;
  upcoming?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Request parameters for fetching stories
 */
export interface GetStoriesRequest {
  userId?: string;
  includeExpired?: boolean;
}

/**
 * Request parameters for fetching friends
 */
export interface GetFriendsRequest extends PaginationParams {
  userId: string;
  status?: 'accepted' | 'pending' | 'blocked';
}

/**
 * Request parameters for fetching groups
 */
export interface GetGroupsRequest extends PaginationParams {
  userId?: string;
  memberOf?: boolean;
}
