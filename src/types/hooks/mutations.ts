import { UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import { Post, Comment, User } from '../models';
import { ApiError } from '../api/responses';
import { UpdatePostData } from '../models/post';

// Base mutation options type
export type BaseMutationOptions<TData, TVariables, TError = ApiError, TContext = unknown> = Omit<
  UseMutationOptions<TData, TError, TVariables, TContext>,
  'mutationFn'
>;

// Post mutation types
export interface CreatePostVariables {
  caption: string;
  mediaFile?: File;
  visibility?: 'public' | 'friends' | 'private';
  location?: string;
  tags?: string[];
}

export interface UpdatePostVariables {
  postId: string;
  updateData: UpdatePostData;
}

export interface DeletePostVariables {
  postId: string;
}

export interface TogglePostLikeVariables {
  postId: string;
  isLiked: boolean;
}

export interface TogglePostShareVariables {
  postId: string;
  shareType: 'friends' | 'feeds' | 'groups';
  targets?: string[];
  message?: string;
  isShared: boolean;
}

// Comment mutation types
export interface AddCommentVariables {
  postId: string;
  comment: {
    text: string;
    parentCommentId?: string;
  };
}

export interface UpdateCommentVariables {
  postId: string;
  commentId: string;
  text: string;
}

export interface DeleteCommentVariables {
  postId: string;
  commentId: string;
}

export interface ToggleCommentLikeVariables {
  postId: string;
  commentId: string;
  isLiked: boolean;
}

// User mutation types
export interface UpdateUserProfileVariables {
  userId: string;
  updates: Partial<User>;
}

export interface UpdateUserSettingsVariables {
  userId: string;
  settings: {
    notifications?: {
      email?: boolean;
      push?: boolean;
      sms?: boolean;
    };
    privacy?: {
      profileVisibility?: 'public' | 'friends' | 'private';
      showOnlineStatus?: boolean;
      allowMessages?: 'everyone' | 'friends' | 'none';
    };
    theme?: 'light' | 'dark' | 'auto';
    language?: string;
  };
}

export interface FollowUserVariables {
  userId: string;
  isFollowing: boolean;
}

// Media upload mutation types
export interface UploadMediaVariables {
  file: File;
  userId: string;
  path?: string;
}

export interface UploadMediaResult {
  url: string;
  type: 'image' | 'video';
  filename: string;
}

// Mutation options types
export type CreatePostMutationOptions = BaseMutationOptions<Post, CreatePostVariables>;
export type UpdatePostMutationOptions = BaseMutationOptions<Post, UpdatePostVariables>;
export type DeletePostMutationOptions = BaseMutationOptions<void, DeletePostVariables>;
export type TogglePostLikeMutationOptions = BaseMutationOptions<
  { postId: string; isLiked: boolean },
  TogglePostLikeVariables
>;
export type TogglePostShareMutationOptions = BaseMutationOptions<
  { postId: string; shareId: string; isShared: boolean },
  TogglePostShareVariables
>;

export type AddCommentMutationOptions = BaseMutationOptions<Comment, AddCommentVariables>;
export type UpdateCommentMutationOptions = BaseMutationOptions<Comment, UpdateCommentVariables>;
export type DeleteCommentMutationOptions = BaseMutationOptions<void, DeleteCommentVariables>;
export type ToggleCommentLikeMutationOptions = BaseMutationOptions<
  { commentId: string; isLiked: boolean },
  ToggleCommentLikeVariables
>;

export type UpdateUserProfileMutationOptions = BaseMutationOptions<User, UpdateUserProfileVariables>;
export type UpdateUserSettingsMutationOptions = BaseMutationOptions<void, UpdateUserSettingsVariables>;
export type FollowUserMutationOptions = BaseMutationOptions<void, FollowUserVariables>;

export type UploadMediaMutationOptions = BaseMutationOptions<UploadMediaResult, UploadMediaVariables>;

// Mutation result types
export type CreatePostMutationResult = UseMutationResult<Post, ApiError, CreatePostVariables>;
export type UpdatePostMutationResult = UseMutationResult<Post, ApiError, UpdatePostVariables>;
export type DeletePostMutationResult = UseMutationResult<void, ApiError, DeletePostVariables>;
export type TogglePostLikeMutationResult = UseMutationResult<
  { postId: string; isLiked: boolean },
  ApiError,
  TogglePostLikeVariables
>;
export type TogglePostShareMutationResult = UseMutationResult<
  { postId: string; shareId: string; isShared: boolean },
  ApiError,
  TogglePostShareVariables
>;

export type AddCommentMutationResult = UseMutationResult<Comment, ApiError, AddCommentVariables>;
export type UpdateCommentMutationResult = UseMutationResult<Comment, ApiError, UpdateCommentVariables>;
export type DeleteCommentMutationResult = UseMutationResult<void, ApiError, DeleteCommentVariables>;
export type ToggleCommentLikeMutationResult = UseMutationResult<
  { commentId: string; isLiked: boolean },
  ApiError,
  ToggleCommentLikeVariables
>;

export type UpdateUserProfileMutationResult = UseMutationResult<User, ApiError, UpdateUserProfileVariables>;
export type UpdateUserSettingsMutationResult = UseMutationResult<void, ApiError, UpdateUserSettingsVariables>;
export type FollowUserMutationResult = UseMutationResult<void, ApiError, FollowUserVariables>;

export type UploadMediaMutationResult = UseMutationResult<UploadMediaResult, ApiError, UploadMediaVariables>;
