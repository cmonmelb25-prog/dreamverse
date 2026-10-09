
// emotion/update-mood.ts
import { PersonaState, ToneContext, InferredTone, SpontaneousContext } from './types';
import { getSilenceEscalatedMood, getToneTriggeredMood, getRecoveredMood } from './mood-logic';
import { applyToneRelationshipDelta } from './relationship-engine';
import { isSpontaneousAllowed, pickSpontaneousMessageForPersona } from './spontaneous-engine';

export interface MoodUpdateInput {
  persona: PersonaState;
  toneContext: ToneContext;
  userIsReassuring: boolean;
  lastToneWasRudeOrDefensive: boolean;
}

export interface MoodUpdateResult {
  updatedPersona: PersonaState;
  reason: string;
  spontaneousMessage?: string;
}

export function updatePersonaEmotion(
  input: MoodUpdateInput,
): MoodUpdateResult {
  const { persona, toneContext, userIsReassuring, lastToneWasRudeOrDefensive } = input;
  const { inferredTone, silenceHours, isArgument } = toneContext;

  let mood = persona.mood;

  // 1. Silence escalation
  mood = getSilenceEscalatedMood(mood, silenceHours, persona.relationshipTier);

  // 2. Tone reaction
  mood = getToneTriggeredMood(mood, inferredTone, persona.relationshipTier);

  // 3. Recovery
  if (userIsReassuring) {
    mood = getRecoveredMood(mood);
  }

  // 4. Relationship stats
  const relationshipStats = applyToneRelationshipDelta(
    persona.relationshipStats,
    inferredTone,
    isArgument,
  );

  const updatedPersona: PersonaState = {
    ...persona,
    mood,
    emotionalState: {
      ...persona.emotionalState,
      mood: mood,
      lastShift: Date.now(),
    },
    relationshipStats,
  };

  // 5. Optional spontaneous ping
  let spontaneousMessage: string | undefined;

  const spontaneousContext: SpontaneousContext = {
    mood,
    relationshipTier: updatedPersona.relationshipTier,
    silenceHours,
    lastToneWasRudeOrDefensive,
    confidence: relationshipStats.confidence,
    interest: relationshipStats.interest,
  };

  updatedPersona.spontaneousContext = spontaneousContext;

  if (isSpontaneousAllowed(spontaneousContext)) {
    spontaneousMessage = pickSpontaneousMessageForPersona({
      mood,
      nationality: updatedPersona.nationality,
      relationshipTier: updatedPersona.relationshipTier,
    });
  }

  return {
    updatedPersona,
    reason: `silence=${silenceHours}h, tone=${inferredTone}, reassuring=${userIsReassuring}`,
    spontaneousMessage,
  };
}
