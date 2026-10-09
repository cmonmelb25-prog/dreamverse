'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { useUser } from '../firebase/auth/use-user';
import type { AIGirl } from '@/lib/types';

type ActingAsContextType = {
  actingAs: AIGirl | null;
  setActingAs: (v: AIGirl | null) => void;
};

const ActingAsContext = createContext<ActingAsContextType | null>(null);

export function AdminActingAsProvider({ children }: { children: ReactNode }) {
  const { isAdmin } = useUser();
  const [actingAs, setActingAs] = useState<AIGirl | null>(null);

  // Only admins get the provider's value, but all children are rendered.
  const value = isAdmin ? { actingAs, setActingAs } : null;

  return (
    <ActingAsContext.Provider value={value}>
      {children}
    </ActingAsContext.Provider>
  );
}

export function useAdminActingAs() {
  const ctx = useContext(ActingAsContext);
  // Return a safe, non-functional version if context is not available (i.e., user is not admin)
  if (!ctx) return { actingAs: null, setActingAs: () => {} };
  return ctx;
}
