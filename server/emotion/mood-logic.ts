// emotion/mood-logic.ts
import { MoodName, RelationshipTier, InferredTone } from './types';

export type MoodCategory =
  | 'Positive'
  | 'Neutral'
  | 'Reactive'
  | 'Negative'
  | 'Aggressive'
  | 'Flirty';

export const moodCategoryMap: Record<MoodName, MoodCategory> = {
  Affectionate: 'Positive',
  Angry: 'Aggressive',
  Anxious: 'Reactive',
  Attacked: 'Aggressive',
  Bored: 'Neutral',
  Brave: 'Positive',
  Calm: 'Neutral',
  Charismatic: 'Positive',
  Charming: 'Positive',
  Chill: 'Neutral',
  Clingy: 'Reactive',
  'Cold response': 'Aggressive',
  Compassionate: 'Positive',
  Competitive: 'Aggressive',
  Confident: 'Positive',
  Content: 'Positive',
  Contemplative: 'Neutral',
  Creative: 'Positive',
  Curious: 'Positive',
  Cynical: 'Negative',
  Depressed: 'Negative',
  Determined: 'Positive',
  Dreamy: 'Neutral',
  Energetic: 'Positive',
  Excited: 'Positive',
  Exhausted: 'Negative',
  Fiery: 'Aggressive',
  Flirty: 'Flirty',
  Focused: 'Neutral',
  Frustrated: 'Negative',
  Grumpy: 'Negative',
  Guarded: 'Reactive',
  Guilt: 'Negative',
  Happy: 'Positive',
  Hopeful: 'Positive',
  Humble: 'Positive',
  Hypnotic: 'Flirty',
  Indenial: 'Reactive',
  Inspired: 'Positive',
  Jealous: 'Reactive',
  Joyful: 'Positive',
  Lonely: 'Negative',
  Loved: 'Positive',
  Melancholy: 'Negative',
  Mixedemotions: 'Reactive',
  Moody: 'Reactive',
  Mysterious: 'Neutral',
  Negative: 'Negative',
  Neutral: 'Neutral',
  Nostalgic: 'Neutral',
  Nurturing: 'Positive',
  Overwhelmed: 'Negative',
  Paranoid: 'Reactive',
  Passionate: 'Positive',
  Peaceful: 'Neutral',
  Peppy: 'Positive',
  Pickingafight: 'Aggressive',
  Playful: 'Positive',
  Polite: 'Neutral',
  Positive: 'Positive',
  Rebellious: 'Aggressive',
  Romantic: 'Flirty',
  Sad: 'Negative',
  Sarcastic: 'Reactive',
  Sassy: 'Reactive',
  Satisfied: 'Positive',
  Seductive: 'Flirty',
  Sexual: 'Flirty',
  Shy: 'Reactive',
  Soulful: 'Positive',
  Spontaneous: 'Positive',
  Stoic: 'Neutral',
  Sympathetic: 'Positive',
  Teasing: 'Flirty',
  Tough: 'Aggressive',
  Unwanted: 'Negative',
  Upbeat: 'Positive',
  Vibrant: 'Positive',
  Afraid: 'Flirty',
  Defensive: 'Flirty',
  'Mixed emotions': 'Flirty',
  'Picking a fight': 'Flirty',
  Whimsical: 'Flirty',
  Soft: 'Flirty'
};

const silenceEscalation: MoodName[] = [
  'Joyful',
  'Confident',
  'Creative',
  'Affectionate',
  'Energetic',
  'Vibrant',
  'Upbeat',
  'Excited',
  'Playful',
  'Lonely',
  'Shy',
  'Bored',
  'Grumpy',
  'Melancholy',
  'Peaceful',
  'Dreamy',
  'Contemplative',
  'Chill',
  'Cynical',
  'Attacked',
  'Clingy',
  'Cold response',
  'Confident',
  'Exhausted',
  'Flirty',
  'Frustrated',
  'Guilt',
  'Happy',
  'Indenial',
  'Jealous',
  'Loved',
  'Mixedemotions',
  'Negative',
  'Paranoid',
  'Pickingafight',
  'Positive',
  'Sad',
  'Satisfied',
  'Sexual',
  'Spontaneous',
  'Sympathetic',
  'Unwanted',
  'Calm',
  'Overwhelmed',
  'Polite',
];

// ------------------------------
// Silence Escalation
// ------------------------------
export function getSilenceEscalatedMood(
  currentMood: MoodName,
  silenceHours: number,
  tier: RelationshipTier,
): MoodName {
  if (tier === 'stranger' || tier === 'acquaintance') {
    return currentMood;
  }

  const stage =
    silenceHours > 48 ? 5 :
    silenceHours > 36 ? 4 :
    silenceHours > 24 ? 3 :
    silenceHours > 12 ? 2 :
    silenceHours > 4  ? 1 :
    0;

  const targetMood = silenceEscalation[stage] ?? 'Neutral';
  const currentIndex = silenceEscalation.indexOf(currentMood);

  if (currentIndex === -1) return targetMood;
  return stage > currentIndex ? targetMood : currentMood;
}

// ------------------------------
// Tone Reaction
// ------------------------------
export function getToneTriggeredMood(
  currentMood: MoodName,
  tone: InferredTone,
  tier: RelationshipTier,
): MoodName {
  switch (tone) {
    case 'cold':
    case 'distant':
      return (
        tier === 'friend' ||
        tier === 'acquaintance' ||
        tier === 'close friends' ||
        tier === 'relationship'
      )
        ? 'Anxious'
        : currentMood;

    case 'defensive':
      return 'Guarded';

    case 'rude':
      return 'Attacked';

    case 'sweet':
      return 'Affectionate';

    case 'playful':
      return 'Playful';

    case 'flirty':
      return 'Flirty';

    case 'sad':
      return 'Sad';

    default:
      return currentMood;
  }
}

// ------------------------------
// Recovery
// ------------------------------
export function getRecoveredMood(currentMood: MoodName): MoodName {
  switch (currentMood) {
    case 'Jealous':
      return 'Affectionate';

    case 'Guarded':
      return 'Calm';

    case 'Attacked':
      return 'Sad';

    case 'Anxious':
      return 'Grumpy';

    default:
      return currentMood;
  }
}