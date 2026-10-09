import {
  MoodName,
  Nationality,
  RelationshipTier,
  RelationshipStats,
  PersonaState,
} from './types';

/**
 * Builds the comprehensive PersonaState from Resident config and dynamic stats.
 * ENSURES: Identity, Bio, Job, and Style are locked into the engine.
 */
export function buildPersonaState(input: {
  id: string;
  name: string;
  age?: number;
  bio?: string;
  location?: string;
  nationality: Nationality;
  occupation?: string;
  style?: string[];
  hobbies?: string[];
  interests?: string[];
  examples?: { chat: string };
  mood: MoodName;
  relationshipTier: RelationshipTier;
  relationshipStats: RelationshipStats;
  promotionTier?: 'non-vip' | 'vip';
}): PersonaState {

  const normalizedMood = (
    input.mood.charAt(0).toUpperCase() + input.mood.slice(1)
  ) as MoodName;

  const stats: RelationshipStats = {
    xp: input.relationshipStats?.xp ?? 0,
    confidence: input.relationshipStats?.confidence ?? 50,
    interest: input.relationshipStats?.interest ?? 50,
  };

  return {
    // --- Immutable Identity ---
    name: input.name,
    age: input.age ?? 25,
    nationality: input.nationality,
    location: input.location ?? 'DreamVerse',
    occupation: input.occupation ?? 'Resident',
    bio: input.bio ?? '',
    style: input.style ?? [],
    hobbies: input.hobbies ?? [],
    interests: input.interests ?? [],
    examples: input.examples ?? { chat: '' },

    // --- Dynamic Engine State ---
    mood: normalizedMood,
    emotionalState: {
      mood: normalizedMood,
      intensity: 0.5,
      volatility: 0.2,
      lastShift: Date.now(),
    },
    relationshipTier: input.relationshipTier,
    relationshipStats: stats,
    promotionTier: input.promotionTier,

    // --- Memory ---
    toneHistory: [],
    silenceHours: 0,
    isArgument: false,
    lastToneWasRudeOrDefensive: false,
    userIsReassuring: false,
    lastInteraction: Date.now(),
    recentInteractions: [],
    userProfileMemory: {
      importantRoles: [],
      customFacts: {},
    },
  };
}
