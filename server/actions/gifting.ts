'use server';

import { db, adminAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getGiftById, calculateGiftImpact } from '@/lib/gifts';
import { processInteraction } from './process-interaction';
import { getAuthenticatedUserId } from './swipe-actions';
import { revalidatePath } from 'next/cache';
import { nuclearSerialize, getCanonicalGirlId, isUidPattern } from '@/lib/utils';
import { createNotification } from './create-notification';

/**
 * TRANSACTIONAL COIN GIFTING ENGINE
 * HARDENED: Checks user balance and deducts coins atomically before delivering the gift.
 * UPDATED: Enforces 1 free gift per day limit server-side.
 */
export async function sendGiftAction(params: {
  girlId: string; 
  giftId: string;
  message?: string;
  actingAsId?: string | null;
  sessionId?: string;
}) {
  const userId = await getAuthenticatedUserId();
  if (!userId || !db || !adminAuth) {
    return { success: false, error: 'Unauthorized session.' };
  }

  const { girlId: sessionDocId, giftId, message, actingAsId, sessionId } = params;
  const gift = getGiftById(giftId);

  if (!gift) {
    return { success: false, error: 'Invalid gift item.' };
  }

  try {
    const userRef = db.collection('users').doc(userId);
    const streamRef = db.collection('live').doc(sessionDocId);

    // 1. ATOMIC TRANSACTION: Check balance/limit and deduct
    const txResult = await db.runTransaction(async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) throw new Error("User profile missing.");

      const userData = userSnap.data()!;
      const currentCoins = userData.coins || 0;

      // FREE GIFT ENFORCEMENT
      if (gift.priceCoins === 0) {
          const today = new Date().toDateString();
          const lastFreeGiftDate = userData.lastFreeGiftDate;
          
          if (lastFreeGiftDate === today) {
              return { success: false, error: 'FREE_LIMIT_REACHED' };
          }
          
          // Mark as used
          transaction.update(userRef, { lastFreeGiftDate: today });
      } else {
          // PAID GIFT ENFORCEMENT
          if (currentCoins < gift.priceCoins) {
            return { success: false, error: 'INSUFFICIENT_FUNDS', balance: currentCoins };
          }
          // Deduct coins
          transaction.update(userRef, {
            coins: FieldValue.increment(-gift.priceCoins)
          });
      }

      return { success: true, balance: currentCoins - gift.priceCoins };
    });

    if (!txResult.success) {
        return txResult;
    }

    // 2. Resolve Sender Identity for presentation
    let senderName = 'Someone';
    let senderPhoto = '';

    if (actingAsId) {
        const { allGirls } = await import('@/lib/server/girls-data');
        const staticGirl = allGirls.find(g => g.id.toLowerCase() === actingAsId.toLowerCase());
        if (staticGirl) {
            senderName = staticGirl.name;
            senderPhoto = staticGirl.media.profileImageUrl;
        }
    } else {
        const sender = await adminAuth.getUser(userId);
        senderName = sender.displayName || sender.email?.split('@')[0] || 'Someone';
        if (isUidPattern(senderName)) senderName = 'Someone';
        senderPhoto = sender.photoURL || '';
    }

    // 3. Update Stream State & Announce
    const xpChange = calculateGiftImpact(gift.priceCoins);

    await streamRef.update({
      heartCount: FieldValue.increment(xpChange),
      lastgiftAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

   await streamRef.collection('comments').add({
  user: senderName,
  senderId: userId,
  text: `sent a ${gift.name}`,
  type: 'gift',
  giftId: gift.id,
  sessionId: sessionId || sessionDocId,

  // viewer resolves animation from /gifts/
  giftPath: `/gifts/${gift.id}`,

  color: 'text-amber-400',
  timestamp: FieldValue.serverTimestamp(),
});

    // 4. NOTIFY & LOG
    const streamSnap = await streamRef.get();
    const streamData = streamSnap.data() || {};
    const recipientId = streamData.userId || sessionDocId;
    const isAiRecipient = streamData.isAI === true || recipientId.length < 15;

    if (isAiRecipient) {
        const canonicalId = getCanonicalGirlId(recipientId);
        if (canonicalId) {
            await processInteraction(userId, canonicalId, {
                type: 'feed_react', 
                xpChange,
                topic: `Received a ${gift.name}`,
                inferredUserTone: 'sweet',
                actingAsGirlId: actingAsId
            });
        }
    } else {
        await createNotification({
            recipientId: recipientId,
            senderId: userId,
            actor: { id: actingAsId || userId, name: senderName, profileImageUrl: senderPhoto },
            type: 'system',
            message: `sent you a ${gift.name}!`,
        }).catch(() => {});
    }

    revalidatePath('/live');
    return { success: true, balance: txResult.balance };

  } catch (error: any) {
    console.error('[Gifting Action] Critical Error:', error);
    return { success: false, error: error.message || 'Failed to process gift.' };
  }
}
