import { PersonaState, RelationshipTier, MoodName } from './types';
import { buildSystemPrompt } from './system-prompt';

/**
 * @fileOverview Orchestrates the AI input generation.
 * INJECTS: identity, bio, occupation, location, and personality rules.
 */

export interface InputBuilderOptions {
  persona: PersonaState;
  moodExamples: string[];
  spontaneousMessage?: string | null;
  escalationMessage?: string | null;
  userMessage: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface ModelInput {
  system: string;
  messages: Array<{ role: 'user' | 'model'; text: string }>;
  metadata: {
    mood: string;
    nationality: string;
    relationshipTier: RelationshipTier;
    xp: number;
  };
}

export function buildAIInput(options: InputBuilderOptions): ModelInput {
  const {
    persona,
    moodExamples,
    spontaneousMessage,
    escalationMessage,
    userMessage,
    conversationHistory = [],
  } = options;

  // 1. Generate the Hard-Locked System Prompt
  const systemPrompt = buildSystemPrompt({
    persona,
    moodExamples,
    spontaneousSeed: spontaneousMessage ?? null,
    escalationSeed: escalationMessage ?? null,
  });

  const messages: Array<{ role: 'user' | 'model'; text: string }> = [];

  // 2. Synchronize conversation history (max 20)
  const trimmedHistory = conversationHistory.slice(-20);
  for (const msg of trimmedHistory) {
    messages.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      text: msg.content,
    });
  }

  // 3. Inject latest user turn
  messages.push({ role: 'user', text: userMessage });

  return {
    system: systemPrompt,
    messages,
    metadata: {
      mood: persona.mood,
      nationality: persona.nationality,
      relationshipTier: persona.relationshipTier,
      xp: persona.relationshipStats.xp,
    },
  };
}
