import { ReactNode } from 'react';
import { User, Post, Event, Message, Story } from '../models';
import { BaseComponentProps } from './common';

// Home page component props
export interface HomeProps extends BaseComponentProps {
  // Home page typically doesn't need props as it manages its own state
}

export interface PostsFeedProps extends BaseComponentProps {
  posts: Post[];
  currentUser: User | null;
  loading?: boolean;
  hasMore?: boolean;
  error?: string | null;
  onLoadMore?: () => void;
  onRefresh?: () => void;
  onPostClick?: (postId: string) => void;
}

export interface CreatePostFormProps extends BaseComponentProps {
  currentUser: User;
  onSubmit: (data: { text: string; mediaFile?: File }) => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

// Add Post page component props
export interface AddPostProps extends BaseComponentProps {
  // Add post page typically doesn't need props
}

export interface PostEditorProps extends BaseComponentProps {
  initialCaption?: string;
  initialMedia?: { url: string; type: 'image' | 'video' };
  onSave: (caption: string, mediaFile?: File) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  error?: string | null;
}

// Post Detail page component props
export interface PostDetailProps extends BaseComponentProps {
  postId?: string;
}

export interface PostDetailViewProps extends BaseComponentProps {
  post: Post;
  currentUser: User | null;
  comments: Comment[];
  loading?: boolean;
  onLike: () => void;
  onComment: (text: string) => void;
  onShare: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

// Feed page component props
export interface FeedPageProps extends BaseComponentProps {
  filter?: 'all' | 'following' | 'trending';
}

// Search page component props
export interface SearchProps extends BaseComponentProps {
  initialQuery?: string;
}

export interface SearchPageProps extends BaseComponentProps {
  query: string;
  results: {
    users: User[];
    posts: Post[];
    groups: any[];
    events: Event[];
  };
  loading?: boolean;
  error?: string | null;
  onSearch: (query: string) => void;
}

// Messages page component props
export interface MessagesProps extends BaseComponentProps {
  conversationId?: string;
}

export interface MessagesPageProps extends BaseComponentProps {
  conversations: Array<{
    id: string;
    user: User;
    lastMessage: Message;
    unreadCount: number;
  }>;
  activeConversation?: string;
  loading?: boolean;
  onConversationSelect: (conversationId: string) => void;
  onNewConversation?: () => void;
}

// Events page component props
export interface EventsProps extends BaseComponentProps {
  filter?: 'upcoming' | 'past' | 'attending';
}

export interface EventsPageProps extends BaseComponentProps {
  events: Event[];
  loading?: boolean;
  error?: string | null;
  filter: 'upcoming' | 'past' | 'attending';
  onFilterChange: (filter: 'upcoming' | 'past' | 'attending') => void;
  onEventClick: (eventId: string) => void;
  onCreateEvent?: () => void;
}

// Profile page component props
export interface ProfilePageProps extends BaseComponentProps {
  userId?: string;
}

export interface ProfileViewProps extends BaseComponentProps {
  user: User;
  posts: Post[];
  isOwnProfile: boolean;
  isFollowing?: boolean;
  loading?: boolean;
  onFollow?: () => void;
  onUnfollow?: () => void;
  onEditProfile?: () => void;
  onPostClick?: (postId: string) => void;
}

// Landing page component props
export interface LandingPageProps extends BaseComponentProps {
  // Landing page typically doesn't need props
}

export interface LandingHeroProps extends BaseComponentProps {
  title: string;
  subtitle: string;
  ctaText: string;
  onCtaClick: () => void;
}

export interface LandingFeaturesProps extends BaseComponentProps {
  features: Array<{
    id: string;
    icon: ReactNode;
    title: string;
    description: string;
  }>;
}

// Verification page component props
export interface VerificationPageProps extends BaseComponentProps {
  email?: string;
}

export interface EmailVerificationProps extends BaseComponentProps {
  email: string;
  onResendEmail: () => Promise<void>;
  onChangeEmail: () => void;
  loading?: boolean;
  error?: string | null;
}

// Settings page component props
export interface SettingsPageProps extends BaseComponentProps {
  user: User;
}

export interface SettingsSectionProps extends BaseComponentProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export interface AccountSettingsProps extends BaseComponentProps {
  user: User;
  onUpdateEmail: (email: string) => Promise<void>;
  onUpdatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  onDeleteAccount: () => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

export interface PrivacySettingsProps extends BaseComponentProps {
  settings: {
    profileVisibility: 'public' | 'friends' | 'private';
    showOnlineStatus: boolean;
    allowMessages: 'everyone' | 'friends' | 'none';
  };
  onUpdate: (settings: PrivacySettingsProps['settings']) => Promise<void>;
  loading?: boolean;
}

export interface NotificationSettingsProps extends BaseComponentProps {
  settings: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  onUpdate: (settings: NotificationSettingsProps['settings']) => Promise<void>;
  loading?: boolean;
}

// Error pages component props
export interface NotFoundPageProps extends BaseComponentProps {
  message?: string;
  onGoHome?: () => void;
}

export interface ErrorPageProps extends BaseComponentProps {
  error: Error | string;
  onRetry?: () => void;
  onGoHome?: () => void;
}

// Stories page component props (if separate from home)
export interface StoriesPageProps extends BaseComponentProps {
  stories: Story[];
  currentUser: User | null;
  loading?: boolean;
  onStoryClick: (storyId: string) => void;
  onAddStory?: () => void;
}

// Groups page component props
export interface GroupsPageProps extends BaseComponentProps {
  groups: any[];
  loading?: boolean;
  error?: string | null;
  onGroupClick: (groupId: string) => void;
  onCreateGroup?: () => void;
}

// Notifications page component props
export interface NotificationsPageProps extends BaseComponentProps {
  notifications: Array<{
    id: string;
    type: 'like' | 'comment' | 'share' | 'follow' | 'mention';
    user: User;
    targetId: string;
    message: string;
    read: boolean;
    createdAt: Date;
  }>;
  unreadCount: number;
  loading?: boolean;
  onNotificationClick: (notificationId: string) => void;
  onMarkAllAsRead?: () => void;
  onClearAll?: () => void;
}

// Route props for pages with URL parameters
export interface RouteParams {
  id?: string;
  userId?: string;
  postId?: string;
  eventId?: string;
  groupId?: string;
  conversationId?: string;
  storyId?: string;
}

// Location state for navigation
export interface LocationState {
  from?: string;
  message?: string;
  data?: any;
}
