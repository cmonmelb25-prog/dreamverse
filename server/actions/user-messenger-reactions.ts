'use server';

import { db } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import type { ReactionActor } from '@/lib/types';

/**
 * Signal-grade messenger reaction system
 * - deterministic toggle behavior
 * - concurrency-safe via Firestore transactions
 * - immutable updates (no object mutation leaks)
 * - safe error return (no throws to UI)
 */
export async function addMessengerReactionAction({
  chatId,
  messageId,
  emoji,
  actor
}: {
  chatId: string;
  messageId: string;
  emoji: string;
  actor: ReactionActor;
}): Promise<{ success: boolean; error?: string }> {
  if (!db) {
    return {
      success: false,
      error: 'Database service unavailable'
    };
  }

  const messageRef = db
    .collection('messenger')
    .doc(chatId)
    .collection('messages')
    .doc(messageId);

  try {
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(messageRef);

      if (!snapshot.exists) {
        return;
      }

      const data = snapshot.data() || {};

      // Defensive clone to prevent mutation leaks from Firestore internals
      const reactions: Record<string, ReactionActor[]> = data.reactions
        ? structuredClone(data.reactions)
        : {};

      let existingEmoji: string | null = null;

      /**
       * STEP 1: Remove any existing reaction from this actor
       * (ensures single-reaction-per-user rule like Signal/Instagram)
       */
      for (const [key, actors] of Object.entries(reactions)) {
        const index = actors.findIndex(
          (r) => r.actorId === actor.actorId
        );

        if (index !== -1) {
          existingEmoji = key;

          actors.splice(index, 1);

          if (actors.length === 0) {
            delete reactions[key];
          }

          break;
        }
      }

      /**
       * STEP 2: Add new reaction if different from previous
       */
      if (existingEmoji !== emoji) {
        if (!reactions[emoji]) {
          reactions[emoji] = [];
        }

        reactions[emoji] = [
          ...reactions[emoji],
          actor
        ];
      }

      /**
       * STEP 3: Commit update
       */
      transaction.update(messageRef, {
        reactions,
        updatedAt: Date.now()
      });
    });

    revalidatePath(`/messages/${chatId}`);

    return {
      success: true
    };
  } catch (error: any) {
    console.error('[Messenger Reaction Error]', error);

    return {
      success: false,
      error: error?.message || 'Failed to process reaction'
    };
  }
}