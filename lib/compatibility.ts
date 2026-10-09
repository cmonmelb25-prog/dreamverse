
'use server';

import type { AIGirl, User } from '@/lib/types';

export type CompatibilityResult = {
  interestLevel: 'none' | 'friend' | 'high' | 'romantic';
};

/**
 * Evaluates the compatibility between a girl and a user based on shared interests.
 * This is a pure calculator and does not write to any database.
 * Its output is used by other functions to determine XP gain, emotional reactions, etc.
 */
export async function evaluateCompatibility(girl: AIGirl, user: User): Promise<CompatibilityResult> {
  // Add a romantic interest check if user has 'romantic' interest and girl has 'soulmate' style.
  if (
    (user.interests?.includes('romantic')) &&
    (girl.style?.includes('Soulmate'))
  ) {
    return { interestLevel: 'romantic' };
  }

  const sharedInterests = (girl.interests || []).filter(interest =>
    (user.interests || []).includes(interest)
  ).length;

  if (sharedInterests > 2) {
    return { interestLevel: 'high' };
  }
  if (sharedInterests > 0) {
    return { interestLevel: 'friend' };
  }

  return { interestLevel: 'none' };
}
