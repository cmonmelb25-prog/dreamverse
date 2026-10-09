'use client';

import { useUser } from '@/firebase/auth/use-user';
import type { User as AppUser } from '@/lib/types';

export interface UserProfileState {
  isVip: boolean;
  isAdmin: boolean;
  vipTier: 'non-vip' | 'vip';
  isProfileLoading: boolean;
  profile: AppUser | null;
}

export const useUserProfile = (): UserProfileState => {
  const { profile, isLoading, isVip, isAdmin, vipTier } = useUser();

  // ⭐ Normalize vipTier to a safe, known value
  const safeVipTier: 'non-vip' | 'vip' =
    vipTier === 'vip'
      ? 'vip'
      : 'non-vip';

  // ⭐ Normalize booleans
  const safeIsVip = Boolean(isVip);
  const safeIsAdmin = Boolean(isAdmin);

  // ⭐ Normalize profile
  const safeProfile: AppUser | null =
    profile && typeof profile === 'object' ? profile : null;

  return {
    isVip: safeIsVip,
    isAdmin: safeIsAdmin,
    vipTier: safeVipTier,
    isProfileLoading: Boolean(isLoading),
    profile: safeProfile,
  };
};

export { useUser };
