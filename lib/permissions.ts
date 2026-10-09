
import type { AIGirl, Relationship } from './types';

/**
 * Global permission rules for DreamVerse features.
 * Standardizes access across the platform based on user tiers.
 */

export function canMessage(
  vipTier: 'non-vip' | 'vip',
  girl: AIGirl,
  relationship: Relationship
): boolean {
  // All tiers can message, but Non-VIPs have daily limits handled in hooks.
  return true;
}

export function canVoiceCall(
  vipTier: 'non-vip' | 'vip',
  girl: AIGirl,
  relationship: Relationship
): boolean {
  // Voice calls require at least VIP status
  return vipTier === 'vip';
}

export function canVideoCall(
  vipTier: 'non-vip' | 'vip',
  girl: AIGirl,
  relationship: Relationship
): boolean {
  // Video calls require at least VIP status
  return vipTier === 'vip';
}

export function canSendVoiceMessage(
  vipTier: 'non-vip' | 'vip'
): boolean {
  // Voice messages require at least VIP status
  return vipTier === 'vip';
}
