'use client';

import { useEffect, useRef } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase/provider';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc, serverTimestamp } from '@/firebase/client';
import { useToast } from '@/hooks/use-toast';
import { useMessaging } from '@/firebase/use-messaging';
import { usePathname } from 'next/navigation';
import { vibrate } from '@/lib/haptics';
import { playSound } from '../lib/sounds';

/**
 * FCMTokenManager (STABLE VERSION)
 * - Runs ONCE per app session
 * - Prevents listener duplication
 * - Decouples from auth rerenders
 * - Reduces main-thread blocking
 */
export function FCMTokenManager() {
  const { user } = useUser();
  const firestore = useFirestore();
  const messaging = useMessaging();
  const pathname = usePathname();
  const { toast } = useToast();

  // 🔒 Stable refs (prevent rerender rebind issues)
  const toastRef = useRef(toast);
  const pathnameRef = useRef(pathname);
  const userRef = useRef(user);

  // 🧠 Prevent duplicate init + listener stacking
  const initializedRef = useRef(false);
  const unsubscribeRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    toastRef.current = toast;
    pathnameRef.current = pathname;
    userRef.current = user;
  }, [toast, pathname, user]);

  useEffect(() => {
    if (!firestore || !messaging) return;
    if (!user?.uid) return;

    // 🧯 HARD GUARD: only initialize once per session
    if (initializedRef.current) return;
    initializedRef.current = true;

    const registerPushToken = async () => {
      if (typeof window === 'undefined') return;
      if (!('Notification' in window)) return;

      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) return;

      try {
        let permission = Notification.permission;

        if (permission !== 'granted') {
          permission = await Notification.requestPermission();
        }

        if (permission !== 'granted') return;

        const token = await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: await navigator.serviceWorker.ready,
        });

        if (!token) return;

        const storageKey = `fcm_reg_${user.uid}`;
        const lastReg = localStorage.getItem(storageKey);

        // 🧠 throttle token writes (24h)
        const now = Date.now();
        if (lastReg && now - parseInt(lastReg) < 86400000) return;

        const tokenDocRef = doc(
          firestore,
          'users',
          user.uid,
          'deviceTokens',
          token
        );

        setDocumentNonBlocking(
          tokenDocRef,
          {
            userAgent: navigator.userAgent,
            lastActive: serverTimestamp(),
          },
          { merge: true }
        );

        localStorage.setItem(storageKey, now.toString());
      } catch (err) {
        console.warn('[FCM] Token registration failed:', err);
      }
    };

    registerPushToken();

    // 🧠 SINGLE message listener (no stacking)
    const unsubscribe = onMessage(messaging, (payload) => {
      const currentUser = userRef.current;
      const targetUid = payload.data?.targetUid;

      // 🚫 ignore cross-user notifications
      if (targetUid && currentUser && targetUid !== currentUser.uid) {
        return;
      }

      const currentPath = pathnameRef.current;
      const relatedChatId =
        payload.data?.relatedChatId || payload.data?.chatId;

      // 🚫 suppress if already inside chat
      if (relatedChatId && currentPath?.includes(relatedChatId)) {
        return;
      }

      // 🔇 non-blocking UI effects
      queueMicrotask(() => {
        try {
          vibrate([60, 80, 60]);

          playSound('/sounds/message-tone.mp3', { volume: 0.5 });
        } catch {}
      });

      toastRef.current?.({
        title: payload.notification?.title || 'New Message',
        description: payload.notification?.body,
      });
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [user?.uid, firestore, messaging]);

  return null;
}

export default FCMTokenManager;
