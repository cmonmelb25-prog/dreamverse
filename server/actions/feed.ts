'use server';

import { db, adminAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import type {
  FeedPost,
  AuthorSnapshot,
  ReactionActor,
  Comment
} from '@/lib/types';
import { serializeFirestore, nuclearSerialize, getCanonicalGirlId, isUidPattern } from '@/lib/utils';
import { getPlaceholderImage } from '@/lib/placeholder';
import { allGirls } from '@/lib/server/girls-data';

/**
 * IDENTITY RE-HYDRATION ENGINE
 * Returns a lean author snapshot suitable for UI rendering.
 * OPTIMIZED: Immediately returns static data for Residents to save DB trips.
 */
export async function resolveAuthorSnapshot(
  inputActorId: string | null | undefined,
  actorTypeHint?: 'user' | 'girl' | 'aigirl' | null | undefined,
  cache?: Map<string, AuthorSnapshot>,
  fallbackData?: any
): Promise<AuthorSnapshot> {
  const activeCache = cache || new Map<string, AuthorSnapshot>();
  
  // 1. RESOLVE THE BEST RAW ID
  const rawId = inputActorId || fallbackData?.id || fallbackData?.uid || fallbackData?.authorId || fallbackData?.actorId;

  if (!rawId) {
    return {
      id: 'unknown',
      name: 'Friend',
      profileImageUrl: getPlaceholderImage('fallback'),
      role: 'user',
      nationality: 'American',
      currentMood: 'Neutral'
    };
  }

  const actorId = rawId.toString();
  const canonicalId = getCanonicalGirlId(actorId) || actorId;
  const cacheKey = canonicalId.toLowerCase();
  
  if (activeCache.has(cacheKey)) return activeCache.get(cacheKey)!;

  // 2. STATIC RESIDENT FAST PATH (ZERO DB TRIPS)
  const staticGirl = allGirls.find(sg => sg.id.toLowerCase() === canonicalId.toLowerCase());
  
  if (staticGirl) {
    const author: AuthorSnapshot = {
      id: staticGirl.id,
      name: staticGirl.name,
      profileImageUrl: staticGirl.media.profileImageUrl,
      nationality: staticGirl.nationality || 'American',
      promotionTier: staticGirl.promotionTier || 'non-vip',
      role: 'aigirl',
      currentMood: fallbackData?.currentMood || 'Neutral'
    };
    activeCache.set(cacheKey, author);
    return author;
  }

  // 3. AUTHORITATIVE DATA GUARD (FOR USERS)
  // If we have valid fallback metadata that isn't a UID, use it.
  const isSuspiciousName = !fallbackData?.name || 
                           fallbackData.name === null || 
                           fallbackData.name === null || 
                           isUidPattern(fallbackData.name);

  if (
    fallbackData?.id &&
    fallbackData?.name &&
    !isSuspiciousName &&
    fallbackData?.profileImageUrl
  ) {
    const author: AuthorSnapshot = {
      id: fallbackData.id,
      name: fallbackData.name,
      profileImageUrl: fallbackData.profileImageUrl,
      role: fallbackData.role || (actorTypeHint === 'girl' || actorTypeHint === 'aigirl' ? 'aigirl' : 'user'),
      nationality: fallbackData.nationality || '',
      currentMood: fallbackData.currentMood || 'Neutral',
      promotionTier: fallbackData.promotionTier || 'non-vip',
      isAdmin: fallbackData.isAdmin || false
    };
    activeCache.set(cacheKey, author);
    return author;
  }

  // 4. FIRESTORE IDENTITY RECOVERY (FOR USERS ONLY)
  if (db) {
    try {
      const userSnap = await db.collection('users').doc(canonicalId).get();
      if (userSnap.exists) {
        const u = userSnap.data() as any;
        
        let resolvedName = u.displayName || u.username || null;
        if (isUidPattern(resolvedName)) resolvedName = null;

        const author: AuthorSnapshot = {
          id: canonicalId,
          name: resolvedName,
          profileImageUrl: u.photoURL || u.profileImageUrl || getPlaceholderImage(canonicalId),
          role: 'user',
          currentMood: 'Neutral',
          promotionTier: 'non-vip',
          nationality: u.nationality || '',
          isAdmin: !!u.isAdmin
        };
        activeCache.set(cacheKey, author);
        return author;
      }
    } catch (e) {
      console.warn(`[Identity] Sync failed for ${canonicalId}`);
    }
  }

  // FINAL FALLBACK
  const author: AuthorSnapshot = {
    id: canonicalId,
    name: (actorTypeHint === 'girl' || actorTypeHint === 'aigirl' || canonicalId.length < 15) ? 'null' : 'null',
    profileImageUrl: getPlaceholderImage(canonicalId),
    role: (actorTypeHint === 'girl' || actorTypeHint === 'aigirl' || canonicalId.length < 15) ? 'aigirl' : 'user',
    currentMood: 'Neutral',
    promotionTier: 'non-vip',
    nationality: ''
  };
  
  activeCache.set(cacheKey, author);
  return author;
}

export async function deleteCommentAction(
  postId: string,
  commentId: string,
  actorId: string
): Promise<{ success: boolean; error?: string }> {
  if (!db) return { success: false, error: 'Database not initialized.' };
  try {
    const postRef = db.collection('posts').doc(postId);
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(postRef);
      if (!doc.exists) throw new Error('Post not found.');
      const data = doc.data() as FeedPost;
      const comments = data.comments || [];
      const updatedComments = comments.filter(c => c.id !== commentId && c.parentId !== commentId);
      transaction.update(postRef, { comments: updatedComments });
    });
    revalidatePath('/feed');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addCommentReaction(
  postId: string,
  commentId: string,
  emoji: string,
  actor: ReactionActor
): Promise<{ success: boolean; error?: string }> {
  if (!db) return { success: false, error: 'Database not initialized.' };
  try {
    const postRef = db.collection('posts').doc(postId);
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(postRef);
      if (!doc.exists) return;
      const data = doc.data() as FeedPost;
      const comments = data.comments || [];
      const updatedComments = comments.map(c => {
        if (c.id !== commentId) return c;
        const reactions = { ...(c.reactions || {}) };
        let previousEmoji: string | null = null;
        for (const key in reactions) {
          const actors = reactions[key];
          const idx = actors.findIndex((r: any) => r.actorId === actor.actorId);
          if (idx > -1) {
            previousEmoji = key;
            actors.splice(idx, 1);
            if (actors.length === 0) delete reactions[key];
            break;
          }
        }
        if (previousEmoji !== emoji) {
          if (!reactions[emoji]) reactions[emoji] = [];
          reactions[emoji].push({
            actorId: actor.actorId,
            actorType: actor.actorType,
            id: actor.id,
            name: actor.name,
            profileImageUrl: actor.profileImageUrl,
            author: actor.author
          });
        }
        return { ...c, reactions };
      });
      transaction.update(postRef, { comments: updatedComments });
    });
    revalidatePath('/feed');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deletePost(
  postId: string,
  actorId: string,
  trueUserId: string | null
): Promise<{ success: boolean; error?: string }> {
  if (!db || !adminAuth) return { success: false, error: 'Firebase Admin not initialized.' };
  try {
    const postRef = db.collection('posts').doc(postId);
    const postDoc = await postRef.get();
    if (!postDoc.exists) return { success: false, error: 'Post not found.' };
    const postData = postDoc.data() as FeedPost;
    if (postData?.author?.id === actorId || postData?.authorId === actorId) {
      await postRef.delete();
      revalidatePath('/feed');
      return { success: true };
    }
    if (trueUserId) {
      const user = await adminAuth.getUser(trueUserId);
      if (user?.customClaims?.admin === true) {
        await postRef.delete();
        revalidatePath('/feed');
        return { success: true };
      }
    }
    return { success: false, error: 'Permission denied.' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addCommentAction({
  postId,
  actorId,
  actorType,
  realUserId,
  text,
  parentId,
}: {
  postId: string;
  actorId: string;
  actorType: 'user' | 'girl';
  realUserId?: string | null;
  text: string;
  parentId: string | null;
}): Promise<{ success: boolean; comment?: any; error?: string }> {
  if (!db) return { success: false, error: 'Database not initialized.' };
  try {
    const postRef = db.collection('posts').doc(postId);
    const postDoc = await postRef.get();
    if (!postDoc.exists) return { success: false, error: 'Post not found.' };
    const author = await resolveAuthorSnapshot(actorId, actorType);
    const newComment: Comment = {
      id: db.collection('posts').doc().id,
      name: author.name,
      profileImageUrl: author.profileImageUrl,
      postId,
      actorId,
      actorType,
      realUserId: realUserId ?? undefined,
      author,
      text,
      reactions: {},
      timestamp: Date.now(),
      parentId: parentId ?? null,
    };
    await postRef.update({
      comments: FieldValue.arrayUnion(newComment)
    });
    revalidatePath('/feed');
    return nuclearSerialize({ success: true, comment: serializeFirestore(newComment) });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addReaction(
  postId: string,
  emoji: string,
  actor: ReactionActor,
  postAuthorId: string
) {
  if (!db) return;
  const postRef = db.collection('posts').doc(postId);
  try {
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(postRef);
      if (!doc.exists) return;
      const data = doc.data() as FeedPost;
      const reactions = data.reactions || {};
      let previousEmoji: string | null = null;
      for (const key in reactions) {
        const actors = reactions[key];
        const idx = actors.findIndex((r: any) => r.actorId === actor.actorId);
        if (idx > -1) { 
          previousEmoji = key; 
          actors.splice(idx, 1); 
          if (reactions[key].length === 0) delete reactions[key]; 
          break; 
        } 
      }
      if (previousEmoji !== emoji) {
        if (!reactions[emoji]) reactions[emoji] = []; 
        reactions[emoji].push({
          actorId: actor.actorId,
          actorType: actor.actorType,
          id: actor.id,
          name: actor.name,
          profileImageUrl: actor.profileImageUrl,
          author: actor.author
        });
      }
      transaction.update(postRef, { reactions });
    });
    revalidatePath('/feed');
  } catch (error) {}
}
