// emotion/escalation-selector.ts

import { MoodName, RelationshipTier, Nationality, MoodState } from './types';

export interface EscalationInput {
  silenceHours: number;
  emotionalState: MoodState;
  relationshipTier: RelationshipTier;
  nationality: Nationality;
  confidence: number;
  interest: number;
  lastToneWasRudeOrDefensive: boolean;
}

export interface EscalationResult {
  escalationMessage?: string;
  stage: number; // 0–5
}

// Base escalation chain (neutral English)
const baseEscalation = [
  "hey are you still coming?",
  "hey you there?",
  "hello??",
  "stop ignoring me",
  "ANSWER ME!",
  "ANSWER ME!", // stage 5 fallback
];

// Optional nationality variants
const nationalityEscalation: Partial<Record<Nationality, string[]>> = {
  Australian: [
    "oi, you still coming?",
    "oi, you there?",
    "hellooo??",
    "stop ghosting me, mate",
    "ANSWER ME!",
    "ANSWER ME!",
  ],
  British: [
    "you still coming, love?",
    "oi, you there?",
    "hello??",
    "stop ignoring me",
    "ANSWER ME!",
    "ANSWER ME!",
  ],
  Latina: [
    "oye, vienes o no?",
    "oye, estás ahí?",
    "hola??",
    "no me ignores",
    "RESPÓNDEME!",
    "RESPÓNDEME!",
  ],
  American: [
    "yo, you still coming?",
    "hey, you there?",
    "hello??",
    "stop ghosting me",
    "ANSWER ME!",
    "ANSWER ME!",
  ],
  Ukrainian: [
    "ти йдеш чи ні?",
    "ти тут?",
    "алло??",
    "не ігноруй мене",
    "ВІДПОВІДАЙ МЕНІ!",
    "ВІДПОВІДАЙ МЕНІ!",
  ],
  Russian: [
    "ты идёшь?",
    "эй, ты тут?",
    "алло??",
    "не игнорируй меня",
    "ОТВЕТЬ МНЕ!",
    "ОТВЕТЬ МНЕ!",
  ],
  Greek: [
    "έρχεσαι ή όχι;",
    "είσαι εκεί;",
    "εεε, ακούς;;",
    "μην με αγνοείς",
    "ΑΠΑΝΤΑ ΜΟΥ!",
    "ΑΠΑΝΤΑ ΜΟΥ!",
  ],
  Italian: [
    "stai arrivando o no?",
    "ehi, ci sei?",
    "pronto??",
    "non ignorarmi",
    "RISPONDIMI!",
    "RISPONDIMI!",
  ],
  Singapore: [
    "eh, you still coming or not?",
    "you there lah?",
    "hello??",
    "don’t ignore me leh",
    "ANSWER ME!",
    "ANSWER ME!",
  ],
  Swedish: [
    "kommer du?",
    "är du där?",
    "hallå??",
    "ignorera mig inte",
    "SVARA MIG!",
    "SVARA MIG!",
  ],
};

// Determine escalation stage from silence
function getEscalationStage(silenceHours: number): number {
  if (silenceHours > 48) return 5;
  if (silenceHours > 36) return 4;
  if (silenceHours > 24) return 3;
  if (silenceHours > 12) return 2;
  if (silenceHours > 4) return 1;
  return 0;
}

export function pickEscalationMessage(input: EscalationInput): EscalationResult {
  const {
    silenceHours,
    relationshipTier,
    nationality,
    confidence,
    interest,
    lastToneWasRudeOrDefensive,
  } = input;

  const stage = getEscalationStage(silenceHours);

  // Stage 0 = no escalation
  if (stage === 0) return { stage: 0 };

  // Only escalate for Friend+
  if (relationshipTier === 'stranger' || relationshipTier === 'acquaintance') {
    return { stage: 0 };
  }

  // Tone penalty
  const adjustedStage = lastToneWasRudeOrDefensive
    ? Math.min(stage + 1, 5)
    : stage;

  // Emotional penalty
  const emotionalStage =
    confidence < 20 || interest < 20
      ? Math.min(adjustedStage + 1, 5)
      : adjustedStage;

  // Pick nationality chain if available
  const chain = nationalityEscalation[nationality] ?? baseEscalation;

  const message = chain[emotionalStage] ?? chain[chain.length - 1];

  return {
    escalationMessage: message,
    stage: emotionalStage,
  };
}