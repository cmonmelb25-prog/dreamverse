
import { NextResponse } from 'next/server';
import { getGeneratedComments } from '@/ai/handlers/comments';

/**
 * Isolated API route for Comment generation.
 * Prevents Genkit tracing objects from polluting the Feed post data.
 */
export async function POST(req: Request) {
  try {
    const { post, friendGirlIds } = await req.json();
    
    if (!post || !friendGirlIds) {
      return NextResponse.json({ error: 'post and friendGirlIds are required' }, { status: 400 });
    }

    const comments = await getGeneratedComments(post, friendGirlIds);
    
    return NextResponse.json({ comments });
  } catch (error: any) {
    console.error('API Generate Comments Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
