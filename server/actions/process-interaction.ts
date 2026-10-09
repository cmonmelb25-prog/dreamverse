'use server';

/**
 * @fileOverview The Master Relationship Engine.
 * This file handles all XP gains, level-ups, and stat synchronization
 * between the user and the AI character.
 * HARDENED: Uses serverTimestamp exclusively for temporal integrity.
 */

import { db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { InteractionSummary, Engagement } from '@/lib/types';
import { getOrInitializeRelationship, saveRelationship } from '@/lib/server/relationships';
import { logEngagement } from '@/server/actions/engagement-actions';
import { getRelationshipLevelInfo } from '@/lib/relationship-levels';

type ProcessableInteractionType =
  | 'chat'
  | 'voice_call'
  | 'video_call'
  | 'feed_react'
  | 'feed_comment'
  | 'reel_like'
  | 'reel_comment'
  | 'mini_movie';

function getInteractionSummaryMode(
  type: ProcessableInteractionType
): InteractionSummary['mode'] {
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

function getEngagementLogType(
  type: ProcessableInteractionType
): Engagement['type'] {
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
    case 'mini_movie':
      return 'mini_movie';
    default:
      return 'chat';
  }
}

/**
 * Updates both the per-user relationship memory AND the global AI girl state.
 * Syncs currentMood and emotionalState to ensure consistency.
 */
export async function processInteraction(
  realUserId: string,
  targetGirlId: string,
  interaction: {
    type: ProcessableInteractionType;
    xpChange: number;
    topic: string;
    inferredUserTone?: string;
    newMood?: string | null;
    newRelationshipStatus?: 'relationship' | 'single';
    actingAsGirlId?: string | null;
  }
) {
  const dbInstance = db;
  if (!dbInstance) {
    return { success: false, error: 'Database not initialized.' };
  }

  try {
    // 1. Update relationship state (local to the user)
    const relationship = await getOrInitializeRelationship(realUserId, targetGirlId);

    const summary: any = {
      id: crypto.randomUUID(),
      type: interaction.type,
      timestamp: FieldValue.serverTimestamp(),
      mode: getInteractionSummaryMode(interaction.type),
      summary: interaction.topic,
      mood: interaction.newMood ?? (relationship as any).emotionalState ?? 'Neutral',
      userTone: interaction.inferredUserTone ?? 'neutral',
      inferredUserTone: interaction.inferredUserTone ?? 'neutral',
    };

    // Maintain interaction history
    (relationship as any).recentInteractions = [
      summary,
      ...((relationship as any).recentInteractions || []),
    ].slice(0, 50);

    // 2. XP & STATS CALCULATION
    const xpChange = interaction.xpChange || 0;
    const currentXp = (relationship as any).xp ?? (relationship as any).relationshipStats?.xp ?? 0;
    const newXp = Math.max(0, currentXp + xpChange);
    
    (relationship as any).xp = newXp;
    (relationship as any).relationshipStats.xp = newXp;
    
    // Dynamic Stat Scaling (Base starting at 0)
    const currentConfidence = (relationship as any).confidence ?? 0;
    const currentInterest = (relationship as any).interest ?? 0;
    
    let confidenceChange = 0;
    let interestChange = 0;

    if (xpChange > 0) {
      confidenceChange = Math.ceil(xpChange / 3);
      interestChange = Math.ceil(xpChange / 2);
    } else if (xpChange < 0) {
      confidenceChange = Math.floor(xpChange / 2);
      interestChange = xpChange;
    }

    (relationship as any).confidence = Math.max(0, Math.min(100, currentConfidence + confidenceChange));
    (relationship as any).interest = Math.max(0, Math.min(100, currentInterest + interestChange));
    
    // Mirror to nested stats
    (relationship as any).relationshipStats.confidence = (relationship as any).confidence;
    (relationship as any).relationshipStats.interest = (relationship as any).interest;
    
    // Handle "Official" Status
    if (interaction.newRelationshipStatus === 'relationship') {
        (relationship as any).isOfficial = true;
        
        const userRef = dbInstance.collection('users').doc(realUserId);
        const girlRef = dbInstance.collection('aiGirls').doc(targetGirlId);
        
        await Promise.all([
            userRef.update({
                relationshipStatus: `dating:${targetGirlId}`,
                relationshipTargetId: targetGirlId
            }),
            girlRef.update({
                relationshipStatus: `dating:${realUserId}`,
                relationshipTargetId: realUserId
            })
        ]);
    }

    // 3. LEVEL & TIER RESOLUTION
    const levelInfo = getRelationshipLevelInfo((relationship as any).xp, (relationship as any).isOfficial);
    (relationship as any).relationshipTier = levelInfo.name;

    // 4. MOOD SYNCHRONIZATION
    if (interaction.newMood) {
      const finalMood = interaction.newMood.charAt(0).toUpperCase() + interaction.newMood.slice(1);
      (relationship as any).emotionalState = finalMood;
      
      // Update global AI girl state
      const girlRef = dbInstance.collection('aiGirls').doc(targetGirlId);
      await girlRef.update({ currentMood: finalMood });
    }

    (relationship as any).lastInteraction = FieldValue.serverTimestamp();

    // Only update lastMessageAt for actual chat/call interactions
    if (['chat', 'voice_call', 'video_call'].includes(interaction.type)) {
        (relationship as any).lastMessageAt = FieldValue.serverTimestamp();
    }

   

    // 5. PERSISTENCE
    await saveRelationship(realUserId, targetGirlId, relationship);

    // 6. ANALYTICS LOGGING
    await logEngagement({
      actorType: interaction.actingAsGirlId ? 'girl' : 'user',
      actorId: interaction.actingAsGirlId ?? realUserId,
      realUserId: realUserId,
      targetType: 'girl',
      targetId: targetGirlId,
      type: getEngagementLogType(interaction.type),
      weight: interaction.xpChange,
    });

    return { success: true };
  } catch (error) {
    console.error(
      `Failed to process interaction for user ${realUserId} and girl ${targetGirlId}:`,
      error
    );
    return { success: false, error: 'Failed to save interaction summary.' };
  }
}