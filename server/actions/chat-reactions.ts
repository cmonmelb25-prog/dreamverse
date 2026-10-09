'use server';

/**
 * @fileOverview Server action for handling emoji reactions in AI Resident chats.
 * ALIGNED: Uses the specified path /chat/{girlId}_{userId}/messages
 * HARDENED: Strictly typed return object to resolve TS2339 error in client components.
 */

import { db } from '@/lib/firebase-admin';
import type { ReactionActor } from '@/lib/types';
import { getAuthenticatedUserId } from './swipe-actions';
import { getCanonicalGirlId } from '@/lib/utils';

/**
 * Transactionally adds or toggles an emoji reaction on an AI chat message.
 */
export async function addChatReactionAction({
  chatId: inputId,
  messageId,
  emoji,
  actor
}: {
  chatId: string;
  messageId: string;
  emoji: string;
  actor: ReactionActor;
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const userId = await getAuthenticatedUserId();
    if (!db || !userId) {
      return { success: false, error: 'Unauthorized session.' };
    }

    // IDENTITY ALIGNMENT: Detect if inputId is ResidentID or full ChatID
    let chatId = inputId;
    if (!inputId.includes('_')) {
      const girlId = getCanonicalGirlId(inputId) || inputId;
      chatId = `${girlId}_${userId}`;
    }
    
    const messageRef = db
      .collection('chat').doc(chatId)
      .collection('messages').doc(messageId);

    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(messageRef);
      if (!doc.exists) return;

      const data = doc.data() as any;
      const reactions = data.reactions || {};
      
      let previousEmoji: string | null = null;

      // Find if user already reacted and remove it
      for (const key in reactions) {
        const actors = reactions[key];
        if (!Array.isArray(actors)) continue;

        const index = actors.findIndex((r: any) => r.actorId === actor.actorId);
        if (index > -1) {
          previousEmoji = key;
          actors.splice(index, 1);
          if (actors.length === 0) delete reactions[key];
          break;
        }
      }

      // If the new emoji is different from the previous one, add it
      if (previousEmoji !== emoji) {
        if (!reactions[emoji]) reactions[emoji] = [];
        reactions[emoji].push(actor);
      }

      transaction.update(messageRef, { reactions });
    });

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error adding chat reaction:', error);
    return { success: false, error: 'Failed to process reaction.' };
  }
}
