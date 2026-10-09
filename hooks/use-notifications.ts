'use client';

import {
  writeBatch,
  doc,
  updateDoc,
} from '@/firebase/client';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase/provider';
import { useNotificationContext } from '@/providers/NotificationProvider';
import { useRouter } from 'next/navigation';
import type { Notification } from '@/lib/types';
import { useCallback } from 'react';

export type WithId<T> = T & { id: string };

export function useNotifications() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  
  const context = useNotificationContext();

  const notifications = context?.notifications || [];
  const isLoading = context?.isLoading ?? true;
  const unreadCount = context?.unreadCount ?? 0;
  const unreadMessengerCount = context?.unreadMessengerCount ?? 0;
  const unreadAIChatCount = context?.unreadAIChatCount ?? 0;
  const unreadFeedCount = context?.unreadFeedCount ?? 0;
  const unreadReelsCount = context?.unreadReelsCount ?? 0;
  const unreadBellCount = context?.unreadBellCount ?? 0;

  const uid = user?.uid;
  const db = firestore;

  const handleNotificationClick = async (notification: WithId<Notification>) => {
    if (!db || !uid) return;

    if (!notification.read) {
      const notifRef = doc(db, 'users', uid, 'notifications', notification.id);
      updateDoc(notifRef, { read: true }).catch(() => {});
    }

    const routes: Record<string, string | null> = {
      chat_message: notification.relatedChatId ? `/chat/${notification.relatedChatId}` : null,
      messenger_message: notification.relatedChatId ? `/messages/${notification.relatedChatId}` : null,
      feed_reaction: `/feed`,
      feed_comment: `/feed`,
      reel_like: `/reels`,
      reel_comment: `/reels`,
      match: `/swipe`,
      system: `/notifications`,
    };

    const route = routes[notification.type];
    if (route) router.push(route);
  };

  /**
   * Clears notifications from a specific sender.
   * Used to sync the Active Bar when entering a chat.
   */
  const markSenderNotificationsAsRead = useCallback(async (senderId: string) => {
    if (!db || !uid || notifications.length === 0) return;

    const unreadFromSender = notifications.filter(
      (n) => !n.read && n.senderId?.toLowerCase() === senderId.toLowerCase()
    );

    if (unreadFromSender.length === 0) return;

    const batch = writeBatch(db);
    unreadFromSender.forEach((n) => {
      const ref = doc(db, 'users', uid, 'notifications', n.id);
      batch.update(ref, { read: true });
    });
    
    await batch.commit().catch(err => console.error("[useNotifications] Failed to clear sender notifications:", err));
  }, [db, uid, notifications]);

  const markBellAsRead = async () => {
    if (!db || !uid || unreadBellCount === 0) return;
    const unread = notifications.filter((n) => !n.read);
    const batch = writeBatch(db);
    unread.forEach((n) => {
      const ref = doc(db, 'users', uid, 'notifications', n.id);
      batch.update(ref, { read: true });
    });
    await batch.commit().catch(() => {});
  };

  const clearAllNotifications = async () => {
    if (!db || !uid || notifications.length === 0) return;
    const batch = writeBatch(db);
    notifications.forEach((n) => {
      const ref = doc(db, 'users', uid, 'notifications', n.id);
      batch.delete(ref);
    });
    await batch.commit().catch(() => {});
  };

  return {
    notifications,
    unreadCount,
    unreadMessengerCount,
    unreadAIChatCount,
    unreadFeedCount,
    unreadReelsCount,
    unreadBellCount,
    isLoading,
    handleNotificationClick,
    markBellAsRead,
    clearAllNotifications,
    markSenderNotificationsAsRead,
  };
}
