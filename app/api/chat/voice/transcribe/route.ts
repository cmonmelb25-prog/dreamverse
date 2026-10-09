export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';

/**
 * Simple STT endpoint used for client-side transcription preview.
 * Accepts a single audio file (FormData `audio`) and returns JSON { text }
 */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('audio') as File | null;
    if (!file) return NextResponse.json({ error: 'Missing audio' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');

    try {
      const result = await ai.generate({
        model: 'googleai/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              { text: 'Transcribe this audio into plain text.' },
              { media: { url: `data:audio/webm;base64,${base64}`, contentType: 'audio/webm' } },
            ],
          },
        ],
        config: { temperature: 0 },
      });

      const text = (result?.output?.text || result?.text || '').toString().trim();
      return NextResponse.json({ text });
    } catch (sttErr) {
      console.warn('[transcribe] STT failed:', sttErr);
      return NextResponse.json({ text: '' });
    }
  } catch (err: any) {
    console.error('[transcribe] Error:', err);
    return NextResponse.json({ text: '' }, { status: 500 });
  }
}
