// TYPES
export type MoodMessage = {
  text: string;
  channel?: 'chat' | 'post' | 'push';
};

export interface MoodSequence {
  messages: MoodMessage[];
  cooldown?: number;
  escalateTo?: string;
}
export const moodSequences: Record<string, MoodSequence> = {
  affectionate: { messages: [], cooldown: 0 },
  angry: { messages: [], cooldown: 0 },
  anxious: { messages: [], cooldown: 0 },
  bored: { messages: [], cooldown: 0 },
  content: { messages: [], cooldown: 0 },
  creative: { messages: [], cooldown: 0 },
  curious: { messages: [], cooldown: 0 },
  depressed: { messages: [], cooldown: 0 },
  dreamy: { messages: [], cooldown: 0 },
  energetic: { messages: [], cooldown: 0 },
  excited: { messages: [], cooldown: 0 },
  exhausted: { messages: [], cooldown: 0 },
  fiery: { messages: [], cooldown: 0 },
  flirty: { messages: [], cooldown: 0 },
  focused: { messages: [], cooldown: 0 },
  frustrated: { messages: [], cooldown: 0 },
  grumpy: { messages: [], cooldown: 0 },
  guarded: { messages: [], cooldown: 0 },
  guilt: { messages: [], cooldown: 0 },
  happy: { messages: [], cooldown: 0 },
  humble: { messages: [], cooldown: 0 },
  hypnotic: { messages: [], cooldown: 0 },
  indenial: { messages: [], cooldown: 0 },
  inspired: { messages: [], cooldown: 0 },
  jealous: { messages: [], cooldown: 0 },
  joyful: { messages: [], cooldown: 0 },
  lonely: { messages: [], cooldown: 0 },
  loved: { messages: [], cooldown: 0 },
  melancholy: { messages: [], cooldown: 0 },
  mixedemotions: { messages: [], cooldown: 0 },
  moody: { messages: [], cooldown: 0 },
  mysterious: { messages: [], cooldown: 0 },
  negative: { messages: [], cooldown: 0 },
  neutral: { messages: [], cooldown: 0 },
  nostalgic: { messages: [], cooldown: 0 },
  nurturing: { messages: [], cooldown: 0 },
  overwhelmed: { messages: [], cooldown: 0 },
  paranoid: { messages: [], cooldown: 0 },
  passionate: { messages: [], cooldown: 0 },
  peaceful: { messages: [], cooldown: 0 },
  peppy: { messages: [], cooldown: 0 },
  pickingafight: { messages: [], cooldown: 0 },
  playful: { messages: [], cooldown: 0 },
  polite: { messages: [], cooldown: 0 },
  positive: { messages: [], cooldown: 0 },
  rebellious: { messages: [], cooldown: 0 },
  romantic: { messages: [], cooldown: 0 },
  sad: { messages: [], cooldown: 0 },
  sarcastic: { messages: [], cooldown: 0 },
  sassy: { messages: [], cooldown: 0 },
  satisfied: { messages: [], cooldown: 0 },
  seductive: { messages: [], cooldown: 0 },
  sexual: { messages: [], cooldown: 0 },
  shy: { messages: [], cooldown: 0 },
  soulful: { messages: [], cooldown: 0 },
  spontaneous: { messages: [], cooldown: 0 },
  stoic: { messages: [], cooldown: 0 },
  sympathetic: { messages: [], cooldown: 0 },
  teasing: { messages: [], cooldown: 0 },
  tough: { messages: [], cooldown: 0 },
  unwanted: { messages: [], cooldown: 0 },
  upbeat: { messages: [], cooldown: 0 },
  vibrant: { messages: [], cooldown: 0 },
};
// RELATIONSHIP-BASED MOOD ACCESS RULES
export const moodAccess = {
  stranger: [
    "neutral", "polite", "curious", "shy", "guarded"
  ],
  acquaintance: [
    "happy", "playful", "bored", "content", "upbeat", "sarcastic"
  ],
  friend: [
    "sad", "lonely", "excited", "frustrated", "affectionate", "anxious"
  ],
  "close friends": [
    "flirty", "vulnerable", "jealous", "angry", "guilt", "depressed", "loved", "seductive"
  ],
  relationship: [
    "flirty", "vulnerable", "jealous", "angry", "guilt", "depressed", "loved", "seductive"
  ],
} as const;

// GET ALL ALLOWED MOODS FOR A RELATIONSHIP LEVEL
export function getAllowedMoods(level: string): string[] {
  const levels = ["stranger", "acquaintance", "friend", "close friends", "relationship"] as const;
  const index = levels.indexOf(level as any);

  if (index === -1) return [...new Set(moodAccess["stranger"])];

  let allowed: string[] = [];
  for (let i = 0; i <= index; i++) {
    allowed.push(...moodAccess[levels[i]]);
  }

  return [...new Set(allowed)];
}

// CHECK IF A MOOD IS ALLOWED FOR A LEVEL
export function isMoodAllowed(mood: string, level: string): boolean {
  return getAllowedMoods(level).includes(mood.toLowerCase());
}
