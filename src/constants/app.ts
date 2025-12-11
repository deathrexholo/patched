// Application constants
export const APP_NAME = 'AmaPlayer' as const;
export const APP_VERSION = '2.1.0' as const;

// Route constants
export const ROUTES = {
  HOME: '/',
  LANDING: '/landing',
  LOGIN: '/login',
  SIGNUP: '/signup',
  DASHBOARD: '/home',
  SEARCH: '/search',
  ADD_POST: '/add-post',
  MESSAGES: '/messages',
  EVENTS: '/events',
  PROFILE: '/profile',
  POST_DETAIL: '/post/:postId',
  STORY_DETAIL: '/story/:storyId',
  STORY_SHARE: '/story-share/:storyId'
} as const;

export type RouteKey = keyof typeof ROUTES;
export type RoutePath = typeof ROUTES[RouteKey];

// API constants
export const POSTS_PER_PAGE: number = 10;
export const STORIES_PER_PAGE: number = 20;
export const COMMENTS_PER_POST: number = 50;

// File upload constants
export const MAX_FILE_SIZE: number = 50 * 1024 * 1024; // 50MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'] as const;

export type AllowedImageType = typeof ALLOWED_IMAGE_TYPES[number];
export type AllowedVideoType = typeof ALLOWED_VIDEO_TYPES[number];
export type AllowedMediaType = AllowedImageType | AllowedVideoType;

// Notification types
export const NOTIFICATION_TYPES = {
  LIKE: 'like',
  COMMENT: 'comment',
  FOLLOW: 'follow',
  STORY_LIKE: 'story_like',
  STORY_VIEW: 'story_view',
  STORY_COMMENT: 'story_comment',
  FRIEND_REQUEST: 'friend_request',
  MESSAGE: 'message'
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

// Theme constants
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto'
} as const;

export type Theme = typeof THEMES[keyof typeof THEMES];

// Language constants
export const SUPPORTED_LANGUAGES = [
  'en', 'hi', 'pa', 'mr', 'bn', 'ta', 'te', 'kn', 'ml', 'gu', 'or', 'as'
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];
