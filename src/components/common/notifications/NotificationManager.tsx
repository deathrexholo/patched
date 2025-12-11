import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit, getDocs, deleteDoc, doc, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import NotificationToast from './NotificationToast';

interface NotificationData {
  id: string;
  type: string;
  message: string;
  senderName: string;
  senderPhotoURL: string;
  receiverId: string;
  senderId: string;
  timestamp: any;
  read: boolean;
  pushData: {
    title: string;
    url: string;
  } | null;
  postId: string | null;
  data: Record<string, any>;
}

interface ToastNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  senderName: string;
  url: string;
  timestamp: number;
}

const NotificationManager: React.FC = () => {
  const { currentUser, isGuest } = useAuth();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [toastNotifications, setToastNotifications] = useState<ToastNotification[]>([]);

  const cleanupCorruptedNotifications = async (userId: string) => {
    try {const notificationsRef = collection(db, 'notifications');
      const q = query(notificationsRef, where('receiverId', '==', userId));
      const snapshot = await getDocs(q);
      
      let deletedCount = 0;
      
      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();
        
        const hasObjects = Object.values(data).some(value => 
          typeof value === 'object' && value !== null && 
          !(value as any).toDate &&
          !Array.isArray(value) &&
          typeof (value as any).seconds === 'undefined'
        );
        
        if (hasObjects) {await deleteDoc(doc(db, 'notifications', docSnapshot.id));
          deletedCount++;
        }
      }
      
      if (deletedCount > 0) {} else {}
      
    } catch (error) {
      console.error('❌ Error during notification cleanup:', error);
    }
  };

  useEffect(() => {
    if (!currentUser || isGuest()) return;cleanupCorruptedNotifications(currentUser.uid).then(() => {});

    const q = query(
      collection(db, 'notifications'),
      where('receiverId', '==', currentUser.uid),
      where('read', '==', false),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const newNotifications: NotificationData[] = [];
        
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const rawNotification = change.doc.data();
            
            const sanitizeValue = (value: any): string => {
              if (value === null || value === undefined) return '';
              if (typeof value === 'object') {
                console.warn('🚨 Found object in notification data, converting to string:', value);
                
                if (value && typeof value.text === 'string') {
                  return String(value.text);
                }
                
                console.error('🚨 BLOCKING OBJECT FROM RENDER:', value);
                return '[Object data]';
              }
              return String(value);
            };
            
            const notification: NotificationData = {
              id: change.doc.id,
              type: sanitizeValue(rawNotification.type),
              message: sanitizeValue(rawNotification.message),
              senderName: sanitizeValue(rawNotification.senderName),
              senderPhotoURL: sanitizeValue(rawNotification.senderPhotoURL),
              receiverId: sanitizeValue(rawNotification.receiverId),
              senderId: sanitizeValue(rawNotification.senderId),
              timestamp: rawNotification.timestamp,
              read: Boolean(rawNotification.read),
              pushData: rawNotification.pushData ? {
                title: sanitizeValue(rawNotification.pushData.title),
                url: sanitizeValue(rawNotification.pushData.url) || '/'
              } : null,
              postId: rawNotification.postId ? sanitizeValue(rawNotification.postId) : null,
              data: {}
            };
            
            Object.keys(notification).forEach(key => {
              const value = (notification as any)[key];
              if (typeof value === 'object' && value !== null && key !== 'pushData' && key !== 'timestamp') {
                console.warn(`🚨 Converting object field ${key} to string:`, value);
                (notification as any)[key] = String(value);
              }
            });newNotifications.push(notification);
            
            showToastNotification(notification);
          }
        });

        if (newNotifications.length > 0) {
          setNotifications(prev => [...newNotifications, ...prev]);
        }
      },
      (error) => {if (error.code === 'failed-precondition') {}
      }
    );

    return () => unsubscribe();
  }, [currentUser, isGuest]);

  const showToastNotification = (notification: NotificationData) => {
    const toastId = `toast-${notification.id}-${Date.now()}`;
    
    const toast: ToastNotification = {
      id: toastId,
      type: String(notification.type || ''),
      title: String(notification.pushData?.title || notification.type || 'AmaPlayer'),
      message: String(notification.message || ''),
      senderName: String(notification.senderName || ''),
      url: String(notification.pushData?.url || '/'),
      timestamp: Date.now()
    };

    setToastNotifications(prev => [...prev, toast]);
  };

  const removeToastNotification = (toastId: string) => {
    setToastNotifications(prev => prev.filter(toast => toast.id !== toastId));
  };

  return (
    <div className="notification-manager">
      {toastNotifications.map((toast, index) => (
        <div key={toast.id} style={{ zIndex: 10000 - index }}>
          <NotificationToast
            notification={toast}
            onClose={() => removeToastNotification(toast.id)}
            autoClose={true}
          />
        </div>
      ))}
    </div>
  );
};

export default NotificationManager;
