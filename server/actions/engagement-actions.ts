

import { db } from '@/lib/firebase-admin';
import type { Engagement } from '@/lib/types';

/**
 * Logs an engagement event between an actor and a target.
 * Callers must provide the 'weight' to determine the XP impact.
 */
export async function logEngagement(
  data: Omit<Engagement, 'id' | 'timestamp'>
): Promise<{ success: boolean; error?: string }> {
  if (!db) {
    return { success: false, error: 'Database not initialized.' };
  }

  try {
    const full: Engagement = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      ...data,
    } as Engagement;

    await db.collection('engagements').doc(full.id).set(full);
    return { success: true };
  } catch (error: any) {
    console.error('Failed to log engagement:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Aggregates engagement scores for girls and users since a specific timestamp.
 * Returns:
 * - girlTotals: Aggregate engagement for each girl.
 * - userTotals: Aggregate engagement for each user.
 * - pairTotals: Engagement for specific girl-user pairs.
 */
export async function calculateEngagementScores(sinceTimestamp: number) {
  if (!db) return { girlTotals: {}, userTotals: {}, pairTotals: {} };
  
  const snap = await db.collection('engagements')
    .where('timestamp', '>=', sinceTimestamp)
    .get();

  const girlTotals: Record<string, number> = {};
  const userTotals: Record<string, number> = {};
  const pairTotals: Record<string, number> = {};

  snap.forEach(doc => {
    const data = doc.data();
    const weight = data.weight || 0;
    const gId = data.targetType === 'girl' ? data.targetId : (data.actorType === 'girl' ? data.actorId : null);
    const uId = data.realUserId || (data.actorType === 'user' ? data.actorId : (data.targetType === 'user' ? data.targetId : null));

    if (gId) {
      girlTotals[gId] = (girlTotals[gId] || 0) + weight;
    }
    if (uId) {
      userTotals[uId] = (userTotals[uId] || 0) + weight;
    }
    if (gId && uId) {
      const pairKey = `${gId}_${uId}`;
      pairTotals[pairKey] = (pairTotals[pairKey] || 0) + weight;
    }
  });

  return { girlTotals, userTotals, pairTotals };
}

/**
 * Identifies the user with the highest interaction for a specific girl.
 */
export function getTopUserForGirl(girlId: string, pairTotals: Record<string, number>): string | null {
  let topUser: string | null = null;
  let maxScore = -1;

  for (const key in pairTotals) {
    if (key.startsWith(`${girlId}_`)) {
      const userId = key.split('_')[1];
      if (pairTotals[key] > maxScore) {
        maxScore = pairTotals[key];
        topUser = userId;
      }
    }
  }

  return topUser;
}