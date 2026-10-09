
'use server';

import { db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuthenticatedUserId } from './swipe-actions';
import { createNotification } from './create-notification';
import { revalidatePath } from 'next/cache';

/**
 * Fetches real follower and following counts for a user.
 */
export async function getFollowCounts(userId: string) {
  if (!db) return { followers: 0, following: 0 };

  try {
    const [followersSnap, followingSnap] = await Promise.all([
      db.collection('users').doc(userId).collection('followers').count().get(),
      db.collection('users').doc(userId).collection('following').count().get(),
    ]);

    return {
      followers: followersSnap.data().count || 0,
      following: followingSnap.data().count || 0,
    };
  } catch (error) {
    console.error(`Error fetching counts for ${userId}:`, error);
    return { followers: 0, following: 0 };
  }
}

/**
 * Follows a user and creates a notification.
 */
export async function followUser(targetUserId: string) {
  const currentUserId = await getAuthenticatedUserId();
  if (!currentUserId || !db) return { success: false, error: 'Unauthorized' };
  if (currentUserId === targetUserId) return { success: false, error: 'Self-follow not allowed' };

  try {
    const batch = db.batch();

    // 1. Add to current user's following
    const followingRef = db.collection('users').doc(currentUserId).collection('following').doc(targetUserId);
    batch.set(followingRef, { timestamp: FieldValue.serverTimestamp() });

    // 2. Add to target user's followers
    const followersRef = db.collection('users').doc(targetUserId).collection('followers').doc(currentUserId);
    batch.set(followersRef, { timestamp: FieldValue.serverTimestamp() });

    await batch.commit();

    // 3. Notify the target
    const followerDoc = await db.collection('users').doc(currentUserId).get();
    const followerData = followerDoc.data();

    await createNotification({
      recipientId: targetUserId,
      senderId: currentUserId,
      actor: {
        id: currentUserId,
        name: followerData?.displayName || null,
        profileImageUrl: followerData?.photoURL || '',
      },
      type: 'system',
      message: 'started following you!',
    });

    revalidatePath(`/profile/${targetUserId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Follow error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Unfollows a user.
 */
export async function unfollowUser(targetUserId: string) {
  const currentUserId = await getAuthenticatedUserId();
  if (!currentUserId || !db) return { success: false, error: 'Unauthorized' };

  try {
    const batch = db.batch();
    const followingRef = db.collection('users').doc(currentUserId).collection('following').doc(targetUserId);
    const followersRef = db.collection('users').doc(targetUserId).collection('followers').doc(currentUserId);

    batch.delete(followingRef);
    batch.delete(followersRef);

    await batch.commit();
    revalidatePath(`/profile/${targetUserId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Unfollow error:', error);
    return { success: false, error: error.message };
  }
}
