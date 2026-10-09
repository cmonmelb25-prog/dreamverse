'use client';

import { useCallback } from 'react';
import { useMessaging } from '@/firebase/use-messaging';
import { getToken } from 'firebase/messaging';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase/provider';
import { doc, serverTimestamp } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

/**
 * A hook to explicitly request FCM permission and register the token.
 * This should be triggered by a user gesture, e.g., a button click.
 */
export function useRequestFCM() {
  const messaging = useMessaging();
  const { user } = useUser();
  const firestore = useFirestore();

  const requestPermission = useCallback(async () => {
    if (!messaging || !firestore || !user?.uid) {
      console.debug('[FCM] Pre-conditions not met for requesting permission.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        console.log('[FCM] Notification permission granted.');

        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
          console.error('[FCM] VAPID key is not configured.');
          return;
        }

        const registration = await navigator.serviceWorker.ready;
        const token = await getToken(messaging, { 
            vapidKey, 
            serviceWorkerRegistration: registration
        });

        if (token) {
          console.log('[FCM] Token acquired:', token);
          const tokenDocRef = doc(firestore, 'users', user.uid, 'deviceTokens', token);
          await setDocumentNonBlocking(tokenDocRef, {
              userAgent: navigator.userAgent,
              lastActive: serverTimestamp(),
          }, { merge: true });
          console.log('[FCM] Token stored in Firestore.');
        } else {
          console.log('[FCM] No registration token found.');
        }
      } else {
        console.log('[FCM] Unable to get permission to notify.');
      }
    } catch (error) {
      console.error('[FCM] An error occurred while requesting permission or getting token: ', error);
    }
  }, [messaging, firestore, user?.uid]);

  return { requestPermission };
}
