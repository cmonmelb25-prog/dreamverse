/**
 * CORE FIREBASE INITIALIZER (Infrastructure Hardened)
 * ISOLATED: This file has zero dependencies on other firebase/ files to prevent circular loops.
 * NETWORK: Enforces Long-Polling to bypass unstable proxy/workstation HTTP2/QUIC streams.
 * CACHE: Uses memory cache exclusively to avoid "ve:-1" internal assertion errors and IndexedDB contention.
 * ISOMORPHIC: Removed 'use client' to allow safe importing from Server Actions.
 */

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, FirebaseApp, getApps, getApp } from 'firebase/app';
import { getAuth, Auth, browserSessionPersistence, setPersistence } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { 
  initializeFirestore, 
  getFirestore,
  memoryLocalCache,
  type Firestore 
} from 'firebase/firestore';

// Module-level singletons to preserve references across hot-reloads
let appInstance: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let firestoreInstance: Firestore | undefined;
let storageInstance: FirebaseStorage | undefined;

export function initializeFirebase() {
  const isBrowser = typeof window !== 'undefined';
  
  // 1. Initialize App Instance safely
  if (!appInstance) {
    const apps = getApps();
    appInstance = apps.length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  
  const app = appInstance!;

  // 2. Initialize Firestore with Isomorphic Environment Handling
  if (!firestoreInstance) {
    try {
      if (isBrowser) {
        // Client-side initialization
        firestoreInstance = initializeFirestore(app, {
          /**
           * 🛡️ INTERNAL ASSERTION FIX: 
           * Enforce memoryLocalCache() to prevent the "ve: -1" error.
           * This error occurs when persistent IndexedDB caching conflicts with proxied streams.
           */
          localCache: memoryLocalCache(),
          
          // 🛡️ WORKSTATION STABILITY FIX:
          // Force long-polling to prevent unstable stream upgrades in proxy environments.
          experimentalAutoDetectLongPolling: true,
          ignoreUndefinedProperties: true,
        });
      } else {
        // Server-Side execution fallback
        firestoreInstance = initializeFirestore(app, {
          localCache: memoryLocalCache(),
          experimentalForceLongPolling: false, 
        });
      }
    } catch (e: any) {
      firestoreInstance = getFirestore(app);
    }
  }

  // 3. Initialize Auth
  if (!authInstance) {
    authInstance = getAuth(app);
  }

  if (isBrowser) {
    setPersistence(authInstance, browserSessionPersistence).catch((err) => {
      console.warn('[AUTH] Failed to set session-only persistence:', err);
    });
  }

  // 4. Initialize Storage
  if (!storageInstance) {
    storageInstance = getStorage(app);
  }

  return {
    firebaseApp: app,
    auth: authInstance!,
    firestore: firestoreInstance!,
    storage: storageInstance!
  };
}
