import { NextResponse } from 'next/server';
import { getRecentPosts } from '@/server/actions/feed-actions';
import { serializeFirestore } from '@/lib/utils';

export async function GET(request: Request) {
  try {
    const posts = await getRecentPosts();

    // ⭐ UNIVERSAL FIX: Ensure API boundary is serialized
    return NextResponse.json(serializeFirestore(posts));
  } catch (error) {
    console.error("Error fetching feed:", error);
    return NextResponse.json(
      { error: "Failed to fetch feed data." },
      { status: 500 }
    );
  }
}
