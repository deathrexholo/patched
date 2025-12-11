import { ReactNode } from 'react';
import { User, Story, Post, Event, Message, Group, Friend } from '../models';
import { BaseComponentProps } from './common';

// Auth feature component props
export interface LoginProps extends BaseComponentProps {
  onSuccess?: () => void;
  redirectTo?: string;
}

export interface SignupProps extends BaseComponentProps {
  onSuccess?: () => void;
  redirectTo?: string;
}

export interface PrivateRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

export interface AuthFormProps extends BaseComponentProps {
  type: 'login' | 'signup';
  onSubmit: (email: string, password: string, displayName?: string) => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

// Profile feature component props
export interface ProfileProps extends BaseComponentProps {
  userId?: string;
}

export interface ProfileHeaderProps extends BaseComponentProps {
  user: User;
  isOwnProfile: boolean;
  isFollowing?: boolean;
  onFollow?: () => void;
  onUnfollow?: () => void;
  onEditProfile?: () => void;
}

export interface ProfileStatsProps extends BaseComponentProps {
  postsCount: number;
  followersCount: number;
  followingCount: number;
  onPostsClick?: () => void;
  onFollowersClick?: () => void;
  onFollowingClick?: () => void;
}

export interface ProfileBioProps extends BaseComponentProps {
  bio?: string;
  location?: string;
  website?: string;
  interests?: string[];
  isEditing?: boolean;
  onEdit?: () => void;
  onSave?: (data: { bio?: string; location?: string; website?: string }) => void;
  onCancel?: () => void;
}

export interface ProfilePostsProps extends BaseComponentProps {
  userId: string;
  posts: Post[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onPostClick?: (postId: string) => void;
}

export interface EditProfileProps extends BaseComponentProps {
  user: User;
  onSave: (updates: Partial<User>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  error?: string | null;
}

// Stories feature component props
export interface StoriesContainerProps extends BaseComponentProps {
  stories: Story[];
  currentUser: User | null;
  onStoryClick: (storyId: string) => void;
  onAddStory?: () => void;
}

export interface StoryViewerProps extends BaseComponentProps {
  stories: Story[];
  initialIndex?: number;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

export interface StoryDetailProps extends BaseComponentProps {
  storyId: string;
}

export interface StoryUploadProps extends BaseComponentProps {
  onUpload: (file: File, caption?: string) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  error?: string | null;
}

export interface StoryProgressProps extends BaseComponentProps {
  duration: number;
  isPaused: boolean;
  onComplete: () => void;
}

export interface StorySharePageProps extends BaseComponentProps {
  storyId: string;
}

export interface HighlightsManagerProps extends BaseComponentProps {
  userId: string;
  highlights: Array<{
    id: string;
    title: string;
    coverImage: string;
    stories: Story[];
  }>;
  onCreateHighlight?: (title: string, storyIds: string[]) => Promise<void>;
  onEditHighlight?: (highlightId: string, title: string) => Promise<void>;
  onDeleteHighlight?: (highlightId: string) => Promise<void>;
}

// Friends feature component props
export interface FriendsListProps extends BaseComponentProps {
  friends: Friend[];
  loading?: boolean;
  error?: string | null;
  onFriendClick?: (friendId: string) => void;
  onRemoveFriend?: (friendId: string) => void;
}

export interface FriendRequestsProps extends BaseComponentProps {
  requests: Array<{
    id: string;
    user: User;
    timestamp: Date;
  }>;
  loading?: boolean;
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
}

export interface FriendSuggestionsProps extends BaseComponentProps {
  suggestions: User[];
  loading?: boolean;
  onAddFriend: (userId: string) => void;
  onDismiss?: (userId: string) => void;
}

// Groups feature component props
export interface GroupsListProps extends BaseComponentProps {
  groups: Group[];
  loading?: boolean;
  error?: string | null;
  onGroupClick?: (groupId: string) => void;
  onCreateGroup?: () => void;
}

export interface GroupDetailProps extends BaseComponentProps {
  groupId: string;
}

export interface GroupHeaderProps extends BaseComponentProps {
  group: Group;
  isMember: boolean;
  isAdmin: boolean;
  onJoin?: () => void;
  onLeave?: () => void;
  onEdit?: () => void;
}

export interface GroupMembersProps extends BaseComponentProps {
  groupId: string;
  members: User[];
  admins: string[];
  isAdmin: boolean;
  onRemoveMember?: (userId: string) => void;
  onMakeAdmin?: (userId: string) => void;
  onInviteMembers?: () => void;
}

export interface CreateGroupProps extends BaseComponentProps {
  onCreate: (groupData: Partial<Group>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  error?: string | null;
}

// Events feature component props
export interface EventsListProps extends BaseComponentProps {
  events: Event[];
  loading?: boolean;
  error?: string | null;
  onEventClick?: (eventId: string) => void;
  onCreateEvent?: () => void;
}

export interface EventDetailProps extends BaseComponentProps {
  eventId: string;
}

export interface EventHeaderProps extends BaseComponentProps {
  event: Event;
  isAttending: boolean;
  isOrganizer: boolean;
  onAttend?: () => void;
  onUnattend?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export interface EventAttendeesProps extends BaseComponentProps {
  eventId: string;
  attendees: User[];
  maxDisplay?: number;
  onViewAll?: () => void;
}

export interface CreateEventProps extends BaseComponentProps {
  onCreate: (eventData: Partial<Event>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  error?: string | null;
}

// Messages feature component props
export interface MessagesListProps extends BaseComponentProps {
  conversations: Array<{
    id: string;
    user: User;
    lastMessage: Message;
    unreadCount: number;
  }>;
  loading?: boolean;
  onConversationClick: (conversationId: string) => void;
}

export interface MessageThreadProps extends BaseComponentProps {
  conversationId: string;
  messages: Message[];
  currentUser: User;
  otherUser: User;
  loading?: boolean;
  onSendMessage: (text: string, attachments?: File[]) => Promise<void>;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export interface MessageItemProps extends BaseComponentProps {
  message: Message;
  isOwnMessage: boolean;
  showAvatar?: boolean;
  showTimestamp?: boolean;
}

export interface MessageInputProps extends BaseComponentProps {
  onSend: (text: string, attachments?: File[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  allowAttachments?: boolean;
}

// Search feature component props
export interface SearchBarProps extends BaseComponentProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  loading?: boolean;
}

export interface SearchResultsProps extends BaseComponentProps {
  query: string;
  results: {
    users: User[];
    posts: Post[];
    groups: Group[];
    events: Event[];
  };
  loading?: boolean;
  error?: string | null;
  onUserClick?: (userId: string) => void;
  onPostClick?: (postId: string) => void;
  onGroupClick?: (groupId: string) => void;
  onEventClick?: (eventId: string) => void;
}

export interface SearchFiltersProps extends BaseComponentProps {
  activeFilters: {
    type?: 'all' | 'users' | 'posts' | 'groups' | 'events';
    dateRange?: { start: Date; end: Date };
    sortBy?: 'relevance' | 'recent' | 'popular';
  };
  onFilterChange: (filters: SearchFiltersProps['activeFilters']) => void;
}

// Sharing feature component props
export interface ShareModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
  currentUser: User;
  onShare: (shareType: 'friends' | 'feeds' | 'groups', targets?: string[], message?: string) => Promise<void>;
}

export interface ShareOptionsProps extends BaseComponentProps {
  onShareToFriends: (friendIds: string[], message?: string) => void;
  onShareToFeed: (message?: string) => void;
  onShareToGroups: (groupIds: string[], message?: string) => void;
  onCopyLink: () => void;
}

// Notifications feature component props
export interface NotificationItemProps extends BaseComponentProps {
  notification: {
    id: string;
    type: 'like' | 'comment' | 'share' | 'follow' | 'mention';
    user: User;
    targetId: string;
    message: string;
    read: boolean;
    createdAt: Date;
  };
  onClick: () => void;
  onMarkAsRead?: () => void;
  onDelete?: () => void;
}

export interface NotificationCenterProps extends BaseComponentProps {
  notifications: NotificationItemProps['notification'][];
  unreadCount: number;
  loading?: boolean;
  onNotificationClick: (notificationId: string) => void;
  onMarkAllAsRead?: () => void;
  onClearAll?: () => void;
}
