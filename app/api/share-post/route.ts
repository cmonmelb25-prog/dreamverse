
import { db, adminAuth as auth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import type { FeedPost } from '@/lib/types';
import { cookies } from 'next/headers';
import { serializeFirestore } from '@/lib/utils';
import { createNotification } from '@/server/actions/create-notification';

/**
 * API Route: Share (Repost) a post.
 * Creates a new post entry that references the original content.
 * HARDENED: Uses checkRevoked: false to prevent transient 401s in workstation environments.
 */
export async function POST(req: Request) {
  if (!db || !auth) {
    return NextResponse.json({ success: false, error: 'Server not configured' }, { status: 500 });
  }

  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('__session')?.value;

    if (!sessionCookie) {
      console.log('No session cookie found');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    // STABILITY FIX: Use checkRevoked: false for better resilience to latency in proxy environments.
    const decodedToken = await auth.verifySessionCookie(sessionCookie, false);
    const user = await auth.getUser(decodedToken.uid);
    
    if (!user) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    
    const { postId } = await req.json();

    const originalRef = db.collection('posts').doc(postId);
    const originalSnap = await originalRef.get();

    if (!originalSnap.exists) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    const original = originalSnap.data() as FeedPost;

    // Resolve current user ranks for the author snapshot
    const vipTier = (user.customClaims?.vipTier as any) || 'non-vip';

    const newPostData = {
      author: {
        id: user.uid,
        name: user.displayName ?? 'You',
        profileImageUrl: user.photoURL ?? '',
        promotionTier: vipTier,
        role: 'user',
        nationality: '',
        currentMood: 'Neutral'
      },
      authorId: user.uid,
      actorId: user.uid,
      actorType: 'user',
      content: original.content,
      mediaUrl: original.mediaUrl ?? null,
      mediaPath: original.mediaPath ?? null,
      timestamp: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      isGenerated: false,
      isRepost: true,
      originalPostId: postId,
      originalAuthor: original.author,
      reactions: {},
      comments: [],
    };

    const docRef = await db.collection('posts').add(newPostData);
    const newPostSnapshot = await docRef.get();
    
    const createdPost = { id: docRef.id, ...newPostSnapshot.data() };

    // NOTIFY ORIGINAL AUTHOR
    if (original.author && original.author.id !== user.uid) {
        await createNotification({
            recipientId: original.author.id,
            senderId: user.uid,
            actor: {
                id: user.uid,
                name: user.displayName ?? 'null',
                profileImageUrl: user.photoURL ?? '',
            },
            type: 'system',
            message: `shared ${original.author.name}'s post.`,
            postId: docRef.id
        }).catch(err => console.warn('[share-notification] failed:', err));
    }

    revalidatePath('/feed');

    return NextResponse.json({ 
      success: true, 
      post: serializeFirestore(createdPost) 
    });
  } catch (err) {
    console.error('share-post error:', err);
    if ((err as any).code === 'auth/session-cookie-expired') {
        return NextResponse.json({ success: false, error: 'Authentication session expired. Please log in again.' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
