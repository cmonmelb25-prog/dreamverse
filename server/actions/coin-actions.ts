'use server';

import { db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuthenticatedUserId } from './swipe-actions';
import { revalidatePath } from 'next/cache';
import { COIN_PACKAGES } from '@/lib/coin-constants';

/**
 * Purchases a coin package (Simulated).
 */
export async function purchaseCoinsAction(packageId: string) {
  const userId = await getAuthenticatedUserId();
  if (!userId || !db) return { success: false, error: 'Unauthorized' };

  // Use the isolated constants for lookup
  const pkg = COIN_PACKAGES.find(p => p.id === packageId);
  if (!pkg) return { success: false, error: 'Invalid package' };

  try {
    const userRef = db.collection('users').doc(userId);
    
    await userRef.update({
      coins: FieldValue.increment(pkg.coins),
      updatedAt: FieldValue.serverTimestamp()
    });

    revalidatePath('/settings');
    return { success: true, coinsAdded: pkg.coins };
  } catch (err: any) {
    console.error('[Coin Purchase] Error:', err);
    return { success: false, error: 'Purchase failed.' };
  }
}

/**
 * Admin utility: Grant coins to a user.
 */
export async function grantCoinsAction(targetUid: string, amount: number) {
  if (!db) return { success: false };
  try {
    await db.collection('users').doc(targetUid).update({
      coins: FieldValue.increment(amount)
    });
    return { success: true };
  } catch (e) {
    return { success: false };
  }
}
