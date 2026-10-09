'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { AIGirl, Message } from '@/lib/types';
import { useFirestore } from '@/firebase/provider';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useUser } from '@/firebase/auth/use-user';
import { collection, query, limit, doc, onSnapshot } from 'firebase/firestore';
import { normalizeRelationship } from '@/lib/normalizeRelationship';
import { useMemoFirebase } from '@/firebase/use-memo-firebase';
import { initialState, initialStats, type CharacterState } from '@/lib/character-state-defaults';
import { getSafeDate } from '@/lib/utils';

/**
 * @fileOverview Hardened hook for managing Resident relationship and chat state.
 * FIXED: Enforces lowercase paths and manual client sorting to ensure history is restored.
 */
export function useCharacterState(character: AIGirl) {
  const { user } = useUser();
  const firestore = useFirestore();

  const [state, setState] = useState<CharacterState>(initialState);
  const [isInitialized, setIsInitialized] = useState(false);

  // 1. NORMALIZE IDENTITY: Enforce lowercase for history consistency
  const girlId = useMemo(() => character.id.toLowerCase(), [character.id]);
  const chatId = useMemo(() => user?.uid ? `${girlId}_${user.uid}` : null, [girlId, user?.uid]);

  // 2. RELATIONSHIP DOC (Authorized Path)
  const relationshipRef = useMemoFirebase(
    () =>
      user?.uid && girlId && firestore
        ? doc(firestore, 'users', user.uid, 'relationships', girlId)
        : null,
    [user?.uid, girlId, firestore]
  );

  // 3. MESSAGES (Aligned Path)
  const messagesQuery = useMemoFirebase(
    () =>
      chatId && firestore
        ? query(
            collection(firestore, 'chat', chatId, 'messages'),
            limit(100)
          )
        : null,
    [chatId, firestore]
  );

  // 4. LISTENERS
  useEffect(() => {
    if (!relationshipRef || !messagesQuery || !user?.uid || !chatId) {
      setIsInitialized(false);
      return;
    }

    // RELATIONSHIP LISTENER
    const unsubRelationship = onSnapshot(
      relationshipRef,
      (snap) => {
        const raw = snap.exists() ? (snap.data() as any) : initialStats;
        const normalized = normalizeRelationship(raw);

        setState((prev) => ({
          ...prev,
          stats: {
            ...initialStats,
            ...normalized,
          },
        }));

        setIsInitialized(true);
      },
      async (err) => {
        const permissionError = new FirestorePermissionError({
          path: relationshipRef.path,
          operation: 'get',
        });
        errorEmitter.emit('permission-error', permissionError);
        setState((prev) => ({ ...prev, stats: initialStats }));
        setIsInitialized(true);
      }
    );

    // MESSAGES LISTENER
    const unsubMessages = onSnapshot(
      messagesQuery, 
      (snapshot) => {
        const fetchedMessages = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as Message
        );

        // Sort in memory to avoid index/field-omission issues
        const sorted = fetchedMessages.sort((a, b) => {
          const timeA = typeof a.createdAt === 'number' ? a.createdAt : getSafeDate(a.timestamp || a.createdAt)?.getTime() || 0;
          const timeB = typeof b.createdAt === 'number' ? b.createdAt : getSafeDate(b.timestamp || b.createdAt)?.getTime() || 0;
          return timeA - timeB;
        });

        setState((prev) => ({
          ...prev,
          messages: sorted,
        }));
      },
      async (err) => {
        const permissionError = new FirestorePermissionError({
          path: `chat/${chatId}/messages`,
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
      }
    );

    return () => {
      unsubRelationship();
      unsubMessages();
    };
  }, [relationshipRef, messagesQuery, user?.uid, chatId]);

  const addOptimisticMessage = useCallback((message: Message) => {
    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, message],
    }));
  }, []);

  return { state, isInitialized, addOptimisticMessage };
}
