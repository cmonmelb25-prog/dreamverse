'use server';

import { callVoices } from '@/server/call-voices';

const ELEVENLABS_TTS_MODEL = "eleven_multilingual_v2";

const SILENT_AUDIO_DATA_URI =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

export async function textToSpeech(
  text: string,
  girlId: string
): Promise<{ audio: string }> {
  try {
    // Empty text → silent audio
    if (!text || !text.trim()) {
      return { audio: SILENT_AUDIO_DATA_URI };
    }

    const normalizedId = girlId.toLowerCase();
    const voiceConfig = callVoices[normalizedId];

    if (!voiceConfig) {
      console.error(`Voice config for ${girlId} not found. Returning silent audio.`);
      return { audio: SILENT_AUDIO_DATA_URI };
    }

    const voiceId = voiceConfig.tts.voiceId;
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      console.error('ELEVENLABS_API_KEY not set. Returning silent audio.');
      return { audio: SILENT_AUDIO_DATA_URI };
    }

    // ⭐ Hardened TTS request
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: ELEVENLABS_TTS_MODEL,
          voice_settings: {
            stability: 0.4,
            similarity_boost: 0.8,
          },
        }),
      }
    ).catch((err) => {
      console.error("ElevenLabs fetch failed:", err);
      return null;
    });

    // ⭐ If fetch failed entirely
    if (!response) {
      return { audio: SILENT_AUDIO_DATA_URI };
    }

    // ⭐ If ElevenLabs returns an error status
    if (!response.ok) {
      const errText = await response.text().catch(() => "Unknown error");
      console.error('ElevenLabs TTS error:', errText);
      return { audio: SILENT_AUDIO_DATA_URI };
    }

    // ⭐ Convert to Base64 safely
    let arrayBuffer: ArrayBuffer;
    try {
      arrayBuffer = await response.arrayBuffer();
    } catch (err) {
      console.error("Failed to read ElevenLabs audio buffer:", err);
      return { audio: SILENT_AUDIO_DATA_URI };
    }

    const buffer = Buffer.from(arrayBuffer);
    if (!buffer || buffer.length === 0) {
      console.error("ElevenLabs returned empty audio buffer.");
      return { audio: SILENT_AUDIO_DATA_URI };
    }

    const base64 = buffer.toString('base64');

    return {
      audio: `data:audio/mpeg;base64,${base64}`,
    };
  } catch (err) {
    console.error('ElevenLabs TTS request failed:', err);
    return { audio: SILENT_AUDIO_DATA_URI };
  }
}
