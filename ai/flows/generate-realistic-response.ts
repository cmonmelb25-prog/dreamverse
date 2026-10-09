'use server'

import { AiRequest, AiResponse } from '@/lib/ai-schemas';
import { moodBasedConversationFlow } from '@/ai/flows/content/mood-based-conversation-flow';

export async function generateRealisticResponse(
  input: AiRequest
): Promise<AiResponse> {
  try {
    const result = await moodBasedConversationFlow(input);

    if (
      !result ||
      typeof result.reply !== 'string' ||
      typeof result.xpChange !== 'number' ||
      typeof result.newMood !== 'string'
    ) {
      console.warn(
        'generateRealisticResponse: Flow returned invalid structure:',
        result
      );

      return {
        reply: "I'm busy at the moment. Talk later",
        xpChange: 1,
        newMood: 'neutral',
      };
    }

    return {
      ...result,
    };
  } catch (err) {
    console.error('generateRealisticResponse ERROR:', err);

    return {
      reply: "I'm busy at the moment. Talk later",
      xpChange: 1,
      newMood: 'neutral',
    };
  }
}