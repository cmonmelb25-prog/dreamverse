'use client';

import { useEffect, useRef } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * FirebaseErrorListener (STABLE VERSION)
 * - Prevents render-phase throwing
 * - Avoids error storms
 * - Safe for concurrent React
 */
export function FirebaseErrorListener() {
  const hasThrownRef = useRef(false);
  const latestErrorRef = useRef<FirestorePermissionError | null>(null);

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      // 🚫 Prevent duplicate error spam
      if (hasThrownRef.current) return;

      latestErrorRef.current = error;

      // 🚀 Defer throw to next tick (safe boundary exit)
      queueMicrotask(() => {
        hasThrownRef.current = true;
        throw latestErrorRef.current;
      });
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  return null;
}