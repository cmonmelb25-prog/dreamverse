'use client';

import { useEffect, useRef } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { useFirebase } from '@/firebase/provider';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc, serverTimestamp } from '@/firebase/client';

/**
 * Manages global user presence and status.
 * HARDENED: Implements 120s throttling and cross-reload persistence to prevent 
 * Firestore write stream errors (PING_FAILED) and main-thread violations.
 */
export function PresenceManager() {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const lastUpdateRef = useRef<number>(0);
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!firestore || !user?.uid) return;

    // Reset throttle if user changes
    if (lastUserIdRef.current !== user.uid) {
      lastUpdateRef.current = 0;
      lastUserIdRef.current = user.uid;
    }

    const userRef = doc(firestore, 'users', user.uid);

    const updateStatus = (status: 'online' | 'offline') => {
      const now = Date.now();
      
      // PERSISTENCE LOCK: Use sessionStorage to prevent spamming Firestore during hot reloads
      const storageKey = `presence_last_beat_${user.uid}`;
      const lastBeat = parseInt(sessionStorage.getItem(storageKey) || '0');

      // 🛡️ PERFORMANCE OPTIMIZATION: Only heartbeat once every 120 seconds for 'online' status
      if (status === 'online' && (now - lastUpdateRef.current < 120000) && (now - lastBeat < 120000)) {
        return;
      }
      
      lastUpdateRef.current = now;
      sessionStorage.setItem(storageKey, now.toString());

      setDocumentNonBlocking(userRef, {
        status,
        lastSeen: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    };

    let visibilityTimeout: NodeJS.Timeout;

    const handleVisibilityChange = () => {
      clearTimeout(visibilityTimeout);
      // 🛡️ DEBOUNCED VISIBILITY CHANGE: Prevents violations during rapid tab switching
      visibilityTimeout = setTimeout(() => {
        updateStatus(document.visibilityState === 'hidden' ? 'offline' : 'online');
      }, 10000);
    };

    // Initial heartbeat after a short delay to allow hydration to settle
    const initialDelay = setTimeout(() => updateStatus('online'), 8000);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', () => updateStatus('offline'));

    return () => {
      clearTimeout(initialDelay);
      clearTimeout(visibilityTimeout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', () => updateStatus('offline'));
    };
  }, [firestore, user?.uid]);

  return null;
}
