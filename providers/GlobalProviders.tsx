'use client';

import React, { type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { NotificationProvider } from "@/providers/NotificationProvider";
import { MinimizedChatProvider } from "@/providers/MinimizedChatProvider";
import { AdminActingAsProvider } from "@/providers/AdminActingAsProvider";
import { ScrollToTop } from "@/components/ScrollToTop";
import { SharedFirestoreStateProvider } from "@/providers/SharedFirestoreStateProvider";

interface GlobalProvidersProps {
  children: ReactNode;
}

/**
 * MASTER CONTEXT WRAPPER
 * Consolidates all global providers into a single client-side boundary.
 * Optimized with SharedFirestoreStateProvider to reduce listener density.
 */
export function GlobalProviders({ children }: GlobalProvidersProps) {
  return (
    <FirebaseProvider>
      <NotificationProvider>
        <SharedFirestoreStateProvider>
          <MinimizedChatProvider>
            <AdminActingAsProvider>
              <ScrollToTop />
              {children}
            </AdminActingAsProvider>
          </MinimizedChatProvider>
        </SharedFirestoreStateProvider>
      </NotificationProvider>
    </FirebaseProvider>
  );
}
