'use server';

import { db } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';
import type { NotificationType } from '@/lib/types';
import { sendPushNotification } from './send-push-notification';
import { allGirls } from '@/lib/server/girls-data';

type CreateNotificationPayload = {
  senderId: string | undefined;
  recipientId: string;
  actor: {
    id: string;
    name?: string;
    profileImageUrl?: string | null;
  };
  type: NotificationType;
  message: string;
  postId?: string;
  reelId?: string;
  chatId?: string;
  relatedChatId?: string;
  postContent?: string;
};

export async function createNotification(
  payload: CreateNotificationPayload
): Promise<{ success: boolean; error?: string }> {
  if (!db) return { success: false, error: 'Firestore not initialized' };

  try {
    const { recipientId, actor, senderId } = payload;

    // ❌ prevent self-notifications
    if (actor.id === recipientId || senderId === recipientId) {
      return { success: true };
    }

    // 🔥 single girl lookup (fix double scan)
    const girl = allGirls.find(
      (g) => g.id.toLowerCase() === actor.id.toLowerCase()
    );

    const isActorGirl = !!girl;

    let finalActor = isActorGirl
      ? {
          id: girl!.id,
          name: girl!.name,
          profileImageUrl: girl!.media.profileImageUrl,
        }
      : actor;

    // 🔥 lightweight user fetch (only if needed)
    if (!isActorGirl) {
      const userSnap = await db.collection('users').doc(actor.id).get();
      if (userSnap.exists) {
        const data = userSnap.data()!;
        finalActor = {
          id: actor.id,
          name: data.displayName || 'Unknown User',
          profileImageUrl: data.photoURL || '',
        };
      }
    }

    // ❌ AI girls don't receive notifications
    const isRecipientGirl = allGirls.some(
      (g) => g.id.toLowerCase() === recipientId.toLowerCase()
    );

    if (isRecipientGirl) return { success: true };

    // 🔥 ID for deduplication (IMPORTANT FIX)
    const notificationId = `${payload.type}_${finalActor.id}_${recipientId}_${payload.relatedChatId || payload.postId || 'global'}`;

    const notificationRef = db
      .collection('users')
      .doc(recipientId)
      .collection('notifications')
      .doc(notificationId);

    const notificationData = {
      senderId: finalActor.id,
      senderType: isActorGirl ? 'girl' : 'user',
      receiverId: recipientId,
      receiverType: 'user',
      type: payload.type,
      message: payload.message,
      actor: finalActor,
      read: false,
      timestamp: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      postId: payload.postId || null,
      reelId: payload.reelId || null,
      relatedChatId: payload.relatedChatId || null,
      postContent: payload.postContent || null,
    };

    // 🔥 idempotent write (prevents duplicates)
    await notificationRef.set(notificationData, { merge: true });

    // 🔥 safe push notification (won't break flow if fails)
    try {
      await sendPushNotification({
        recipientId,
        title: finalActor.name || 'Notification',
        body: payload.message,
        chatId: payload.relatedChatId,
        postId: payload.postId,
        reelId: payload.reelId,
        actorImage: finalActor.profileImageUrl ?? undefined      });
    } catch (e) {
      console.error('Push failed but notification saved:', e);
    }

    revalidatePath('/notifications');

    return { success: true };
  } catch (error: any) {
    console.error('createNotification error:', error);
    return { success: false, error: error.message };
  }
}