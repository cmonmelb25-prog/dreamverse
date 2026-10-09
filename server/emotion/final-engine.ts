'use server';

// emotion/final-engine.ts

import { PersonaState, InferredTone } from './types';
import { trimHistory } from './history-manager';
import { updatePersonaEmotion } from './update-mood';
import { pickEscalationMessage } from './escalation-selector';
import { buildAIInput } from './input-builder';
import { mixOutput } from './output-mixer';
import { ai } from '@/ai/genkit';
import { z } from 'zod';

export interface FinalEngineInput {
  persona: PersonaState;
  userMessage: string;
  history: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }>;
  moodExamples: string[];
  toneContext: {
    inferredTone: InferredTone;
    silenceHours: number;
    isArgument: boolean;
    lastToneWasRudeOrDefensive: boolean;
    userIsReassuring: boolean;
  };
}

export interface FinalEngineResult {
  updatedPersona: PersonaState;
  bubbles: string[];
  metadata: any;
}

export async function runFinalEngine(
  input: FinalEngineInput,
): Promise<FinalEngineResult> {
  const {
    persona,
    userMessage,
    history,
    moodExamples,
    toneContext,
  } = input;

  // 1. Trim history (consistent with input-builder)
  const trimmedHistory = trimHistory(history, {
    maxMessages: 20,
    maxMinutes: 120,
  });

  // 2. Silence escalation
  const escalation = pickEscalationMessage({
    silenceHours: toneContext.silenceHours,
    emotionalState: persona.emotionalState,
    relationshipTier: persona.relationshipTier,
    nationality: persona.nationality,
    confidence: persona.relationshipStats.confidence,
    interest: persona.relationshipStats.interest,
    lastToneWasRudeOrDefensive: toneContext.lastToneWasRudeOrDefensive,
  });

  const escalationSeed = escalation?.escalationMessage ?? null;

  // 3. Mood update
  const moodUpdate = updatePersonaEmotion({
    persona,
    toneContext,
    userIsReassuring: toneContext.userIsReassuring,
    lastToneWasRudeOrDefensive: toneContext.lastToneWasRudeOrDefensive,
  });

  const updatedPersona = moodUpdate.updatedPersona;

  // 4. Build AI input
  const aiInput = buildAIInput({
    persona: updatedPersona,
    moodExamples: moodExamples ?? [],
    spontaneousMessage: moodUpdate.spontaneousMessage,
    escalationMessage: escalationSeed,
    userMessage,
    conversationHistory: trimmedHistory,
  });

  // 5. Call Gemini
  const { output: aiResponse } = await ai.generate({
    model: "googleai/gemini-2.5-pro",
    system: aiInput.system,
    messages: aiInput.messages.map(m => ({
      role: m.role,
      content: [{ text: m.text }],
    })),
    output: {
      schema: z.object({
        reply: z.string().describe("The character reply."),
      }),
    },
    config: {
      temperature: 0.9,
    },
  });

  const replyText = aiResponse?.reply;
  if (!replyText || typeof replyText !== 'string' || !replyText.trim()) {
    throw new Error('AI failed to generate a response.');
  }

  // 6. Mix output into multi-bubble messages
  const mixed = mixOutput({
    persona: updatedPersona,
    aiGeneratedText: replyText,
    moodExamples: moodExamples ?? [],
    spontaneousSeed: moodUpdate.spontaneousMessage,
    escalationSeed,
  });

  return {
    updatedPersona,
    bubbles: mixed.bubbles,
    metadata: {
      mood: updatedPersona.mood,
      relationshipTier: updatedPersona.relationshipTier,
      nationality: updatedPersona.nationality,
      xp: updatedPersona.relationshipStats.xp,
      confidence: updatedPersona.relationshipStats.confidence,
      interest: updatedPersona.relationshipStats.interest,
      spontaneousUsed: Boolean(moodUpdate.spontaneousMessage),
      escalationUsed: Boolean(escalationSeed),
      escalationStage: escalation?.stage ?? null,
    },
  };
}
