// emotion/output-mixer.ts

import { PersonaState } from './types';

export interface OutputMixerInput {
  persona: PersonaState;
  aiGeneratedText: string;        // the model's main reply
  moodExamples: string[];         // mood lines from mood library
  spontaneousSeed?: string | null;
  escalationSeed?: string | null;
}

export interface MixedOutput {
  bubbles: string[];
}

function randomFrom<T>(arr: T[]): T | undefined {
  if (!arr.length) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

function maybeInclude(prob: number): boolean {
  return Math.random() < prob;
}

/**
 * Nationality slang is now handled directly by the LLM.
 * This function is intentionally a no-op to avoid unnatural post-processing.
 */
function applyNationalitySlang(
  text: string,
  persona: PersonaState,
): string {
  return text;
}

export function mixOutput(input: OutputMixerInput): MixedOutput {
  const {
    persona,
    aiGeneratedText,
    moodExamples,
    spontaneousSeed,
    escalationSeed,
  } = input;

  const bubbles: string[] = [];

  // 1. Escalation bubble (rare but always first if present)
  if (escalationSeed && escalationSeed.trim().length > 0) {
    bubbles.push(applyNationalitySlang(escalationSeed, persona));
  }

  // 2. Spontaneous bubble (70% chance)
  if (spontaneousSeed && spontaneousSeed.trim().length > 0 && maybeInclude(0.7)) {
    bubbles.push(applyNationalitySlang(spontaneousSeed, persona));
  }

  // 3. Mood example bubble (50% chance)
  if (moodExamples.length > 0 && maybeInclude(0.5)) {
    const moodLine = randomFrom(moodExamples);
    if (moodLine) {
      bubbles.push(applyNationalitySlang(moodLine, persona));
    }
  }

  // 4. AI-generated main bubble (always included)
  const mainBubble = applyNationalitySlang(aiGeneratedText, persona);
  bubbles.push(mainBubble);

  // 5. Optional second mood bubble (20% chance)
  if (moodExamples.length > 0 && maybeInclude(0.2)) {
    const extra = randomFrom(moodExamples);
    if (extra) {
      bubbles.push(applyNationalitySlang(extra, persona));
    }
  }

  return { bubbles };
}