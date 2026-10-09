'use server';

import { ai } from '@/ai/genkit';

/**
 * Speech-to-text using Gemini 2.5 Flash
 * Correctly extracts transcript from message.content
 */
export async function speechToText(audioDataUri: string): Promise<string> {
  if (!audioDataUri || typeof audioDataUri !== 'string') {
    return '';
  }

  try {
    const result = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: [
            { text: 'Transcribe this audio. Return ONLY the spoken text.' },
            {
              media: {
                url: audioDataUri,
                contentType: 'audio/webm'
              }
            }
          ]
        }
      ]
    });

    // ⭐ Gemini audio transcription returns text here:
    const content = result?.message?.content;
    const textPart = content?.find((c: any) => c.text)?.text;

    return textPart?.trim() || '';
  } catch (err) {
    console.error('[STT ERROR]', err);
    return '';
  }
}
