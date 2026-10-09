import { allGirls } from './girls-data';
import type { AIGirl, RelationshipMemory } from '@/lib/types';
import { db } from '@/lib/firebase-admin';
import { normalizeAIGirl } from '@/lib/normalizeAIGirl';
import { serializeFirestore, isUidPattern } from '@/lib/utils';

/**
 * Hydrates a raw relationship object into a fully-typed RelationshipMemory.
 * FIXED: Included chatSummary property to resolve TS2741 error.
 */
function hydrateRelationship(rel: any = {}): RelationshipMemory {
  const xp = rel.xp ?? rel.relationshipStats?.xp ?? 0;
  const confidence = rel.confidence ?? rel.relationshipStats?.confidence ?? 0;
  const interest = rel.interest ?? rel.relationshipStats?.interest ?? 0;
  const relStatus = rel.relationshipTier ?? rel.relationshipStats?.relationshipStatus ?? 'stranger';
  const targetId = rel.relationshipTargetId ?? rel.relationshipStats?.relationshipTargetId ?? '';

  return {
    xp,
    confidence,
    interest,
    isOfficial: rel.isOfficial ?? false,
    relationshipStats: {
      xp,
      confidence,
      interest,
      relationshipStatus: relStatus,
      relationshipTargetId: targetId,
    },
    relationshipTier: relStatus as any,
    interestCeiling: rel.interestCeiling ?? 'none',
    emotionalState: rel.emotionalState ?? 'neutral',
    lastTone: rel.lastTone ?? 'neutral',
    toneHistory: Array.isArray(rel.toneHistory) ? rel.toneHistory : [],
    lastInteraction: typeof rel.lastInteraction === 'number' ? rel.lastInteraction : Date.now(),
    silenceHours: rel.silenceHours ?? 0,
    recentInteractions: Array.isArray(rel.recentInteractions) ? rel.recentInteractions : [],
    isArgument: rel.isArgument ?? false,
    lastToneWasRudeOrDefensive: rel.lastToneWasRudeOrDefensive ?? false,
    userIsReassuring: rel.userIsReassuring ?? false,
    chatSummary: rel.chatSummary ?? null,
    userProfileMemory: {
      importantRoles: rel.userProfileMemory?.importantRoles || [],
      customFacts: rel.userProfileMemory?.customFacts || {},
      nationality: rel.userProfileMemory?.nationality || '',
      location: rel.userProfileMemory?.location || '',
      age: rel.userProfileMemory?.age || 0,
      occupation: rel.userProfileMemory?.occupation || '',
      children: rel.userProfileMemory?.children || 0,
    },
  };
}

/**
 * Fetches a profile by ID. 
 * OPTIMIZED: Strictly uses static library for identity and backstory.
 */
export async function getGirl(id: string): Promise<any | null> {
  if (!id || id === 'me') return null;

  const isTechnicalId = isUidPattern(id);
  
  if (!isTechnicalId) {
    const staticConfig = allGirls.find(
      g => g.id.toLowerCase() === id.toLowerCase()
    );

    if (staticConfig) {
      const staticGirl = normalizeAIGirl(staticConfig);
      try {
        if (!db) return staticGirl;
        
        const doc = await db.collection('aiGirls').doc(staticGirl.id).get();
        
        if (doc.exists) {
          const data = doc.data() || {};
          const merged = {
            ...staticGirl,
            currentMood: data.currentMood || staticGirl.currentMood,
            onlineStatus: data.onlineStatus || staticGirl.onlineStatus,
            xp: data.xp || staticGirl.xp,
            relationshipStatus: data.relationshipStatus || staticGirl.relationshipStatus,
            relationshipTargetId: data.relationshipTargetId || staticGirl.relationshipTargetId,
            theme: data.theme || staticGirl.theme || null,
            relationship: hydrateRelationship(data.relationship || {})
          };
          return serializeFirestore(merged);
        }
      } catch (err) {}
      return staticGirl;
    }
  }

  try {
    if (db) {
      const userDoc = await db.collection('users').doc(id).get();
      if (userDoc.exists) {
        const data = userDoc.data() as any;
        
        const name = data.displayName || data.username || '';
        if (isUidPattern(name)) {
            data.displayName = 'Discovery Member';
        }

        return serializeFirestore({ uid: id, role: 'user', ...data });
      }
    }
  } catch (err) {}

  return null;
}