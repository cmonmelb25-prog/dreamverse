'use server';

import { db } from '@/lib/firebase-admin';
import { getSafeDate, nuclearSerialize } from '@/lib/utils';
import type {
  FeedPost,
  Reel,
  AuthorSnapshot
} from '@/lib/types';
import { resolveAuthorSnapshot } from './feed';

/**
 * Fetches content authored BY the Resident.
 * STRICT: No identity guessing, no fallback inference.
 */
export async function getGirlActivity(profileId: string): Promise<(FeedPost | Reel)[]> {
  if (!db) return [];

  try {
    const freshAuthor = await resolveAuthorSnapshot(profileId, 'girl');
    const authorCache = new Map<string, AuthorSnapshot>();
    authorCache.set(profileId.toLowerCase(), freshAuthor);

    const [postsSnap, reelsSnap] = await Promise.all([
      db.collection('posts')
        .where('authorId', '==', profileId)
        .limit(15)
        .get(),
      db.collection('reels')
        .where('actorId', '==', profileId)
        .limit(10)
        .get()
    ]);

    const fallbackPostsSnap = await db.collection('posts')
      .where('actorId', '==', profileId)
      .limit(15)
      .get();

    const allPostDocs = [...postsSnap.docs];

    fallbackPostsSnap.docs.forEach(d => {
      if (!allPostDocs.some(existing => existing.id === d.id)) {
        allPostDocs.push(d);
      }
    });

    const posts = allPostDocs.map(doc => {
      const data = doc.data() as any;

      return {
        id: doc.id,
        authorId: profileId,
        actorId: profileId,
        actorType: 'girl',
        author: freshAuthor,
        content: data.content ?? '',
        mediaUrl: data.mediaUrl ?? null,
        mediaPath: data.mediaPath ?? null,
        timestamp: data.timestamp,
        reactions: data.reactions ?? {},
        comments: data.comments || [],
        targetUserId: data.targetUserId || null
      } as unknown as FeedPost;
    });

    const filteredPosts = posts.filter(p => !p.targetUserId);

    const reels = reelsSnap.docs.map(doc => {
      const data = doc.data() as any;

      return {
        id: doc.id,
        actorId: profileId,
        actorType: 'girl',
        author: freshAuthor,
        videoUrl: data.videoUrl ?? '',
        caption: data.caption ?? '',
        timestamp: data.timestamp,
        likes: data.likes || [],
        commentCount: data.commentCount || 0
      } as Reel;
    });

    const combined = [...filteredPosts, ...reels]
      .sort((a, b) => {
        const dateA = getSafeDate(a.timestamp)?.getTime() || 0;
        const dateB = getSafeDate(b.timestamp)?.getTime() || 0;
        return dateB - dateA;
      })
      .slice(0, 15);

    return nuclearSerialize(combined);
  } catch (error) {
    console.error(`Error fetching activity for girl ${profileId}:`, error);
    return [];
  }
}

/**
 * Fetches wall posts made TO the girl.
 */
export async function getGirlWall(profileId: string): Promise<FeedPost[]> {
  if (!db) return [];

  try {
    const wallSnap = await db.collection('posts')
      .where('targetUserId', '==', profileId)
      .limit(15)
      .get();

    const wallPosts: FeedPost[] = [];
    const authorCache = new Map<string, AuthorSnapshot>();

    for (const doc of wallSnap.docs) {
      const data = doc.data() as any;

      const authorId = data.authorId || data.actorId || data.senderId;

      if (!authorId) {
        console.warn(`Missing authorId in post ${doc.id}`);
        continue;
      }

      const actorType =
        data.actorType ||
        data.senderType ||
        'user'; // NO heuristics

      const freshAuthor = await resolveAuthorSnapshot(
        authorId,
        actorType,
        authorCache,
        data.author
      );

      wallPosts.push({
        id: doc.id,
        authorId,
        actorId: authorId,
        actorType,
        author: freshAuthor,
        content: data.content ?? '',
        mediaUrl: data.mediaUrl ?? null,
        mediaPath: data.mediaPath ?? null,
        timestamp: data.timestamp,
        reactions: data.reactions || {},
        comments: data.comments || [],
        targetUserId: profileId
      } as unknown as FeedPost);
    }

    const sortedWall = wallPosts.sort((a, b) => {
      const dateA = getSafeDate(a.timestamp)?.getTime() || 0;
      const dateB = getSafeDate(b.timestamp)?.getTime() || 0;
      return dateB - dateA;
    });

    return nuclearSerialize(sortedWall);
  } catch (error) {
    console.error(`Error fetching wall for girl ${profileId}:`, error);
    return [];
  }
}