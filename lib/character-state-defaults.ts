'use client';

import type { Relationship, Message } from '@/lib/types';

// ---------------------------------------------------------
// DEFAULT RELATIONSHIP STATE
// REMOVED: Cinema / Movie related fields.
// ---------------------------------------------------------
export const initialStats: Relationship = {
  xp: 0,
  confidence: 0,
  interest: 0,
  isOfficial: false,

  relationshipStats: {
    xp: 0,
    confidence: 0,
    interest: 0,
    relationshipStatus: 'stranger',
    relationshipTargetId: '',
  },

  relationshipTier: 'stranger',
  interestCeiling: 'none',

  emotionalState: 'neutral',
  lastTone: 'neutral',
  toneHistory: [],

  lastInteraction: Date.now(),
  silenceHours: 0,
  recentInteractions: [],

  isArgument: false,
  lastToneWasRudeOrDefensive: false,
  userIsReassuring: false,

  userProfileMemory: {
    importantRoles: [],
    customFacts: {},
    nationality: '',
    location: '',
    age: 0,
    occupation: '',
    children: 0,
  },
  chatSummary: null
};

export interface CharacterState {
  messages: Message[];
  stats: Relationship;
}

// ---------------------------------------------------------
// INITIAL CHARACTER STATE
// ---------------------------------------------------------
export const initialState: CharacterState = {
  messages: [],
  stats: initialStats,
};
