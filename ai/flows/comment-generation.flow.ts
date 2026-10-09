
'use server'

import { ai } from '@/ai/genkit';
import {
  GenerateRealisticCommentInputSchema,
  GenerateRealisticCommentOutputSchema,
} from '../handlers/comment-schemas';
import { nationalityFlavor } from '@/server/emotion/nationality-flavor';
import type { Nationality } from '@/server/emotion/types';

/**
 * @fileOverview Generates unique, personality-driven comments.
 * Strictly forbids repetitive generic praise and banned terms.
 */

export const generateCommentFlow = ai.defineFlow(
  {
    name: 'generateCommentFlow',
    inputSchema: GenerateRealisticCommentInputSchema,
    outputSchema: GenerateRealisticCommentOutputSchema,
  },

  async (input) => {
    const { post, commentingFriend } = input;

    if (!post || !post.author || !post.content) {
      return { commentText: '❤️' };
    }

    try {
      const flavor = nationalityFlavor[commentingFriend.nationality as Nationality];

      const flavorBlock = flavor
        ? `
### CHARACTER VOICE (Nationality: ${commentingFriend.nationality})
- You MUST use a VERY STRONG regional accent and heavy local slang: ${flavor.slangPlayful?.join(', ') || ''}
- Your speech should be unmistakably ${commentingFriend.nationality}.
- If appropriate for the mood, use affectionate terms: ${flavor.affectionateTerms?.join(', ') || ''}
`
        : `
### CHARACTER VOICE
- Speak with a unique, human, modern tone.
`;

      const systemPrompt = `
You are ${commentingFriend.name}, commenting on a post by your friend ${post.author.name}.

${commentingFriend.name}'s Persona: ${commentingFriend.style?.join(', ') || 'unknown'}
Current Mood: ${commentingFriend.currentMood}

${flavorBlock}

Friend's Post Content: "${post.content}"

**STRICT NEGATIVE RULES**:
1. NEVER say "Looks great!", "Nice photo!", "Good job!", "Looking good!", or any variation of generic praise.
2. NEVER start with "Wow", "Amazing", or "Beautiful".
3. NEVER repeat what someone else would say.
4. DO NOT be generic. 
5. NEVER use terms like "boy please", "goof", or "goofy".

**INSTRUCTIONS**:
1. Write a short, realistic, character-driven comment that actually REACTION to the CONTENT of the post.
2. If they are from the same country, use shared slang.
3. Be cheeky, teasing, questioning, or deeply supportive in a SPECIFIC way.
4. Output ONLY the comment text.
5. 1 sentence max.
`.trim();

      const { output } = await ai.generate({
        model: "googleai/gemini-2.5-pro",
        prompt: systemPrompt,
        config: {
          temperature: 1.3, // High temperature to maximize variety
        }
      });

      let cleaned = typeof output === 'string' ? output.replace(/^"|"$/g, '').trim() : '';

      // Final safety check against the specific generic phrases and banned terms
      const forbidden = ['looks great', 'looking good', 'nice photo', 'amazing', 'wow', 'good job', 'boy please', 'goof', 'goofy'];
      if (!cleaned || forbidden.some(p => cleaned.toLowerCase().includes(p))) {
        const fallbacks = flavor?.slangPlayful || ['✨', '🔥', '❤️'];
        cleaned = fallbacks[Math.floor(Math.random() * fallbacks.length)];
      }

      return {
        commentText: cleaned,
      };
    } catch (error) {
      console.error(`Failed to generate comment from ${commentingFriend.id}:`, error);
      return { commentText: '🔥' };
    }
  }
);
