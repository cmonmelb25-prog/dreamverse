'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase/provider';
import { useMemoFirebase } from '@/firebase/use-memo-firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import type { Notification } from '@/lib/types';
import { getSafeDate } from '@/lib/utils';

type WithId<T> = T & { id: string };

interface NotificationContextType {
  notifications: WithId<Notification>[];
  isLoading: boolean;
  unreadCount: number;
  unreadMessengerCount: number;
  unreadAIChatCount: number;
  unreadFeedCount: number;
  unreadReelsCount: number;
  unreadBellCount: number;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const firestore = useFirestore();
  
  const [notifications, setNotifications] = useState<WithId<Notification>[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const uid = user?.uid;

  const notificationsQuery = useMemoFirebase(() => {
    if (!firestore || !uid) return null;
    return query(
      collection(firestore, 'users', uid, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
  }, [firestore, uid]);

  useEffect(() => {
    if (!notificationsQuery || !uid) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const items = snapshot.docs.map(doc => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            ...data,
            createdAt: getSafeDate(data.createdAt || data.timestamp),
            timestamp: getSafeDate(data.timestamp || data.createdAt),
          } as WithId<Notification>;
        });
        setNotifications(items);
        setIsLoading(false);
      },
      async (err) => {
        const permissionError = new FirestorePermissionError({
          path: `users/${uid}/notifications`,
          operation: 'list',
        } satisfies SecurityRuleContext);
        
        errorEmitter.emit('permission-error', permissionError);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [notificationsQuery, uid]);

  const counts = useMemo(() => {
    const unread = notifications.filter(n => !n.read);
    return {
      unreadCount: unread.length,
      // Community/User messages go to Inbox
      unreadMessengerCount: unread.filter(n => n.type === 'messenger_message').length,
      // AI messages go to Chat
      unreadAIChatCount: unread.filter(n => n.type === 'chat_message').length,
      // Feed activity
      unreadFeedCount: unread.filter(n => n.type === 'feed_reaction' || n.type === 'feed_comment').length,
      // Reels activity
      unreadReelsCount: unread.filter(n => n.type === 'reel_like' || n.type === 'reel_comment').length,
      // Global Bell count includes EVERYTHING
      unreadBellCount: unread.length,
    };
  }, [notifications]);

  return (
    <NotificationContext.Provider value={{ notifications, isLoading, ...counts }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  return useContext(NotificationContext);
}
