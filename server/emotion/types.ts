// -----------------------------
// ENUMS & BASIC TYPES
// -----------------------------

export type MoodName =
  | 'Affectionate'
  | 'Afraid'
  | 'Angry'
  | 'Anxious'
  | 'Attacked'
  | 'Bored'
  | 'Brave'
  | 'Calm'
  | 'Charismatic'
  | 'Charming'
  | 'Chill'
  | 'Clingy'
  | 'Cold response'
  | 'Compassionate'
  | 'Competitive'
  | 'Confident'
  | 'Content'
  | 'Contemplative'
  | 'Creative'
  | 'Curious'
  | 'Cynical'
  | 'Defensive'
  | 'Depressed'
  | 'Determined'
  | 'Dreamy'
  | 'Energetic'
  | 'Excited'
  | 'Exhausted'
  | 'Fiery'
  | 'Flirty'
  | 'Focused'
  | 'Frustrated'
  | 'Grumpy'
  | 'Guarded'
  | 'Guilt'
  | 'Happy'
  | 'Hopeful'
  | 'Humble'
  | 'Hypnotic'
  | 'Indenial'
  | 'Inspired'
  | 'Jealous'
  | 'Joyful'
  | 'Lonely'
  | 'Loved'
  | 'Melancholy'
  | 'Mixed emotions'
  | 'Mixedemotions'
  | 'Moody'
  | 'Mysterious'
  | 'Negative'
  | 'Neutral'
  | 'Nostalgic'
  | 'Nurturing'
  | 'Overwhelmed'
  | 'Paranoid'
  | 'Passionate'
  | 'Peaceful'
  | 'Peppy'
  | 'Picking a fight'
  | 'Pickingafight'
  | 'Playful'
  | 'Polite'
  | 'Positive'
  | 'Rebellious'
  | 'Romantic'
  | 'Sad'
  | 'Sarcastic'
  | 'Sassy'
  | 'Satisfied'
  | 'Seductive'
  | 'Sexual'
  | 'Shy'
  | 'Soulful'
  | 'Spontaneous'
  | 'Stoic'
  | 'Sympathetic'
  | 'Teasing'
  | 'Tough'
  | 'Unwanted'
  | 'Upbeat'
  | 'Vibrant'
  | 'Whimsical'
  | 'Soft';

export type RelationshipTier =
  | 'stranger'
  | 'acquaintance'
  | 'friend'
  | 'close friends'
  | 'relationship';

export type InferredTone =
  | 'rude'
  | 'defensive'
  | 'cold'
  | 'distant'
  | 'sweet'
  | 'playful'
  | 'flirty'
  | 'sad'
  | 'neutral';

export type Nationality =
  | 'Ukrainian'
  | 'Australian'
  | 'British'
  | 'Latina'
  | 'American'
  | 'Swedish'
  | 'Italian'
  | 'Singapore'
  | 'Russian'
  | 'Greek'
  | 'Filipino'
  | 'Egyptian'
  | 'Brazilian'
  | 'Spanish';

// -----------------------------
// RELATIONSHIP STATS
// -----------------------------

export interface RelationshipStats {
  xp: number;
  confidence: number;
  interest: number;
}

// -----------------------------
// MOOD STATE
// -----------------------------

export interface MoodState {
  mood: MoodName;
  intensity: number;
  volatility: number;
  lastShift: number;
}

// -----------------------------
// SPONTANEOUS CONTEXT
// -----------------------------

export interface SpontaneousContext {
  mood: MoodName;
  relationshipTier: RelationshipTier;
  silenceHours: number;
  lastToneWasRudeOrDefensive: boolean;
  confidence: number;
  interest: number;
}

// -----------------------------
// PERSONA STATE
// -----------------------------

export interface PersonaState {
  // --- Core Identity (BACKSTORY LOCK) ---
  name: string;
  age: number;
  nationality: Nationality;
  location: string;
  occupation: string;
  bio: string;
  style: string[];
  hobbies: string[];
  interests: string[];
  examples: {
    chat: string;
  };

  // --- Dynamic State ---
  mood: MoodName;
  emotionalState: MoodState;
  relationshipTier: RelationshipTier;
  relationshipStats: RelationshipStats;
  promotionTier?: 'non-vip' | 'vip';

  // --- Emotional Memory ---
  toneHistory: string[];
  silenceHours: number;
  isArgument: boolean;
  lastToneWasRudeOrDefensive: boolean;
  userIsReassuring: boolean;
  lastInteraction: number | null;
  
  // Spontaneous Context
  spontaneousContext?: SpontaneousContext;

  // Optional memory expansions
  recentInteractions?: any[];

  // LONG TERM MEMORY: User Profile Facts (Never adopt these)
  userProfileMemory?: {
    nationality?: string;
    location?: string;
    age?: number;
    occupation?: string;
    children?: number;
    importantRoles?: string[];
    customFacts?: Record<string, any>;
  };
}

// -----------------------------
// SYSTEM PROMPT INPUT
// -----------------------------

export interface SystemPromptInput {
  persona: PersonaState;
  moodExamples: string[];
  spontaneousSeed?: string | null;
  escalationSeed?: string | null;
}

// -----------------------------
// TONE CONTEXT
// -----------------------------

export interface ToneContext {
  inferredTone: InferredTone;
  silenceHours: number;
  isArgument: boolean;
}
