import type { Relationship } from "@/lib/types";
import { serializeFirestore } from '@/lib/utils';
import { relationshipLevels } from "./relationship-levels";

/**
 * Normalizes raw relationship memory into a fully typed Relationship object.
 * Ensures all fields match RelationshipSchema and never return undefined.
 * PROTOCOL: Absolute Narrative Horizon (ANH). Removed all associated reduction logic.
 * NARRATIVE: Memory context is preserved exactly as perceived by the Resident.
 */
export function normalizeRelationship(raw: any): Relationship {
  const g = serializeFirestore(raw) || {};
  
  const rawTier = (g.relationshipTier || g.relationshipStats?.relationshipStatus || "stranger").toLowerCase();

  let xp = g.xp ?? g.relationshipStats?.xp ?? 0;
  if (xp < 0) xp = 0;

  let finalTier: Relationship["relationshipTier"] = "stranger";
  if (rawTier.includes("acquaintance")) finalTier = "acquaintance";
  else if (rawTier.includes("friend") && !rawTier.includes("close friends")) finalTier = "friend";
  else if (rawTier.includes("close friends")) finalTier = "close friends";
  else if (rawTier.includes("relationship") || rawTier.includes("exclusive") || rawTier.includes("partner")) finalTier = "relationship";

  const levelMatch = relationshipLevels.find(l => l.name === finalTier);
  if (levelMatch && xp < levelMatch.xpThreshold) {
    xp = levelMatch.xpThreshold;
  }

  const isOfficial = g.isOfficial === true || finalTier === "relationship";

  const confidence = g.confidence ?? g.relationshipStats?.confidence ?? 50;
  const interest = g.interest ?? g.relationshipStats?.interest ?? 50;

  return {
    xp,
    confidence,
    interest,

    relationshipStats: {
      xp,
      confidence,
      interest,
      relationshipStatus: finalTier,
      relationshipTargetId: g.relationshipStats?.relationshipTargetId ?? g.relationshipTargetId ?? "",
    },

    relationshipTier: finalTier,

    interestCeiling:
      g.interestCeiling === "none"
        ? "none"
        : g.interestCeiling === "friend"
        ? "friend"
        : g.interestCeiling === "high"
        ? "high"
        : "romantic",

    emotionalState: g.emotionalState || g.currentMood || "Neutral",
    lastTone: g.lastTone ?? "neutral",
    toneHistory: Array.isArray(g.toneHistory) ? g.toneHistory : [],

    lastInteraction: typeof g.lastInteraction === "number" ? g.lastInteraction : Date.now(),
    silenceHours: g.silenceHours ?? 0,

    isArgument: g.isArgument ?? false,
    lastToneWasRudeOrDefensive: g.lastToneWasRudeOrDefensive ?? false,
    userIsReassuring: g.userIsReassuring ?? false,

    isOfficial,

    recentInteractions: Array.isArray(g.recentInteractions) ? g.recentInteractions : [],
    
    chatSummary: g.chatSummary ?? null,

    userProfileMemory: {
      preferredName: g.userProfileMemory?.preferredName || null,
      nationality: g.userProfileMemory?.nationality || null,
      location: g.userProfileMemory?.location || null,
      age: typeof g.userProfileMemory?.age === 'number' ? g.userProfileMemory.age : null,
      occupation: g.userProfileMemory?.occupation || null,
      children: typeof g.userProfileMemory?.children === 'number' ? g.userProfileMemory.children : null,
      importantRoles: Array.isArray(g.userProfileMemory?.importantRoles) ? g.userProfileMemory.importantRoles : [],
      customFacts: g.userProfileMemory?.customFacts || {},
    },
  };
}
