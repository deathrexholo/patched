/**
 * Type definitions for Zustand App Store
 */

import { Post, User } from '../models';

// Posts Store Types
export interface PostsState {
  posts: Post[];
  loading: boolean;
  hasMore: boolean;
  lastDoc: any | null;
  error: string | null;
}

export interface PostsActions {
  setPosts: (posts: Post[]) => void;
  addPosts: (newPosts: Post[]) => void;
  addPost: (post: Post) => void;
  updatePost: (postId: string, updates: Partial<Post>) => void;
  removePost: (postId: string) => void;
  setLoading: (loading: boolean) => void;
  setHasMore: (hasMore: boolean) => void;
  setLastDoc: (lastDoc: any | null) => void;
  setError: (error: string | null) => void;
  getPostById: (postId: string) => Post | undefined;
  getPostsByUser: (userId: string) => Post[];
  reset: () => void;
}

export type PostsStore = PostsState & PostsActions;

// UI Store Types
export interface ModalStates {
  profile: boolean;
  settings: boolean;
  imageViewer: boolean;
  videoPlayer: boolean;
  [key: string]: boolean;
}

export interface FormStates {
  newComment: Record<string, string>;
  postText: string;
  postViolation: string | null;
  showPostWarning: boolean;
}

export interface UIState {
  showComments: Record<string, boolean>;
  showPostMenus: Record<string, boolean>;
  selectedMedia: any | null;
  mediaPreview: string | null;
  uploading: boolean;
  uploadProgress: number;
  modals: ModalStates;
  forms: FormStates;
}

export interface UIActions {
  toggleComments: (postId: string) => void;
  togglePostMenu: (postId: string) => void;
  closeAllMenus: () => void;
  setSelectedMedia: (media: any | null) => void;
  setMediaPreview: (preview: string | null) => void;
  setUploading: (uploading: boolean) => void;
  setUploadProgress: (progress: number) => void;
  openModal: (modalName: string) => void;
  closeModal: (modalName: string) => void;
  closeAllModals: () => void;
  setNewComment: (postId: string, comment: string) => void;
  setPostText: (text: string) => void;
  setPostViolation: (violation: string | null) => void;
  setShowPostWarning: (show: boolean) => void;
  resetPostForm: () => void;
}

export type UIStore = UIState & UIActions;

// User Store Types
export interface UserState {
  users: Map<string, User>;
  currentUser: User | null;
  loading: boolean;
}

export interface UserActions {
  setCurrentUser: (user: User | null) => void;
  addUser: (user: User) => void;
  addUsers: (users: User[]) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  getUser: (userId: string) => User | undefined;
  getUsersArray: () => User[];
  setLoading: (loading: boolean) => void;
  clearUserCache: () => void;
}

export type UserStore = UserState & UserActions;

// Settings Store Types
export interface NotificationSettings {
  enabled: boolean;
  likes: boolean;
  comments: boolean;
  follows: boolean;
}

export interface PerformanceSettings {
  enableAnimations: boolean;
  enableAutoplay: boolean;
  imageQuality: 'low' | 'medium' | 'high';
  cacheSize: number;
}

export interface SettingsState {
  theme: 'light' | 'dark';
  language: string;
  notifications: NotificationSettings;
  performance: PerformanceSettings;
}

export interface SettingsActions {
  setTheme: (theme: 'light' | 'dark') => void;
  setLanguage: (language: string) => void;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  updatePerformanceSettings: (settings: Partial<PerformanceSettings>) => void;
}

export type SettingsStore = SettingsState & SettingsActions;

// Legacy Performance Store Types
export interface LegacyPerformanceMetrics {
  pageLoadTime: number;
  renderTime: number;
  apiResponseTimes: number[];
  memoryUsage: number;
  cacheHitRate: number;
}

export interface LegacyPerformanceState {
  metrics: LegacyPerformanceMetrics;
}

export interface LegacyPerformanceActions {
  recordPageLoad: (time: number) => void;
  recordRenderTime: (time: number) => void;
  recordApiResponse: (time: number) => void;
  updateMemoryUsage: () => void;
  getAverageApiTime: () => number;
}

export type LegacyPerformanceStore = LegacyPerformanceState & LegacyPerformanceActions;

// Combined App State Type
export interface AppState {
  posts: PostsStore;
  ui: UIStore;
  user: UserStore;
  settings: SettingsStore;
  legacyPerformance: LegacyPerformanceStore;
}
