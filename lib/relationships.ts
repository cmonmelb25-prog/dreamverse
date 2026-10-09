import { Relationship } from "./types";

/**
 * Provides a clean, valid default relationship object.
 * Fully compatible with RelationshipSchema.
 * STARTING STATS: All set to 0 for a true "Stranger" start.
 * REFINED: Replaced "unknown" strings with empty strings for professional UI.
 */
export function initializeRelationship(): Relationship {
  return {
    xp: 0,
    confidence: 0,
    interest: 0,
    isOfficial: false,

    relationshipStats: {
      xp: 0,
      confidence: 0,
      interest: 0,
      relationshipStatus: "stranger",
      relationshipTargetId: "",
    },

    relationshipTier: "stranger",
    interestCeiling: "none",

    emotionalState: "neutral",
    lastTone: "neutral",
    toneHistory: [],

    lastInteraction: Date.now(),
    silenceHours: 0,
    recentInteractions: [],

    isArgument: false,
    lastToneWasRudeOrDefensive: false,
    userIsReassuring: false,
    chatSummary: null,

    userProfileMemory: {
      importantRoles: [],
      customFacts: {},
      nationality: '',
      location: '',
      age: 0,
      occupation: '',
      children: 0,
    },
  };
}

export type { Relationship };