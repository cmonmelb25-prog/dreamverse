'use server';

import { getStorage, Storage } from 'firebase-admin/storage';
import { adminApp, adminAuth } from '@/lib/firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { Bucket } from '@google-cloud/storage';

let storage: Storage | null = null;
let bucket: Bucket | null = null;

const BUCKET_NAME = process.env.FIREBASE_STORAGE_BUCKET;

if (adminApp && BUCKET_NAME) {
  storage = getStorage(adminApp);
  bucket = storage.bucket(BUCKET_NAME);
}

const MAX_FILE_SIZE = 200 * 1024 * 1024;

/**
 * Universal Allowed MIME Types
 * REFINED: Fully permissive wildcard support for all supporting browsers.
 */
const allowedTypes: Record<string, string[]> = {
  avatar: ['image/*', 'video/*'],
  cover: ['image/*', 'video/*'],
  'chat-media': ['image/*', 'video/*', 'audio/*'],
  'voice-message': ['audio/*'],
  post: ['image/*', 'video/*', 'audio/*'],
};

/**
 * Robust Media Upload Action.
 * FIXED: Uses the full canonical BUCKET_NAME in the URL construction to ensure 
 * token validation succeeds across all environments.
 * PERMISSIVE: Supports all common cinematic and image formats.
 */
export async function uploadFile(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  if (!bucket || !adminAuth || !BUCKET_NAME) {
    return { success: false, error: 'Storage/Auth not initialized.' };
  }

  const file = formData.get('file') as File | null;
  const userId = formData.get('userId') as string | null;

  if (!file || !userId) {
    return { success: false, error: 'Missing file or userId.' };
  }
  
  const fileExtension = file.name.includes('.') ? file.name.split('.').pop() : 'png';
  const fileName = `${uuidv4()}.${fileExtension}`;
  const filePath = `user-uploads/${userId}/${fileName}`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileRef = bucket.file(filePath);
    const downloadToken = uuidv4();

    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
        cacheControl: 'public, max-age=31536000',
        metadata: {
          firebaseStorageDownloadTokens: downloadToken
        }
      },
      resumable: false
    });

    // 🛡️ CRITICAL: Use the full BUCKET_NAME (e.g. xyz.firebasestorage.app) to ensure tokens validate.
    const permanentUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/${encodeURIComponent(filePath)}?alt=media&token=${downloadToken}`;

    return { success: true, url: permanentUrl };
  } catch (error: any) {
    console.error('Upload error:', error);
    return { success: false, error: error.message };
  }
}
