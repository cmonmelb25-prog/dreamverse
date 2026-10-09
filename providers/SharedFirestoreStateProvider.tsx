'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase/provider';
import { useCollection, type WithId } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/use-memo-firebase';
import { collection, query, limit, where, orderBy, onSnapshot } from 'firebase/firestore';
import { getSafeDate, cn, isUidPattern } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface SharedFirestoreStateContextType {
  activeGirls: WithId<any>[] | null;
  activeStreams: WithId<any>[] | null;
  notifications: WithId<any>[];
  isLoading: boolean;
}

const SharedFirestoreStateContext = createContext<SharedFirestoreStateContextType | undefined>(undefined);

/**
 * GLOBAL DISCOVERY SOCKET
 * Consolidates Online Residents, Live Streams, and Notifications into a single provider.
 * HARDENED: Added identity scrubbing for notifications to prevent UIDs in alerts.
 */
export function SharedFirestoreStateProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();
  const uid = user?.uid;

  // 1. ACTIVE GIRLS
  const girlsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'aiGirls'), limit(25));
  }, [firestore]);

  const { data: activeGirls, isLoading: isGirlsLoading } = useCollection<any>(girlsQuery, 'aiGirls');

  // 2. ACTIVE STREAMS
  const liveQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'live'), where('status', '==', 'active'), limit(20));
  }, [firestore]);

  const { data: activeStreams, isLoading: isLiveLoading } = useCollection<any>(liveQuery, 'live');

  // 3. NOTIFICATIONS (User-Specific Discovery)
  const [notifications, setNotifications] = useState<WithId<any>[]>([]);
  const [isNotifLoading, setIsNotifLoading] = useState(true);

  const notificationsQuery = useMemoFirebase(() => {
    if (!firestore || !uid || isAuthLoading) return null;
    return query(
      collection(firestore, 'users', uid, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
  }, [firestore, uid, isAuthLoading]);

  useEffect(() => {
    if (!notificationsQuery || !uid) {
      if (!isAuthLoading) {
        setNotifications([]);
        setIsNotifLoading(false);
      }
      return;
    }

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const items = snapshot.docs.map(doc => {
          const data = doc.data();
          const actor = data.actor || {};
          
          // 🛡️ IDENTITY SCRUBBING: Prevent UIDs from leaking as notification names
          let actorName = actor.name || null;
          if (isUidPattern(actorName)) actorName = null;

          return {
            id: doc.id,
            ...data,
            actor: {
              ...actor,
              name: actorName
            },
            createdAt: getSafeDate(data.createdAt || data.timestamp),
            timestamp: getSafeDate(data.timestamp || data.createdAt),
          };
        });
        setNotifications(items);
        setIsNotifLoading(false);
      },
      (err) => {
        if (err.code === 'permission-denied' && !uid) return;

        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: `users/${uid}/notifications`,
          operation: 'list',
        }));
        setIsNotifLoading(false);
      }
    );

    return () => unsubscribe();
  }, [notificationsQuery, uid, isAuthLoading]);

  const value = useMemo(() => ({
    activeGirls,
    activeStreams,
    notifications,
    isLoading: isGirlsLoading || isLiveLoading || isNotifLoading
  }), [activeGirls, activeStreams, notifications, isGirlsLoading, isLiveLoading, isNotifLoading]);

  return (
    <SharedFirestoreStateContext.Provider value={value}>
      {children}
    </SharedFirestoreStateContext.Provider>
  );
}

export function useSharedFirestoreState() {
  const context = useContext(SharedFirestoreStateContext);
  if (context === undefined) {
    throw new Error('useSharedFirestoreState must be used within a SharedFirestoreStateProvider');
  }
  return context;
}
