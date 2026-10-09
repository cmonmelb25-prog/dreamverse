'use client';

import { useMemo, type DependencyList } from 'react';
import type { DocumentReference, Query } from 'firebase/firestore';

export function useMemoFirebase<T extends Query | DocumentReference | null>(
  factory: () => T,
  deps: DependencyList
): T {
  return useMemo(() => {
    const value = factory();

    // DO NOT mutate Firestore objects
    // Instead, just return them as-is
    return value;
  }, deps);
}