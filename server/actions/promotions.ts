
'use server';

/**
 * @fileOverview Refined Promotion Engine.
 * TIER UPDATE: Handles transitions between non-vip and vip tiers based on engagement.
 */

import { db, adminAuth } from '@/lib/firebase-admin';
import { calculateEngagementScores } from './engagement-actions';
import { getAllGirls } from './ai';
import { revalidatePath } from 'next/cache';

const PROMOTION_WINDOW_DAYS = 14;
const RESIDENT_VIP_THRESHOLD = 100;

export async function runPromotionCycle() {
  if (!db || !adminAuth) {
    return { success: false, error: 'Database or Auth not initialized.' };
  }

  try {
    const sinceTimestamp = Date.now() - (PROMOTION_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const { girlTotals } = await calculateEngagementScores(sinceTimestamp);

    // 1. RANK RESIDENTS
    const allGirlsList = await getAllGirls();
    const girlBatch = db.batch();

    for (const girl of allGirlsList) {
      const score = girlTotals[girl.id] || 0;
      
      let targetTier: 'non-vip' | 'vip' = 'non-vip';
      if (score >= RESIDENT_VIP_THRESHOLD) {
        targetTier = 'vip';
      }

      girlBatch.set(db.collection('aiGirls').doc(girl.id), { 
        promotionTier: targetTier,
        lastPromotionUpdate: Date.now()
      }, { merge: true });
    }

    await girlBatch.commit();

    revalidatePath('/admin');
    revalidatePath('/feed');
    revalidatePath('/browse');

    return { 
      success: true, 
      message: `Cycle complete. Updated Resident tiers based on engagement scores.`
    };

  } catch (error: any) {
    console.error("Promotion Cycle Failed:", error);
    return { success: false, error: error.message };
  }
}
