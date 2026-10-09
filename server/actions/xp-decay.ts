'use server';

import { db } from '@/lib/firebase-admin';
import { getSafeDate } from '@/lib/utils';
import type { RelationshipMemory } from '@/lib/types';

const DECAY_THRESHOLD_DAYS = 3;
const DECAY_AMOUNT = -1;
const MAX_BATCH_OPS = 450; // safety margin under Firestore’s 500 limit

export async function runXpDecay(): Promise<{
  success: boolean;
  message: string;
  error?: string;
}> {
  const dbInstance = db;
  if (!dbInstance) {
    return { success: false, message: 'Database not initialized.', error: 'db-not-init' };
  }

  try {
    const usersSnapshot = await dbInstance.collection('users').get();
    if (usersSnapshot.empty) {
      return { success: true, message: 'No users found to process.' };
    }

    let relationshipsUpdated = 0;
    const now = Date.now();
    const decayThreshold = now - DECAY_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;

    let batch = dbInstance.batch();
    let batchOps = 0;

    const commitBatch = async () => {
      await batch.commit();
      batch = dbInstance.batch();
      batchOps = 0;
    };

    for (const userDoc of usersSnapshot.docs) {
      const relationshipsRef = userDoc.ref.collection('relationships');
      const relationshipsSnapshot = await relationshipsRef.get();

      if (relationshipsSnapshot.empty) continue;

      for (const relDoc of relationshipsSnapshot.docs) {
        const relationship = relDoc.data() as RelationshipMemory;

        const currentXp = relationship.relationshipStats?.xp ?? 0;
        const lastInteractionDate = getSafeDate(relationship.lastInteraction);

        // Treat missing or invalid lastInteraction as very old
        const lastInteractionMs = lastInteractionDate?.getTime() ?? 0;

        // 1. Sanitize negative XP
        if (currentXp < 0) {
          batch.update(relDoc.ref, {
            'relationshipStats.xp': 0,
            xp: 0,
          });
          relationshipsUpdated++;
          batchOps++;
        }

        // 2. Apply decay if inactive
        else if (lastInteractionMs < decayThreshold && currentXp > 0) {
          const newXp = Math.max(0, currentXp + DECAY_AMOUNT);

          batch.update(relDoc.ref, {
            'relationshipStats.xp': newXp,
            xp: newXp,
          });

          if (newXp < currentXp) {
            relationshipsUpdated++;
          }

          batchOps++;
        }

        // Commit early if batch is near limit
        if (batchOps >= MAX_BATCH_OPS) {
          await commitBatch();
        }
      }
    }

    // Final commit
    if (batchOps > 0) {
      await commitBatch();
    }

    return {
      success: true,
      message:
        relationshipsUpdated > 0
          ? `Successfully decayed/corrected XP for ${relationshipsUpdated} relationships.`
          : 'No relationships required XP decay or correction.',
    };
  } catch (error: any) {
    console.error('Error running XP decay:', error);
    return { success: false, message: 'An error occurred during XP decay.', error: error.message };
  }
}