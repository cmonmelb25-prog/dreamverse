'use server';

import { db, adminAuth } from '@/lib/firebase-admin';
import type { Reel, Comment, ReactionActor } from '@/lib/types';
import { serializeFirestore } from '@/lib/utils';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { logEngagement } from './engagement-actions';
import { createNotification } from './create-notification';

export async function deleteReel(
  reelId: string,
  actorId: string
): Promise<{ success: boolean; error?: string }> {
  if (!db || !adminAuth) {
    return { success: false, error: 'Firebase Admin not initialized.' };
  }

  try {
    const reelRef = db.collection('reels').doc(reelId);
    const reelDoc = await reelRef.get();

    if (!reelDoc.exists) {
      return { success: false, error: 'Reel not found.' };
    }

    const reelData = reelDoc.data() as Reel;
    const user = await adminAuth.getUser(actorId).catch(() => null);
    const isAdmin = user?.customClaims?.admin === true;

    if (reelData.author.id !== actorId && !isAdmin) {
      return { success: false, error: 'Permission denied.' };
    }

    await reelRef.delete();
    revalidatePath('/reels');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting reel:', error);
    return { success: false, error: 'Could not delete reel.' };
  }
}

export async function addReelLike(
  reelId: string,
  actor: ReactionActor
): Promise<{ success: boolean; error?: string }> {
  if (!db) return { success: false, error: 'Database not initialized.' };

  try {
    const reelRef = db.collection('reels').doc(reelId);
    
    let isNewLike = false;

    await db.runTransaction(async (transaction: { get: (arg0: any) => any; update: (arg0: any, arg1: { likes: ReactionActor[]; }) => void; }) => {
      const doc = await transaction.get(reelRef);
      if (!doc.exists) return;

      const data = doc.data() as Reel;
      const likes = data.likes || [];
      
      const existingIndex = likes.findIndex(l => l.actorId === actor.actorId);

      if (existingIndex > -1) {
        likes.splice(existingIndex, 1);
      } else {
        likes.push(actor);
        isNewLike = true;
      }

      transaction.update(reelRef, { likes });
    });

    const finalDoc = await reelRef.get();
    const reelData = finalDoc.data() as Reel;

    if (isNewLike && actor.actorId !== reelData.author.id && reelData.author.role === 'aigirl') {
      await logEngagement({
        actorType: actor.actorType,
        actorId: actor.actorId,
        targetType: 'girl',
        targetId: reelData.author.id,
        type: 'reaction',
        weight: 1,
      });

      await createNotification({
        recipientId: reelData.author.id,
        senderId: actor.actorId,
        actor: {
          id: actor.actorId,
          name: actor.author?.name ?? null,
          profileImageUrl: actor.author?.profileImageUrl ?? '',
        },
        type: 'reel_like',
        message: 'liked your reel.',
        reelId: reelId,
      });
    }

    revalidatePath('/reels');
    return { success: true };
  } catch (error: any) {
    console.error('Error adding reel like:', error);
    return { success: false, error: 'Failed to update like.' };
  }
}

export async function addReelComment(
  reelId: string,
  comment: Omit<Comment, 'id' | 'timestamp' | 'replies'>
): Promise<{ success: boolean; comment?: Comment; error?: string }> {
  if (!db) return { success: false, error: 'Database not initialized.' };

  const reelRef = db.collection('reels').doc(reelId);

  try {
    const safeAuthor = {
      id: comment.author.id,
      name: comment.author.name,
      profileImageUrl: comment.author.profileImageUrl || '',
      currentMood: comment.author.currentMood,
      role: comment.author.role,
      promotionTier: comment.author.promotionTier
    };

    const newComment = {
      id: crypto.randomUUID(),
      reelId,
      author: safeAuthor,
      actorId: comment.actorId,
      actorType: comment.actorType,
      realUserId: comment.realUserId ?? null,
      name: comment.author.name,
      profileImageUrl: comment.author.profileImageUrl || '',
      text: comment.text,
      reactions: {},
      timestamp: Date.now(),
      parentId: comment.parentId ?? null,
    };

    await reelRef
    .collection("comments")
    .doc(newComment.id)
    .set(newComment);

    const reelDoc = await reelRef.get();
    const reelData = reelDoc.data() as Reel;

    if (comment.author.id !== reelData.author.id && reelData.author.role === 'aigirl') {
      await logEngagement({
        actorType: comment.actorType,
        actorId: comment.author.id,
        targetType: 'girl',
        targetId: reelData.author.id,
        type: 'comment',
        weight: 3,
      });

      await createNotification({
        recipientId: reelData.author.id,
        senderId: comment.actorId,
        actor: safeAuthor,
        type: 'reel_comment',
        message: `commented on your reel.`,
        reelId: reelId,
      });
    }

    revalidatePath('/reels');
    return { success: true, comment: serializeFirestore(newComment) };
  } catch (error: any) {
    console.error('Error adding reel comment:', error);
    return { success: false, error: 'Failed to add comment.' };
  }
}

export async function deleteReelComment(
  reelId: string,
  commentId: string,
  actorId: string
): Promise<{ success: boolean; error?: string }> {
  if (!db || !adminAuth) return { success: false, error: 'Firebase Admin not initialized.' };

  const reelRef = db.collection('reels').doc(reelId);
  const commentRef = reelRef.collection("comments").doc(commentId);

  try {
    const commentDoc = await commentRef.get();
    if (!commentDoc.exists) {
      return { success: false, error: "Comment not found." };
    }

    const commentData = commentDoc.data() as Comment;

    // Permission check
    const user = await adminAuth.getUser(actorId).catch(() => null);
    const isAdmin = user?.customClaims?.admin === true;

    if (commentData.author.id !== actorId && !isAdmin) {
      return { success: false, error: "Permission denied." };
    }

    await commentRef.delete();

    revalidatePath('/reels');
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting reel comment:", error);
    return { success: false, error: error.message };
  }
}
