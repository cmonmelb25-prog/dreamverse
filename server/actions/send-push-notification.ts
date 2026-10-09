'use server';

import { adminMessaging, db } from '@/lib/firebase-admin';
import { allGirls } from '@/lib/server/girls-data';

type PushNotificationPayload = {
  recipientId: string;
  title: string;
  body: string;
  chatId?: string;
  postId?: string;
  reelId?: string;
  commentId?: string;
  actorImage?: string;
};

export async function sendPushNotification(
  payload: PushNotificationPayload
): Promise<{ success: boolean; error?: string }> {
  if (!adminMessaging || !db) {
    console.warn('Firebase Admin not initialized. Skipping push dispatch.');
    return { success: true, error: 'Messaging context not initialized' };
  }

  const {
    recipientId,
    title,
    body,
    chatId,
    postId,
    reelId,
    actorImage,
  } = payload;

  if (!title?.trim() || !body?.trim()) {
    return { success: false, error: 'Missing title/body' };
  }

  // 🚫 AI girls do not receive client push messages
  const isRecipientGirl = allGirls.some(
    (g) => g.id.toLowerCase() === recipientId.toLowerCase()
  );
  if (isRecipientGirl) return { success: true };

  try {
    /* -----------------------------------------------------------
        PRESENCE SUPPRESSION (AVOID DOUBLE ALERTS)
    ----------------------------------------------------------- */
    const userDoc = await db.collection('users').doc(recipientId).get();

    if (userDoc.exists) {
      const data = userDoc.data();
      const lastSeen = data?.lastSeen;
      const isRecentlyActive = typeof lastSeen === 'number' && Date.now() - lastSeen < 15000;

      if (
        data?.status === 'online' &&
        data?.activeChatId === chatId &&
        isRecentlyActive
      ) {
        return { success: true }; // Suppress alert gracefully
      }
    }

    /* -----------------------------------------------------------
        FETCH TARGET SUBSCRIPTION TOKENS
    ----------------------------------------------------------- */
    const tokensSnapshot = await db
      .collection('users')
      .doc(recipientId)
      .collection('deviceTokens')
      .get();

    if (tokensSnapshot.empty) return { success: true };

    const tokens = tokensSnapshot.docs
      .map((doc) => doc.id)
      .filter((t): t is string => Boolean(t));

    if (tokens.length === 0) return { success: true };

    /* -----------------------------------------------------------
        ROUTING META RESOLUTION
    ----------------------------------------------------------- */
    const url = chatId
      ? `/chat/${chatId}`
      : postId
      ? `/feed`
      : reelId
      ? `/reels`
      : '/notifications';

    const icon = actorImage ?? 'https://i.imgur.com/agK0Phc.png';

    const message = {
      notification: {
        title,
        body,
      },
      // Essential string mappings for native platforms
      data: {
        targetUid: recipientId,
        chatId: chatId ?? '',
        postId: postId ?? '',
        reelId: reelId ?? '',
        link: url,
        icon,
        tag: chatId ?? 'general',
        type: chatId ? 'chat' : postId ? 'post' : reelId ? 'reel' : 'general',
      },
      webpush: {
        fcmOptions: {
          link: url,
        },
        notification: {
          icon,
          badge: 'https://i.imgur.com/agK0Phc.png',
          tag: chatId ?? 'general',
          renotify: true,
          vibrate: [200, 100, 200],
        },
      },
      tokens,
    };

    const response = await adminMessaging.sendEachForMulticast(message);

    /* -----------------------------------------------------------
        SAFE PRUNING: UNREGISTERED TOKEN CLEANUP ONLY
    ----------------------------------------------------------- */
    if (response.failureCount > 0) {
      const tokensToDelete: string[] = [];

      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error && tokens[idx]) {
          const code = resp.error.code;
          // Target errors signaling that a token has explicitly expired or been revoked
          if (
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/registration-token-not-registered'
          ) {
            tokensToDelete.push(tokens[idx]);
          }
        }
      });

      if (tokensToDelete.length > 0) {
        const batch = db.batch();
        for (const token of tokensToDelete) {
          const ref = db
            .collection('users')
            .doc(recipientId)
            .collection('deviceTokens')
            .doc(token);
          batch.delete(ref);
        }
        await batch.commit();
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('sendPushNotification ERROR:', error);
    return { success: false, error: error.message || 'Push orchestration failed.' };
  }
}