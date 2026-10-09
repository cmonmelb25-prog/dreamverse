'use server';

import { db } from '@/lib/firebase-admin';
import { getSafeDate, nuclearSerialize } from '@/lib/utils';
import type { FeedPost, Reel } from '@/lib/types';
import { resolveAuthorSnapshot } from './feed';

/**
 * Fetches activity authored BY the user.
 * HARDENED: Identity resolution is forced + safe fallback.
 */
export async function getUserActivity(
  userId: string
): Promise<(FeedPost | Reel)[]> {
  if (!db || !userId) return [];

  try {
    const freshAuthor =
      (await resolveAuthorSnapshot(userId, 'user')) ?? {
        id: userId,
        name: 'User',
        role: 'user',
      };

    const [postsSnap, reelsSnap] = await Promise.all([
      db
        .collection('posts')
        .where('authorId', '==', userId)
        .limit(10)
        .get(),
      db
        .collection('reels')
        .where('actorId', '==', userId)
        .limit(10)
        .get(),
    ]);

    const posts: FeedPost[] = postsSnap.docs.map((doc) => {
      const data = doc.data() as any;

      return {
        id: doc.id,
        actorId: userId,
        actorType: 'user',
        author: freshAuthor,
        content: data?.content ?? '',
        mediaUrl: data?.mediaUrl ?? null,
        mediaPath: data?.mediaPath ?? null,
        timestamp: data?.timestamp ?? null,
        reactions: data?.reactions ?? {},
        comments: [],
        targetUserId: data?.targetUserId ?? null,
      };
    });

    const filteredPosts = posts.filter((p) => !p.targetUserId);

    const reels: Reel[] = reelsSnap.docs.map((doc) => {
      const data = doc.data() as any;

      return {
        id: doc.id,
        actorId: userId,
        actorType: 'user',
        author: freshAuthor,
        videoUrl: data?.videoUrl ?? '',
        caption: data?.caption ?? '',
        timestamp: data?.timestamp ?? null,
        likes: [],
        commentCount: 0,
      };
    });

    const combined = [...filteredPosts, ...reels]
      .sort((a, b) => {
        const aTime = getSafeDate(a.timestamp)?.getTime() ?? 0;
        const bTime = getSafeDate(b.timestamp)?.getTime() ?? 0;
        return bTime - aTime;
      })
      .slice(0, 15);

    return nuclearSerialize(combined);
  } catch (error) {
    console.error('[getUserActivity] error:', error);
    return [];
  }
}

/**
 * Fetches wall posts made ON the user's wall.
 */
export async function getUserWall(userId: string): Promise<FeedPost[]> {
  if (!db || !userId) return [];

  try {
    const wallSnap = await db
      .collection('posts')
      .where('targetUserId', '==', userId)
      .limit(10)
      .get();

    const wallPosts: FeedPost[] = await Promise.all(
      wallSnap.docs.map(async (doc) => {
        const data = doc.data() as any;

        const authorId = data?.authorId || data?.author?.id;
        const actorType =
          data?.actorType ||
          (authorId?.length < 15 ? 'girl' : 'user');

        const freshAuthor = await resolveAuthorSnapshot(
          authorId,
          actorType,
          undefined,
          data?.author
        );

        return {
          id: doc.id,
          authorId,
          actorType,
          author: freshAuthor,
          content: data?.content ?? '',
          mediaUrl: data?.mediaUrl ?? null,
          mediaPath: data?.mediaPath ?? null,
          timestamp: data?.timestamp ?? null,
          reactions: data?.reactions ?? {},
          comments: [],
        } as unknown as FeedPost;
      })
    );

    return nuclearSerialize(
      wallPosts.sort((a, b) => {
        const aTime = getSafeDate(a.timestamp)?.getTime() ?? 0;
        const bTime = getSafeDate(b.timestamp)?.getTime() ?? 0;
        return bTime - aTime;
      })
    );
  } catch (error) {
    console.error('[getUserWall] error:', error);
    return [];
  }
}