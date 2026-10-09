
'use server'
/**
 * @fileOverview Defines the Genkit flow for mood-based single, structured content generation.
 * This file should be imported only once, by its wrapper function.
 */

import { ai } from '@/ai/genkit';
import { AiRequestSchema, RealisticReplySchema } from '@/lib/ai-schemas';
import { createSystemPrompt } from '@/server/prompts';
import type { AIGirl, RelationshipMemory } from '@/lib/types';

export const moodBasedConversationFlow = ai.defineFlow(
  {
    name: 'moodBasedConversationFlow',
    inputSchema: AiRequestSchema,
    outputSchema: RealisticReplySchema,
  },

  async (input) => {
    const { message, characterProfile, relationshipMemory, pastInteractions, userName, userVipStatus } = input;

    if (!characterProfile) {
      console.error('Flow input missing:', { characterProfile });
      throw new Error('Character profile is required.');
    }

    const mood = characterProfile.currentMood || 'neutral';

    const systemPrompt = createSystemPrompt({
      mode: 'chat',
      girl: characterProfile as any,
      relationship: relationshipMemory as unknown as RelationshipMemory,
      userName,
      userVipStatus,
      message,
      pastInteractions
    });

    try {
      const { output } = await ai.generate({
        model: "googleai/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content: [
              { text: systemPrompt }
            ]
          }
        ],
        output: { schema: RealisticReplySchema },
        config: { temperature: 0.9 },
      });

      if (!output || typeof output.reply !== 'string') {
        console.error('Invalid mood flow output:', output);
        throw new Error('Flow failed to generate a valid output.');
      }

      return {
        reply: output.reply.trim(),
        xpChange: typeof output.xpChange === 'number' ? output.xpChange : 0,
        newMood: output.newMood ?? mood,
      };

    } catch (error) {
      console.error('moodBasedConversationFlow ERROR:', error);

      return {
        reply: "I'm a little busy right now… try again soon.",
        xpChange: 1,
        newMood: mood,
      };
    }
  }
);
