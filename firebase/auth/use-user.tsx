'use client';

import { useFirebase, useFirestore } from '@/firebase/provider';
import { useDoc } from '../firestore/use-doc';
import { useMemoFirebase } from '../use-memo-firebase';
import { doc } from '../client';
import type { User as AppUser } from '../../lib/types';
import type { User } from 'firebase/auth';

export interface AuthState {
  user: User | null;
  profile: AppUser | null;
  isLoading: boolean;
  error: Error | null;
  isAdmin: boolean;
  isVip: boolean;
  vipTier: 'non-vip' | 'vip';
}

/**
 * Optimized identity hook.
 * Uses shared auth state from FirebaseProvider to prevent listener duplication
 * and redundant session synchronization.
 */
export const useUser = (): AuthState => {
  const { 
    user, 
    isUserLoading, 
    userError, 
    isAdmin, 
    vipTier: claimsVipTier 
  } = useFirebase();
  
  const firestore = useFirestore();

  // Load Firestore profile using the stable user UID from provider
  const userProfileRef = useMemoFirebase(() => {
    if (!user?.uid || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user?.uid, firestore]);

  const { data: profile, isLoading: isProfileDocLoading } = useDoc<AppUser>(
    userProfileRef,
    user?.uid ? `users/${user.uid}` : null
  );

const isLoading = isUserLoading || (user !== null && isProfileDocLoading);
  // VIP tier priority: Firestore Profile > Custom Claims
  const vipTier = profile?.vipTier || claimsVipTier;

  return {
    user,
    profile,
    isLoading,
    error: userError,
    isAdmin,
    isVip: vipTier === 'vip',
    vipTier,
  };
};
