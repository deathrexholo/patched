import { ReactNode, CSSProperties, MouseEvent } from 'react';
import { Post, User, Comment } from '../models';

// Base component props
export interface BaseComponentProps {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

// Post-related component props
export interface PostItemProps extends BaseComponentProps {
  post: Post;
  currentUser: User | null;
  showMenu: boolean;
  shareSuccess: boolean;
  showComments: boolean;
  isEditing: boolean;
  editText: string;
  onToggleMenu: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
  onMediaClick: () => void;
  onContentClick: () => void;
  onEditChange: (text: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onLike: () => void;
  onToggleComments: () => void;
}

export interface PostHeaderProps {
  post: Post;
  currentUser: User | null;
  showMenu: boolean;
  shareSuccess: boolean;
  onToggleMenu: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
}

export interface PostMediaProps {
  post: Post;
  onMediaClick: () => void;
}

export interface PostContentProps {
  post: Post;
  isEditing: boolean;
  editText: string;
  onEditChange: (text: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onContentClick?: () => void;
  showEditedIndicator: boolean;
}

export interface PostActionsProps {
  post: Post;
  currentUser: User | null;
  userLiked: boolean;
  showComments: boolean;
  onLike: () => void;
  onToggleComments: () => void;
}

// Comment component props
export interface CommentItemProps extends BaseComponentProps {
  comment: Comment;
  currentUser: User | null;
  postId: string;
  onLike: (commentId: string) => void;
  onReply: (commentId: string) => void;
  onEdit?: (commentId: string, text: string) => void;
  onDelete?: (commentId: string) => void;
}

export interface CommentListProps extends BaseComponentProps {
  comments: Comment[];
  currentUser: User | null;
  postId: string;
  loading?: boolean;
  onAddComment: (text: string, parentId?: string) => void;
  onLikeComment: (commentId: string) => void;
  onEditComment?: (commentId: string, text: string) => void;
  onDeleteComment?: (commentId: string) => void;
}

export interface CommentFormProps extends BaseComponentProps {
  postId: string;
  parentCommentId?: string;
  placeholder?: string;
  onSubmit: (text: string) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
}

// Media component props
export interface MediaPreviewProps extends BaseComponentProps {
  url: string;
  type: 'image' | 'video';
  alt?: string;
  onRemove?: () => void;
}

export interface MediaUploadProps extends BaseComponentProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number;
  disabled?: boolean;
}

export interface VideoPlayerProps extends BaseComponentProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  controls?: boolean;
  muted?: boolean;
  loop?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
}

// Form component props
export interface InputProps extends BaseComponentProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  name?: string;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  error?: string;
}

export interface TextAreaProps extends BaseComponentProps {
  name?: string;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  rows?: number;
  maxLength?: number;
  autoFocus?: boolean;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  error?: string;
}

export interface ButtonProps extends BaseComponentProps {
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  icon?: ReactNode;
  fullWidth?: boolean;
}

export interface SelectProps extends BaseComponentProps {
  name?: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  onChange: (value: string) => void;
  error?: string;
}

// Modal component props
export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
}

export interface ConfirmModalProps extends ModalProps {
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  variant?: 'info' | 'warning' | 'danger';
}

// Notification component props
export interface NotificationProps extends BaseComponentProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  onClose: () => void;
}

export interface NotificationListProps extends BaseComponentProps {
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  }>;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  onDismiss: (id: string) => void;
}

// Loading component props
export interface LoadingSpinnerProps extends BaseComponentProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  text?: string;
}

export interface SkeletonProps extends BaseComponentProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular';
  animation?: 'pulse' | 'wave' | 'none';
}

// Error component props
export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export interface ErrorMessageProps extends BaseComponentProps {
  error: Error | string;
  retry?: () => void;
  showDetails?: boolean;
}

// Navigation component props
export interface NavItemProps {
  id: string;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  path: string;
  badge?: number;
  active?: boolean;
  onClick?: () => void;
}

export interface FooterNavProps extends BaseComponentProps {
  items?: NavItemProps[];
}

// Theme and settings component props
export interface ThemeToggleProps extends BaseComponentProps {
  theme?: 'light' | 'dark' | 'auto';
  onChange?: (theme: 'light' | 'dark' | 'auto') => void;
}

export interface LanguageSelectorProps extends BaseComponentProps {
  currentLanguage?: string;
  languages?: Array<{ code: string; name: string; flag?: string }>;
  onChange?: (language: string) => void;
}

// List component props
export interface ListProps<T> extends BaseComponentProps {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T, index: number) => string;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

// Avatar component props
export interface AvatarProps extends BaseComponentProps {
  src?: string | null;
  alt?: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  fallback?: string;
  online?: boolean;
}

// Badge component props
export interface BadgeProps extends BaseComponentProps {
  count?: number;
  max?: number;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  dot?: boolean;
  showZero?: boolean;
}

// Dropdown component props
export interface DropdownProps extends BaseComponentProps {
  trigger: ReactNode;
  items: Array<{
    id: string;
    label: string;
    icon?: ReactNode;
    onClick: () => void;
    disabled?: boolean;
    variant?: 'default' | 'danger';
  }>;
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  closeOnClick?: boolean;
}

// Tab component props
export interface TabProps {
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
  badge?: number;
}

export interface TabsProps extends BaseComponentProps {
  tabs: TabProps[];
  activeTab?: string;
  onChange?: (tabId: string) => void;
  variant?: 'default' | 'pills' | 'underline';
}

// Card component props
export interface CardProps extends BaseComponentProps {
  header?: ReactNode;
  footer?: ReactNode;
  hoverable?: boolean;
  bordered?: boolean;
  loading?: boolean;
}
