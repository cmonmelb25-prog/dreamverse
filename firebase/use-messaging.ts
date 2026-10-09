'use client';

import { useState, useEffect } from 'react';
import { getMessaging, isSupported, type Messaging } from 'firebase/messaging';
import { useFirebaseApp } from '@/firebase/provider';

/**
 * A client-side hook to safely initialize and access the Firebase Messaging instance.
 * It ensures that getMessaging() is only called in supported browser environments.
 *
 * @returns {Messaging | null} The Firebase Messaging instance, or null if not supported or not yet initialized.
 */
export function useMessaging(): Messaging | null {
  const [messaging, setMessaging] = useState<Messaging | null>(null);
  const firebaseApp = useFirebaseApp();

  useEffect(() => {
    async function initMessaging() {
      // isSupported() is an async function that checks for service worker and window support.
      if (typeof window !== 'undefined') {
        const supported = await isSupported();
        if (supported) {
          try {
            // Use the app instance provided by the FirebaseProvider
            setMessaging(getMessaging(firebaseApp));
          } catch (err) {
            console.warn('Firebase Messaging initialization failed:', err);
          }
        } else {
          console.log('Firebase Messaging is not supported in this browser.');
        }
      }
    }

    initMessaging();
  }, [firebaseApp]);

  return messaging;
}
