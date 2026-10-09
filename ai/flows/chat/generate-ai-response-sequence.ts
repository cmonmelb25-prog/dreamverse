
'use server';

/**
 * @fileOverview Implements the wrapper function for the multi-bubble chat sequence engine.
 */

import { chat } from './chat-sequence-flow';
import type { AiRequest, AiSequenceResponse, AiReply } from './chat-types';

/**
 * Public-facing wrapper used by the AI router.
 */
export async function generateAiResponseSequence(
  input: AiRequest
): Promise<AiSequenceResponse> {
  try {
    // 1. STRICT INPUT MAPPING TO MATCH chat() CONTRACT
    const flowInput = {
      user: input.user,
      relationship: input.relationship,
      girl: input.girl,
      history: input.history,
      message: input.message,
      mediaUrl: input.mediaUrl,
      isVoiceMessage: input.isVoiceMessage,
    };

    const result = await chat(flowInput, "googleai/gemini-2.5-pro");

    if (!result || !Array.isArray(result.replies) || result.replies.length === 0) {
      throw new Error('Invalid AI response format');
    }

    // 2. NORMALIZE MULTI-BUBBLE OUTPUT INTO AiReply[]
    const replies: AiReply[] = [];
    for (const msg of result.replies) {
      if (!msg) continue;
      if (!msg.text && !msg.mediaUrl) continue;

      const reply: AiReply = {
        text: msg.text ?? undefined,
        mediaUrl: msg.mediaUrl ?? undefined,
        delayMs:
          typeof msg.delayMs === 'number' && msg.delayMs > 0
            ? msg.delayMs
            : 800,
        mood: typeof msg.mood === 'string' ? msg.mood : 'neutral',
      };

      replies.push(reply);
    }

    if (replies.length === 0) {
      throw new Error('AI returned no usable messages');
    }

    // 3. RETURN ONLY FIELDS THAT EXIST ON AiSequenceResponse
    return {
      replies,
      newMood: result.newMood ?? 'neutral',
      inferredUserTone: result.inferredUserTone ?? 'unknown',
      topic: result.topic ?? 'unknown',
    };
  } catch (error) {
    console.error('generateAiResponseSequence ERROR:', error);

    const fallbackReply: AiReply = {
      text: "I'm busy at the moment. Talk later.",
      delayMs: 800,
      mood: 'neutral',
    };

    return {
      replies: [fallbackReply],
      newMood: 'neutral',
      inferredUserTone: 'unknown',
      topic: 'error',
    };
  }
}
