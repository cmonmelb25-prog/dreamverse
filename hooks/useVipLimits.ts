
'use client';

import { useCallback } from 'react';
import {
  getDailyLimitData,
  setDailyLimitData,
  STORAGE_KEY_PREFIX,
  isMatchDay,
  DAILY_MESSAGE_LIMIT,
  MATCH_DAY_MESSAGE_LIMIT,
  DAILY_COMMENT_LIMIT
} from '@/lib/vip-limits';
import type { AIGirl } from '@/lib/types';

/**
 * Hook to manage usage limits and feature access based on VIP status.
 */
export function useVipLimits(viewer: { id: string; vipTier: string; isAdmin: boolean } | null) {
  const currentTier = viewer?.isAdmin ? 'vip' : (viewer?.vipTier as 'non-vip' | 'vip' || 'non-vip');
  const isVipOrAbove = currentTier === 'vip' || viewer?.isAdmin === true;

  // -----------------------------
  // MESSAGES
  // -----------------------------
  const canMessage = useCallback((targetId: string) => {
    if (!viewer) return false;
    if (viewer.isAdmin) return true;

    const limit = isMatchDay(viewer.id, targetId)
      ? MATCH_DAY_MESSAGE_LIMIT
      : DAILY_MESSAGE_LIMIT;

    const key = `${STORAGE_KEY_PREFIX}msg_${viewer.id}_${targetId}`;
    const data = getDailyLimitData(key);

    return data.count < limit;
  }, [viewer]);

  const registerMessage = useCallback((targetId: string) => {
    if (!viewer || viewer.isAdmin) return;

    const key = `${STORAGE_KEY_PREFIX}msg_${viewer.id}_${targetId}`;
    const data = getDailyLimitData(key);

    setDailyLimitData(key, data.count + 1);
  }, [viewer]);

  // -----------------------------
  // COMMENTS
  // -----------------------------
  const canComment = useCallback(() => {
    if (!viewer) return false;
    if (isVipOrAbove) return true;

    const key = `${STORAGE_KEY_PREFIX}comment_${viewer.id}`;
    const data = getDailyLimitData(key);

    return data.count < DAILY_COMMENT_LIMIT;
  }, [viewer, isVipOrAbove]);

  const registerComment = useCallback(() => {
    if (!viewer || isVipOrAbove) return;

    const key = `${STORAGE_KEY_PREFIX}comment_${viewer.id}`;
    const data = getDailyLimitData(key);

    setDailyLimitData(key, data.count + 1);
  }, [viewer, isVipOrAbove]);

  // -----------------------------
  // CALLS & VOICE
  // -----------------------------
  const canVoiceCall = useCallback((girl: AIGirl) => {
    return isVipOrAbove;
  }, [isVipOrAbove]);

  const canVideoCall = useCallback((girl: AIGirl) => {
    // Shared between VIP and Admin now
    return isVipOrAbove;
  }, [isVipOrAbove]);

  const canSendVoiceMessage = useCallback(() => {
    return isVipOrAbove;
  }, [isVipOrAbove]);

  return {
    canMessage,
    registerMessage,
    canComment,
    registerComment,
    canVoiceCall,
    canVideoCall,
    canSendVoiceMessage,
  };
}
