'use server';

import { db } from '@/lib/firebase-admin';

/**
 * MASTER CLEANUP ENGINE (SAFE VERSION)
 * - NEVER deletes active/accepted calls
 * - Only removes truly expired or terminal data
 * - Prevents WebRTC disruption
 */
export async function runGlobalCleanup(): Promise<{
  success: boolean;
  message: string;
  error?: string;
  results?: any;
}> {
  if (!db) {
    return {
      success: false,
      message: 'Database not initialized.',
      error: 'db-not-init',
    };
  }

  const results = {
    notifications: 0,
    stories: 0,
    engagements: 0,
    staleCalls: 0,
  };

  try {
    const now = Date.now();

    /* -------------------------------------------------------
       1. STORIES (24h expiry)
    ------------------------------------------------------- */
    const storyCutoff = new Date(now - 24 * 60 * 60 * 1000);

    const storiesSnap = await db
      .collection('stories')
      .where('uploadedAt', '<', storyCutoff)
      .get();

    if (!storiesSnap.empty) {
      const batch = db.batch();
      storiesSnap.forEach((doc) => {
        batch.delete(doc.ref);
        results.stories++;
      });
      await batch.commit();
    }

    /* -------------------------------------------------------
       2. NOTIFICATIONS CLEANUP (SAFE)
    ------------------------------------------------------- */
    const readCutoff = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const unreadCutoff = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const readSnap = await db
      .collectionGroup('notifications')
      .where('read', '==', true)
      .where('timestamp', '<', readCutoff)
      .get();

    const unreadSnap = await db
      .collectionGroup('notifications')
      .where('read', '==', false)
      .where('timestamp', '<', unreadCutoff)
      .get();

    const nBatch = db.batch();

    const processNotifications = (snap: FirebaseFirestore.QuerySnapshot) => {
      snap.forEach((doc) => {
        nBatch.delete(doc.ref);
        results.notifications++;
      });
    };

    processNotifications(readSnap);
    processNotifications(unreadSnap);

    if (!readSnap.empty || !unreadSnap.empty) {
      await nBatch.commit();
    }

    /* -------------------------------------------------------
       3. ENGAGEMENT LOGS (60 days)
    ------------------------------------------------------- */
    const logCutoff = new Date(now - 60 * 24 * 60 * 60 * 1000);

    const logSnap = await db
      .collection('engagements')
      .where('timestamp', '<', logCutoff)
      .get();

    if (!logSnap.empty) {
      let batch = db.batch();
      let count = 0;

      for (const doc of logSnap.docs) {
        batch.delete(doc.ref);
        results.engagements++;
        count++;

        if (count >= 450) {
          await batch.commit();
          batch = db.batch();
          count = 0;
        }
      }

      if (count > 0) await batch.commit();
    }

    /* -------------------------------------------------------
       4. MESSENGER MESSAGES CLEANUP (12h expiry)
    ------------------------------------------------------- */
    const messengerCutoff = new Date(now - 12 * 60 * 60 * 1000);

    const messengerSnap = await db
      .collectionGroup('messages')
      .where('expiresAt', '<', messengerCutoff)
      .get();

    if (!messengerSnap.empty) {
      const batch = db.batch();
      messengerSnap.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }

    /* -------------------------------------------------------
       5. SAFE CALL CLEANUP (FIXED 🚨)
       ONLY deletes NON-ACTIVE calls
    ------------------------------------------------------- */

    const callCutoff = new Date(now - 12 * 60 * 60 * 1000);

    const callSnap = await db
      .collection('messengerCalls')
      .where('createdAt', '<', callCutoff)
      .where('status', 'in', ['ended', 'rejected', 'missed'])
      .get();

    if (!callSnap.empty) {
      let batch = db.batch();
      let count = 0;

      callSnap.forEach((doc) => {
        batch.delete(doc.ref);
        results.staleCalls++;
        count++;

        if (count >= 450) {
          batch.commit();
          batch = db.batch();
          count = 0;
        }
      });

      if (count > 0) await batch.commit();
    }

    /* -------------------------------------------------------
       RESULT
    ------------------------------------------------------- */
    return {
      success: true,
      message: `Cleanup complete → Notifications: ${results.notifications}, Stories: ${results.stories}, Engagements: ${results.engagements}, Calls: ${results.staleCalls}`,
      results,
    };
  } catch (error: any) {
    console.error('Global Cleanup Error:', error);

    return {
      success: false,
      message: 'Cleanup job failed.',
      error: error.message,
    };
  }
}