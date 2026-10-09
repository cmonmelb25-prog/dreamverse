// emotion/spontaneous-engine.ts
import { MoodName, RelationshipTier, Nationality,  } from './types';
import { spontaneousMessages, SpontaneousContext, moodSpecificSpontaneous } from './spontaneous';
import { nationalityFlavor } from './nationality-flavor';

function randomFrom<T>(arr: T[]): T | undefined {
  if (!arr.length) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

export function isSpontaneousAllowed(input: SpontaneousContext): boolean {
  const {
    relationshipTier,
    silenceHours,
    lastToneWasRudeOrDefensive,
    confidence,
    interest,
  } = input;

  // Match chat ping route (45s → 48h)
  if (silenceHours < 0.0125 || silenceHours > 48) return false;

  // Only block if user was rude
  if (lastToneWasRudeOrDefensive) return false;

  // allow almost always
  if (confidence < 3 || interest < 3) return false;

  return true;
}

function buildSpontaneousPool(mood: MoodName): string[] {
  const base: string[] = [];

  base.push(...(spontaneousMessages.general ?? []));

  // Buckets by vibe
  const m = mood as string;
  if (['Playful', 'Whimsical', 'Sassy'].includes(m)) {
    base.push(...(spontaneousMessages.playful ?? []));
  }
  if (['Curious', 'Mysterious', 'Focused'].includes(m)) {
    base.push(...(spontaneousMessages.curious ?? []));
  }
  if (['Dreamy', 'Nostalgic', 'Melancholy'].includes(m)) {
    base.push(...(spontaneousMessages.dreamy ?? []));
  }
  if (['Bored', 'Lonely'].includes(m)) {
    base.push(...(spontaneousMessages.bored ?? []));
  }
  if (['Affectionate', 'Nurturing', 'Loved'].includes(m)) {
    base.push(...(spontaneousMessages.affectionate ?? []));
  }

  // Exact mood-specific overrides
  if (moodSpecificSpontaneous[m]) {
    base.push(...moodSpecificSpontaneous[m]);
  }

  return Array.from(new Set(base));
}

function applyNationalityFlavor(
  text: string,
  nationality: Nationality,
  tier: RelationshipTier,
): string {
  const flavor = nationalityFlavor[nationality];
  if (!flavor) return text;

  const { affectionateTerms, slangPlayful, slangAnnoyed } = flavor;

  const canAffection =
    tier === 'close friends' || tier === 'relationship';

  // 1. Affectionate terms (higher tiers only)
  const affection =
    canAffection && affectionateTerms?.length
      ? randomFrom(affectionateTerms)
      : undefined;

  if (affection && Math.random() < 0.35) {
    return `${text} ${affection}.`;
  }

  // 2. Playful slang
  if (slangPlayful?.length && Math.random() < 0.25) {
    const slang = randomFrom(slangPlayful);
    if (slang) return `${text} ${slang}`;
  }

  // 3. Annoyed slang
  if (slangAnnoyed?.length && Math.random() < 0.2) {
    const slang = randomFrom(slangAnnoyed);
    if (slang) return `${text} ${slang}`;
  }

  return text;
}

export interface SpontaneousPickInput {
  mood: MoodName;
  nationality: Nationality;
  relationshipTier: RelationshipTier;
}

export function pickSpontaneousMessageForPersona(
  input: SpontaneousPickInput,
): string | undefined {
  const pool = buildSpontaneousPool(input.mood);
  const base = randomFrom(pool);
  if (!base) return undefined;

  return applyNationalityFlavor(base, input.nationality, input.relationshipTier);
}