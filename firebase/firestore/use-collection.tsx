'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';

import { errorEmitter } from '@/firebase/error-emitter';
import {
  FirestorePermissionError,
  type SecurityRuleContext,
} from '@/firebase/errors';

/** Utility type to add an 'id' field */
export type WithId<T> = T & { id: string };

export interface UseCollectionResult<T> {
  data: WithId<T>[] | null;
  isLoading: boolean;
  error: FirestoreError | Error | null;
}

/**
 * Firestore collection listener
 * HARDENED: Strict synchronization latch to prevent 400 Bad Request errors during HMR.
 * OPTIMIZED: Dependency lock on UID string to prevent object-reference thrashing.
 */
export function useCollection<T = any>(
  targetRefOrQuery:
    | (CollectionReference<DocumentData> | Query<DocumentData>)
    | null
    | undefined,
  contextPath: string | null,
  user?: { uid?: string } | null
): UseCollectionResult<T> {
  const [data, setData] = useState<WithId<T>[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  // 🛡️ IDENTITY LOCK
  const stableUid = useMemo(() => user?.uid || null, [user?.uid]);

  useEffect(() => {
    // 🛡️ LATCH: Block listeners if auth state is in transition
    if (!targetRefOrQuery || (contextPath?.includes('{userId}') && !stableUid)) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      targetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: WithId<T>[] = [];
        snapshot.docs.forEach((doc) => {
          results.push({
            ...(doc.data() as T),
            id: doc.id,
          });
        });
        setData(results);
        setIsLoading(false);
        setError(null);
      },
      (err: FirestoreError) => {
        // Prevent crashing on expected listener cancellation during auth shift
        if (err.code === 'permission-denied' && !stableUid) return;

        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path: contextPath || 'unknown/collection',
        } satisfies SecurityRuleContext);

        setError(contextualError);
        setData(null);
        setIsLoading(false);
        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return () => unsubscribe();
  }, [targetRefOrQuery, contextPath, stableUid]); 

  return {
    data,
    isLoading,
    error,
  };
}