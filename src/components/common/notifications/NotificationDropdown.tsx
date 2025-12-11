import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Heart, MessageCircle, UserPlus, Eye, CheckCheck, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../lib/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, orderBy, limit } from 'firebase/firestore';
import notificationManagementService from '../../../services/api/notificationManagementService';
import './NotificationDropdown.css';

interface Notification {
  id: string;
  type: string;
  message: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  postId?: string;
  storyId?: string;
  url?: string;
  read: boolean;
  createdAt: any;
}

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  triggerButtonRef?: React.RefObject<HTMLButtonElement>;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
  triggerButtonRef
}) => {
  const navigate = useNavigate();
  const { currentUser, isGuest } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  useEffect(() => {
    if (!currentUser || isGuest()) {
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | null = null;

    try {
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('receiverId', '==', currentUser.uid),
        limit(isExpanded ? 100 : 10)
      );

      unsubscribe = onSnapshot(q, (snapshot) => {
        const notificationsList: Notification[] = [];
        snapshot.forEach((doc) => {
          notificationsList.push({ id: doc.id, ...doc.data() } as Notification);
        });
        
        // Sort by timestamp (newest first) in memory instead of using orderBy
        notificationsList.sort((a, b) => {
          const timeA = a.createdAt?.toDate?.() || new Date(0);
          const timeB = b.createdAt?.toDate?.() || new Date(0);
          return timeB.getTime() - timeA.getTime();
        });
        
        setNotifications(notificationsList);
        setLoading(false);
      }, (error) => {
        console.error('Error fetching notifications:', error);
        setLoading(false);
      });

    } catch (error) {
      console.error('Error setting up notifications listener:', error);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser, isGuest, isExpanded]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerButtonRef?.current &&
        !triggerButtonRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, triggerButtonRef]);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Mark as read
      if (!notification.read) {
        await markAsRead(notification.id);
      }

      // Close dropdown
      onClose();

      // Navigate based on notification type
      if (notification.type === 'like' || notification.type === 'comment') {
        if (notification.postId) {
          navigate(`/post/${notification.postId}`);
        } else if (notification.url) {
          const url = notification.url.startsWith('/') ? notification.url : `/${notification.url}`;
          navigate(url);
        }
      } else if (notification.type === 'story_like' || notification.type === 'story_view' || notification.type === 'story_comment') {
        if (notification.storyId) {
          navigate(`/story/${notification.storyId}`);
        } else if (notification.url) {
          const url = notification.url.startsWith('/') ? notification.url : `/${notification.url}`;
          navigate(url);
        }
      } else if (notification.type === 'follow') {
        if (notification.senderId) {
          navigate(`/profile/${notification.senderId}`);
        }
      } else if (notification.type === 'friend_request') {
        navigate('/messages');
      } else if (
        notification.type === 'connection_request' ||
        notification.type === 'connection_accepted' ||
        notification.type === 'connection_rejected'
      ) {
        navigate('/messages');
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  // Get notification icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart size={16} className="notification-icon like" />;
      case 'comment':
        return <MessageCircle size={16} className="notification-icon comment" />;
      case 'follow':
      case 'friend_request':
      case 'connection_request':
      case 'connection_accepted':
      case 'connection_rejected':
        return <UserPlus size={16} className="notification-icon follow" />;
      case 'story_view':
      case 'story_like':
      case 'story_comment':
        return <Eye size={16} className="notification-icon story" />;
      default:
        return <Bell size={16} className="notification-icon default" />;
    }
  };

  // Format time
  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      await notificationManagementService.markAllAsRead(currentUser.uid);
      // Notifications will auto-update via the onSnapshot listener
    } catch (error) {
      console.error('Error marking all as read:', error);
      alert('Failed to mark all notifications as read');
    } finally {
      setLoading(false);
    }
  };

  // Delete all read notifications
  const handleDeleteAllRead = async () => {
    if (!currentUser) return;

    const readCount = notifications.filter(n => n.read).length;
    if (readCount === 0) {
      alert('No read notifications to delete');
      return;
    }

    if (window.confirm(`Delete ${readCount} read notification${readCount > 1 ? 's' : ''}?`)) {
      try {
        setLoading(true);
        await notificationManagementService.deleteAllRead(currentUser.uid);
        // Notifications will auto-update via the onSnapshot listener
      } catch (error) {
        console.error('Error deleting read notifications:', error);
        alert('Failed to delete read notifications');
      } finally {
        setLoading(false);
      }
    }
  };

  if (!isOpen) return null;return (
    <div className={`notification-dropdown ${isExpanded ? 'expanded' : ''}`} ref={dropdownRef}>
      <div className="notification-header">
        <h3>Notifications</h3>
        <div className="header-actions">
          {notifications.length > 0 && (
            <>
              <button
                className="action-btn"
                onClick={handleMarkAllAsRead}
                disabled={loading || notifications.every(n => n.read)}
                title="Mark all as read"
              >
                <CheckCheck size={16} />
              </button>
              <button
                className="action-btn"
                onClick={handleDeleteAllRead}
                disabled={loading || notifications.filter(n => n.read).length === 0}
                title="Delete read notifications"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
      </div>
      
      <div className="notification-list">
        {loading ? (
          <div className="notification-loading">
            <div className="loading-spinner"></div>
            <p>Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="notification-empty">
            <Bell size={32} className="empty-icon" />
            <p>No notifications yet</p>
            <span>You'll see notifications here when someone interacts with your content</span>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-item ${!notification.read ? 'unread' : ''}`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="notification-icon-container">
                {getNotificationIcon(notification.type)}
              </div>
              
              <div className="notification-content">
                <div className="notification-message">
                  {notification.message}
                </div>
                <div className="notification-time">
                  {formatTime(notification.createdAt)}
                </div>
              </div>
              
              {!notification.read && (
                <div className="unread-indicator"></div>
              )}
            </div>
          ))
        )}
      </div>
      
      {notifications.length > 0 && (
        <div className="notification-footer">
          <button
            className="view-all-btn"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Show Less' : 'View All'}
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;