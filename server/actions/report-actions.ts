'use server';

import { db } from '@/lib/firebase-admin';
import { getAuthenticatedUserId } from './swipe-actions';
import { FieldValue } from 'firebase-admin/firestore';
import { serializeFirestore } from '@/lib/utils';

/**
 * Submits a safety report to Firestore.
 * Requires an authenticated session.
 */
export async function submitReportAction(data: {
  targetId: string;
  reason: string;
  description: string;
}) {
  const reporterId = await getAuthenticatedUserId();
  if (!reporterId) {
    return { success: false, error: 'You must be logged in to file a report.' };
  }

  if (!db) {
    return { success: false, error: 'Database service is temporarily unavailable.' };
  }

  try {
    const reportData = {
      reporterId,
      targetId: data.targetId.trim(),
      reason: data.reason,
      description: data.description.trim(),
      status: 'pending',
      timestamp: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('reports').add(reportData);

    return { 
      success: true, 
      id: docRef.id 
    };
  } catch (error: any) {
    console.error('submitReportAction ERROR:', error);
    return { success: false, error: 'Failed to submit report. Please try again later.' };
  }
}
