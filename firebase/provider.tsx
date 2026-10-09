'use client';

import React, {
  createContext,
  useContext,
  ReactNode,
  useMemo,
  useState,
  useEffect,
  useRef,
} from 'react';

import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import {
  Auth,
  User,
  onIdTokenChanged,
  getIdTokenResult,
} from 'firebase/auth';

import { FirebaseStorage } from 'firebase/storage';
import { initializeFirebase } from './init';

interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  isAdmin: boolean;
  vipTier: 'non-vip' | 'vip';
}

export interface FirebaseContextState extends UserAuthState {
  areServicesAvailable: boolean;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  storage: FirebaseStorage | null;
  isSessionSynced: boolean;
}

export interface FirebaseServicesAndUser extends UserAuthState {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
  isSessionSynced: boolean;
}

export const FirebaseContext =
  createContext<FirebaseContextState | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { firebaseApp, firestore, auth, storage } = useMemo(
    () => initializeFirebase(),
    []
  );

  const [authState, setAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true,
    userError: null,
    isAdmin: false,
    vipTier: 'non-vip',
  });

  const [isSessionSynced, setIsSessionSynced] = useState(false);

  const lastSyncedTokenRef = useRef<string | null>(null);
  const isSyncingRef = useRef(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!auth) {
      setAuthState(prev => ({ ...prev, isUserLoading: false }));
      return;
    }

    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      // 🧠 ALWAYS clear pending sync
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      // 🚨 CRITICAL FIX: DO NOT BLOCK UI ANYMORE
      setAuthState(prev => ({
        ...prev,
        isUserLoading: false,
      }));

      // 🔥 LOGOUT CASE
      if (!user) {
        try {
          await fetch('/api/auth/session', { method: 'DELETE' });
        } catch (err) {
          console.warn('[AUTH] failed to clear session cookie:', err);
        }

        setAuthState({
          user: null,
          isUserLoading: false,
          userError: null,
          isAdmin: false,
          vipTier: 'non-vip',
        });

        setIsSessionSynced(false);
        return;
      }

      // 🔥 UPDATE USER IMMEDIATELY
      setAuthState(prev => ({
        ...prev,
        user,
      }));

      // 🧊 SESSION SYNC RUNS IN BACKGROUND (NON-BLOCKING)
      syncTimeoutRef.current = setTimeout(async () => {
        try {
          const tokenResult = await getIdTokenResult(user);

          const isAdmin = !!tokenResult.claims.admin;
          const vipTier =
            (tokenResult.claims.vipTier as any) || 'non-vip';

          const currentToken = tokenResult.token;

          const sessionKey = `fb_token_v1_${user.uid}`;
          const cachedToken =
            typeof window !== 'undefined'
              ? sessionStorage.getItem(sessionKey)
              : null;

          if (
            lastSyncedTokenRef.current === currentToken ||
            cachedToken === currentToken
          ) {
            setAuthState(prev => ({
              ...prev,
              isAdmin,
              vipTier,
            }));

            setIsSessionSynced(true);
            return;
          }

          if (isSyncingRef.current) return;
          isSyncingRef.current = true;

          const res = await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: currentToken }),
          });

          if (res.ok) {
            lastSyncedTokenRef.current = currentToken;

            if (typeof window !== 'undefined') {
              sessionStorage.setItem(sessionKey, currentToken);
            }

            setIsSessionSynced(true);
          }

          setAuthState(prev => ({
            ...prev,
            isAdmin,
            vipTier,
          }));
        } catch (err) {
          console.warn('[AUTH] session sync failed:', err);
        } finally {
          isSyncingRef.current = false;
        }
      }, 300);
    });

    return () => {
      unsubscribe();
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [auth]);

  const contextValue = useMemo((): FirebaseContextState => {
    return {
      areServicesAvailable: true,
      firebaseApp,
      firestore,
      auth,
      storage,
      isSessionSynced,
      ...authState,
    };
  }, [firebaseApp, firestore, auth, storage, authState, isSessionSynced]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within FirebaseProvider.');
  }
  return context as FirebaseServicesAndUser;
};

export const useAuth = (): Auth => useFirebase().auth;
export const useFirestore = (): Firestore => useFirebase().firestore;
export const useFirebaseApp = (): FirebaseApp =>
  useFirebase().firebaseApp;
export const useStorage = (): FirebaseStorage =>
  useFirebase().storage;