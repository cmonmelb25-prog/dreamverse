'use server';

import { adminAuth, db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { createNotification } from './create-notification';
import { cookies } from 'next/headers';
import type { User } from '@/lib/types';
import { serializeFirestore } from '@/lib/utils';
import { revalidatePath } from 'next/cache';

/**
 * Retrieves the currently authenticated user's ID from the session cookie.
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  if (!adminAuth) return null;
  
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('__session')?.value;
    if (!sessionCookie) return null;

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, false);
    return decoded.uid;
  } catch (e) {
    return null;
  }
}

async function getRealUser(userId: string): Promise<User | null> {
  if (!db) return null;
  const snap = await db.collection('users').doc(userId).get();
  if (!snap.exists) return null;

  return serializeFirestore({ uid: userId, ...snap.data() }) as User;
}

/* -------------------------------------------------------
   LIKE USER — TINDER LOGIC
-------------------------------------------------------- */
export async function likeUser(targetUserId: string) {
  if (!db) return { success: false, match: false, error: 'DB not initialized' };

  const currentUserId = await getAuthenticatedUserId();
  if (!currentUserId) return { success: false, match: false, error: 'User not authenticated' };

  if (currentUserId === targetUserId) {
    return { success: false, match: false, error: 'Cannot like yourself' };
  }

  const currentUserData = await getRealUser(currentUserId);
  const targetUserData = await getRealUser(targetUserId);

  if (!currentUserData || !targetUserData) {
    return { success: false, match: false, error: 'User profiles not found' };
  }

  const currentUserRef = db.collection('users').doc(currentUserId);
  const targetUserRef = db.collection('users').doc(targetUserId);

  // Outgoing and Received Like Refs
  const currentLikeRef = currentUserRef.collection('likes').doc(targetUserId);
  const targetReceivedLikeRef = targetUserRef.collection('receivedLikes').doc(currentUserId);
  
  // Checking for match
  const targetLikeRef = targetUserRef.collection('likes').doc(currentUserId);
  
  // Match Refs
  const currentMatchRef = currentUserRef.collection('matches').doc(targetUserId);
  const targetMatchRef = targetUserRef.collection('matches').doc(currentUserId);

  const chatId = [currentUserId, targetUserId].sort().join('_');
  const chatRef = db.collection('messenger').doc(chatId);

  try {
    const result = await db.runTransaction(async (tx) => {
      const targetLikeSnap = await tx.get(targetLikeRef);
      const isMatch = targetLikeSnap.exists;

      // 1. Remove any previous skips
      tx.delete(currentUserRef.collection('skips').doc(targetUserId));
      tx.delete(targetUserRef.collection('skips').doc(currentUserId));

      if (isMatch) {
        // MATCH SCENARIO
        const matchTime = FieldValue.serverTimestamp();
        
        // Write match both ways with metadata for fast listing
        tx.set(currentMatchRef, { 
          matchedAt: matchTime,
          userId: targetUserId,
          displayName: targetUserData.displayName,
          photoURL: targetUserData.photoURL,
          location: targetUserData.location
        }, { merge: true });

        tx.set(targetMatchRef, { 
          matchedAt: matchTime,
          userId: currentUserId,
          displayName: currentUserData.displayName,
          photoURL: currentUserData.photoURL,
          location: currentUserData.location
        }, { merge: true });

        // Cleanup likes
        tx.delete(currentLikeRef);
        tx.delete(targetLikeRef);
        tx.delete(currentUserRef.collection('receivedLikes').doc(targetUserId));
        tx.delete(targetUserRef.collection('receivedLikes').doc(currentUserId));

        // Create chat
        const chatSnap = await tx.get(chatRef);
        if (!chatSnap.exists) {
          tx.set(chatRef, {
            participantIds: [currentUserId, targetUserId],
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            lastMessage: {
                text: "You matched! Say hi.",
                senderId: "system",
                timestamp: FieldValue.serverTimestamp()
            }
          }, { merge: true });
        }
      } else {
        // PENDING LIKE SCENARIO
        tx.set(currentLikeRef, { 
          likedAt: FieldValue.serverTimestamp(),
          userId: targetUserId,
          displayName: targetUserData.displayName,
          photoURL: targetUserData.photoURL 
        }, { merge: true });

        // Record it as a received like for the target
        tx.set(targetReceivedLikeRef, {
          likedAt: FieldValue.serverTimestamp(),
          userId: currentUserId,
          displayName: currentUserData.displayName,
          photoURL: currentUserData.photoURL
        }, { merge: true });
      }

      return { match: isMatch };
    });

    if (result.match) {
      // Send match notifications
      await createNotification({
        recipientId: targetUserId,
        senderId: currentUserId,
        actor: {
          id: currentUserId,
          name: currentUserData.displayName || 'Someone',
          profileImageUrl: currentUserData.photoURL || '',
        },
        type: 'match',
        message: `matched with you!`,
        relatedChatId: chatId,
      });

      await createNotification({
        recipientId: currentUserId,
        senderId: targetUserId,
        actor: {
          id: targetUserId,
          name: targetUserData.displayName || 'Someone',
          profileImageUrl: targetUserData.photoURL || '',
        },
        type: 'match',
        message: `matched with you!`,
        relatedChatId: chatId,
      });
    }

    revalidatePath('/swipe');
    return { success: true, match: result.match, matchedUser: targetUserData };

  } catch (e: any) {
    console.error("Like user action error:", e);
    return { success: false, match: false, error: e.message };
  }
}

/* -------------------------------------------------------
   SKIP USER
-------------------------------------------------------- */
export async function skipUser(targetUserId: string) {
  if (!db) return { success: false, error: 'DB not initialized' };

  const currentUserId = await getAuthenticatedUserId();
  if (!currentUserId) return { success: false, error: 'User not authenticated' };

  try {
    const currentUserRef = db.collection('users').doc(currentUserId);
    const targetUserRef = db.collection('users').doc(targetUserId);

    await currentUserRef.collection('skips').doc(targetUserId).set({ 
      skippedAt: FieldValue.serverTimestamp() 
    }, { merge: true });

    // Cleanup any pending likes both ways
    await currentUserRef.collection('likes').doc(targetUserId).delete();
    await targetUserRef.collection('receivedLikes').doc(currentUserId).delete();

    revalidatePath('/swipe');
    return { success: true };
  } catch (e: any) {
    console.error("Skip user action error:", e);
    return { success: false, error: e.message };
  }
}

/**
 * Dismiss a received like.
 */
export async function dismissReceivedLike(senderId: string) {
    const currentUserId = await getAuthenticatedUserId();
    if (!currentUserId || !db) return { success: false };

    try {
        await db.collection('users').doc(currentUserId).collection('receivedLikes').doc(senderId).delete();
        revalidatePath('/swipe');
        return { success: true };
    } catch (err) {
        return { success: false };
    }
}
