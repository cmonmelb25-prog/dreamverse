import type { Relationship } from '@/lib/types';

const initialStats: Relationship = {
  xp: 0,
  confidence: 0,
  interest: 0,
  isOfficial: false,

  relationshipStats: {
    xp: 0,
    confidence: 0,
    interest: 0,
    relationshipStatus: 'single',
    relationshipTargetId: '',
  },

  relationshipTier: 'stranger',
  interestCeiling: 'none',

  emotionalState: 'neutral',
  lastTone: 'neutral',
  toneHistory: [],

  lastInteraction: 0,
  silenceHours: 0,
  recentInteractions: [],

  isArgument: false,
  lastToneWasRudeOrDefensive: false,
  userIsReassuring: false,


  userProfileMemory: {
    importantRoles: [],
    customFacts: {},
  },
  chatSummary: null
};
