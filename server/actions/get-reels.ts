
'use server';

import { db } from '@/lib/firebase-admin';
import type { Reel, AuthorSnapshot } from '@/lib/types';
import { serializeFirestore, getCanonicalGirlId, nuclearSerialize } from '@/lib/utils';
import { resolveAuthorSnapshot } from './feed';
import { allGirls } from '@/lib/server/girls-data';

type GetReelsParams = {
  limit?: number;
};

type GetReelsResult = {
  reels?: Reel[];
  error?: string;
};

/**
 * Fetches comment count for a reel without loading content.
 */
async function fetchCommentCount(reelId: string): Promise<number> {
  if (!db) return 0;
  try {
    const snap = await db
      .collection('reels')
      .doc(reelId)
      .collection('comments')
      .count()
      .get();
    return snap.data().count || 0;
  } catch {
    return 0;
  }
}

/**
 * Retrieves the latest reels with parallelized identity and metadata resolution.
 * PERFORMANCE: Uses Promise.all to avoid sequential await loops.
 */
export async function getReels({
  limit: queryLimit = 20,
}: GetReelsParams): Promise<GetReelsResult> {
  if (!db) {
    return nuclearSerialize({ reels: [] });
  }

  try {
    const snapshot = await db
      .collection('reels')
      .orderBy('timestamp', 'desc')
      .limit(queryLimit)
      .get();

    if (snapshot.empty) {
      return nuclearSerialize({ reels: [] });
    }

    const authorCache = new Map<string, AuthorSnapshot>();

    // ⚡ CONCURRENCY ENGINE: Resolve all reels in parallel
    const reels = await Promise.all(snapshot.docs.map(async (doc) => {
      const rawData = doc.data();
      if (!rawData) return null;

      const authorRaw = (rawData.author && typeof rawData.author === 'object') ? rawData.author : {};
      const text = rawData.caption ?? rawData.text ?? '';
      const actorId = rawData.actorId || authorRaw.id || '';
      const actorType = rawData.actorType || (authorRaw.role === 'aigirl' ? 'girl' : 'user');

      // 1. Resolve Identity
      const canonicalId = getCanonicalGirlId(actorId);
      const isResident = allGirls.some(g => g.id === canonicalId);

      let finalAuthor = authorRaw as AuthorSnapshot;

      if (isResident || !finalAuthor?.id || !finalAuthor?.name || finalAuthor.name === 'Unknown') {
        finalAuthor = await resolveAuthorSnapshot(
          canonicalId || actorId,
          actorType === 'user' ? 'user' : 'girl',
          authorCache
        );
      }

      // 2. Resolve Metadata
      const commentCount = await fetchCommentCount(doc.id);

      return {
        id: doc.id,
        actorId,
        actorType,
        author: finalAuthor,
        videoUrl: rawData.videoUrl ?? '',
        caption: text,
        timestamp: rawData.timestamp,
        likes: Array.isArray(rawData.likes) ? rawData.likes : [],
        commentCount,
      } as Reel;
    }));

    const validReels = reels.filter((r): r is Reel => r !== null);

    return nuclearSerialize({ reels: validReels });
  } catch (error: any) {
    console.error('Error fetching reels:', error);
    return nuclearSerialize({ error: 'Failed to fetch reels' });
  }
}
