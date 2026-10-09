'use client';

import { useFirestore } from '@/firebase/provider';
import { useUser } from '@/firebase/auth/use-user';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/use-memo-firebase';
import { collection, query, orderBy, limit } from '@/firebase/client';
import type { CallLog } from '@/lib/types';

/**
 * Hook to retrieve the user's global call history.
 * UPDATED: generalized for all call types.
 */
export function useCallLog() {
  const { user } = useUser();
  const firestore = useFirestore();

  const callsQuery = useMemoFirebase(() => {
    if (!user?.uid || !firestore) return null;

    return query(
      collection(firestore, 'users', user.uid, 'calls'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
  }, [user?.uid, firestore]);

  const { data: calls, isLoading, error } = useCollection<CallLog>(
    callsQuery,
    user?.uid ? `users/${user.uid}/calls` : null,
    user
  );

  return { calls, isLoading, error };
}
