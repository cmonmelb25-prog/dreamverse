'use server';

import { textToSpeech } from '@/ai/flows/tts-flow';

/**
 * A server-side wrapper for the Text-to-Speech generation flow.
 * @param text The text to convert to speech.
 * @param girlId The ID of the girl whose voice should be used.
 * @returns A Base64-encoded string of the audio data.
 */
export async function generateTTS(text: string, girlId: string): Promise<string> {
  const { audio: audioDataUri } = await textToSpeech(text, girlId);

  if (!audioDataUri || !audioDataUri.startsWith('data:audio/')) {
    throw new Error('TTS generation failed or returned invalid data URI.');
  }

  // Extract the Base64 part of the data URI
  const base64Data = audioDataUri.split(',')[1];
  return base64Data;
}
