
import { NextResponse } from 'next/server';
import { generateQuirkyPost } from '@/ai/handlers/quirky-post';

/**
 * Isolated API route for Quirky Post generation.
 * This runs in a clean Node environment to prevent OpenTelemetry leaks into Next.js bundles.
 */
export async function POST(req: Request) {
  try {
    const { girlId } = await req.json();
    if (!girlId) return NextResponse.json({ error: 'girlId is required' }, { status: 400 });

    const result = await generateQuirkyPost({ girlId });
    
    // Explicitly return a clean object to ensure no tracing metadata is carried over
    return NextResponse.json({
      postContent: result.postContent,
      mediaUrl: result.mediaUrl
    });
  } catch (error: any) {
    console.error('API Quirky Post Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
