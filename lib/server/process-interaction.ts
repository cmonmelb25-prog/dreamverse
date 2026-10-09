// src/lib/server/process-interaction.ts
'use server';

import { db } from '@/lib/firebase-admin';
import type { InteractionSummary, Engagement } from '@/lib/types';
import { getOrInitializeRelationship, saveRelationship } from '@/lib/server/relationships';
import { logEngagement } from '@/server/actions/engagement-actions';

// Define a placeholder type for InteractionType if it's not available
type InteractionType = any;

/** Safe UUID for Node + Browser */
function safeUUID() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {}
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/* ========================================================= */
/* UTILITY: Map InteractionType → InteractionSummary.mode    */
/* ========================================================= */
function getInteractionSummaryMode(type: InteractionType): InteractionSummary['mode'] {
  switch (type) {
    case 'chat':
      return 'chat';
    case 'voice_call':
      return 'voice_call';
    case 'video_call':
      return 'video_call';
    case 'feed_react':
    case 'feed_comment':
      return 'feed';
    case 'reel_like':
    case 'reel_comment':
      return 'reel';
    case 'mini_movie':
    default:
      return 'feed';
  }
}

/* ========================================================= */
/* UTILITY: Map InteractionType → Engagement.type            */
/* ========================================================= */
function getEngagementLogType(type: InteractionType): Engagement['type'] {
  switch (type) {
    case 'voice_call':
    case 'video_call':
      return 'call';
    case 'feed_react':
    case 'reel_like':
      return 'reaction';
    case 'feed_comment':
    case 'reel_comment':
      return 'comment';
    default:
      return type as Engagement['type']; // chat, mini_movie
  }
}

/* ========================================================= */
/* MAIN: Process a user-girl interaction                     */
/* ========================================================= */
export async function processInteraction(
  userId: string,
  girlId: string,
  interaction: {
    type: InteractionType;
    xpChange: number;
    topic: string;
    inferredUserTone?: string;
    newMood?: string;
    actingAsGirlId?: string | null;
    newRelationshipStatus?: 'relationship' | 'single';
  }
) {
  if (!db) {
    return { success: false, error: 'Database not initialized.' };
  }

  try {
    // Load or initialize relationship memory
    const relationship = await getOrInitializeRelationship(userId, girlId);

    // Create interaction summary
    const summary: InteractionSummary = {
      id: safeUUID(), // FIXED
      type: interaction.type,
      timestamp: Date.now(),
      mode: getInteractionSummaryMode(interaction.type),
      summary: interaction.topic,
      mood: interaction.newMood ?? (relationship as any).emotionalState ?? 'neutral',
      userTone: interaction.inferredUserTone ?? 'neutral',
      inferredUserTone: interaction.inferredUserTone ?? 'neutral',
    };

    // Maintain rolling memory (last 20 interactions)
    (relationship as any).recentInteractions = [
      summary,
      ...((relationship as any).recentInteractions ?? []),
    ].slice(0, 20);

    // Update XP
    (relationship as any).relationshipStats.xp = Math.max(
      0,
      ((relationship as any).relationshipStats.xp || 0) + interaction.xpChange
    );

    // Update mood and last interaction timestamp
    if (interaction.newMood) {
      (relationship as any).emotionalState = interaction.newMood;
    }
    (relationship as any).lastInteraction = Date.now();

    

    // Handle Official Status Agreement
    if (interaction.newRelationshipStatus === 'relationship') {
      (relationship as any).isOfficial = true;

      const userRef = db.collection('users').doc(userId);
      const girlRef = db.collection('aiGirls').doc(girlId);

      await Promise.all([
        userRef.update({
          relationshipStatus: `dating:${girlId}`,
          relationshipTargetId: girlId,
        }),
        girlRef.update({
          relationshipStatus: `dating:${userId}`,
          relationshipTargetId: userId,
        }),
      ]);
    }

    // Persist relationship
    await saveRelationship(userId, girlId, relationship);

    // Sync girl's current mood in Firestore
    if (interaction.newMood) {
      await db.collection('aiGirls').doc(girlId).update({
        currentMood: interaction.newMood,
      });
    }

    // Log engagement
    await logEngagement({
      actorType: interaction.actingAsGirlId ? 'girl' : 'user',
      actorId: interaction.actingAsGirlId ?? userId,
      realUserId: userId,
      targetType: 'girl',
      targetId: girlId,
      type: getEngagementLogType(interaction.type),
      weight: interaction.xpChange,
    });

    return { success: true };
  } catch (error) {
    console.error(
      `Failed to process interaction for user ${userId} and girl ${girlId}:`,
      error
    );
    return { success: false, error: 'Failed to save interaction summary.' };
  }
}
