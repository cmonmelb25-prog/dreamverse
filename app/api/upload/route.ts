import { NextResponse } from 'next/server';
import { getStorage } from 'firebase-admin/storage';
import { adminApp, adminAuth as auth } from '@/lib/firebase-admin';

import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

/* -----------------------------------------------------------
    CONFIG (Infrastructure Permissive)
----------------------------------------------------------- */

const allowedTypes: Record<string, string[]> = {
  avatar: ['image/*', 'video/*'],
  'chat-media': ['image/*', 'video/*', 'audio/*'],
  'voice-message': ['audio/*'],
  post: ['image/*', 'video/*', 'audio/*'],
};

/* -----------------------------------------------------------
    HELPERS
----------------------------------------------------------- */

/**
 * Hardened Filename Sanitization.
 * Replaces illegal characters with underscores and ensures no double-dots or spaces.
 */
const sanitizeFileName = (name: string) => {
  return name
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
};

const getPathPrefix = (type: string) => {
  switch (type) {
    case 'avatar': return 'avatars';
    case 'voice-message': return 'voice-messages';
    case 'chat-media': return 'chat-media';
    case 'post': return 'posts';
    default: return 'misc';
  }
};

function ensureFfmpegPath() {
  if (ffmpegStatic) {
    ffmpeg.setFfmpegPath(ffmpegStatic as string);
  }
}

/* -----------------------------------------------------------
    POST HANDLER
----------------------------------------------------------- */

export async function POST(req: Request) {
  if (!adminApp || !auth) {
    return NextResponse.json({ success: false, error: 'Firebase Admin not initialized.' }, { status: 500 });
  }

  let tmpInputPath = '';
  let tmpOutputPath = '';

  try {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (e) {
      return NextResponse.json({ success: false, error: 'Invalid or empty form data.' }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    const userId = formData.get('userId') as string | null;
    const idToken = formData.get('idToken') as string | null;
    const uploadType = formData.get('type') as keyof typeof allowedTypes | null;

    if (!file || !userId || !idToken || !uploadType) {
      return NextResponse.json({ success: false, error: 'Missing required fields.' }, { status: 400 });
    }

    const decoded = await auth.verifyIdToken(idToken);
    if (decoded.uid !== userId) {
      return NextResponse.json({ success: false, error: 'User token mismatch.' }, { status: 403 });
    }

    const storage = getStorage(adminApp);
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      return NextResponse.json({ success: false, error: 'Storage bucket not configured.' }, { status: 500 });
    }

    const bucket = storage.bucket(bucketName);
    const isVideo = file.type.startsWith('video/') || file.type === 'video/quicktime';
    const prefix = getPathPrefix(uploadType);
    
    // Hardened extension extraction
    const rawExt = file.name.split('.').pop() || 'png';
    const ext = sanitizeFileName(rawExt).substring(0, 5); 
    
    const downloadToken = uuidv4();

    const finalFileName = uploadType === 'avatar' && !isVideo
        ? `profile.${ext}`
        : `${uuidv4()}.${isVideo ? 'mp4' : ext}`;

    const finalPath = `${prefix}/${userId}/${finalFileName}`;
    const fileRef = bucket.file(finalPath);

    /* -----------------------------------------------------------
       IMAGE / AUDIO LOGIC
    ----------------------------------------------------------- */
    if (!isVideo) {
      const buffer = Buffer.from(await file.arrayBuffer());
      await fileRef.save(buffer, {
        metadata: {
          contentType: file.type,
          cacheControl: 'public, max-age=31536000',
          metadata: { firebaseStorageDownloadTokens: downloadToken }
        },
        resumable: false,
      });
    } 
    /* -----------------------------------------------------------
       VIDEO TRANSCODING LOGIC
    ----------------------------------------------------------- */
    else {
      tmpInputPath = path.join(os.tmpdir(), `dv-in-${uuidv4()}.${ext}`);
      tmpOutputPath = path.join(os.tmpdir(), `dv-out-${uuidv4()}.mp4`);
      
      await fs.promises.writeFile(tmpInputPath, Buffer.from(await file.arrayBuffer()));

      ensureFfmpegPath();
      
      await new Promise<void>((resolve, reject) => {
        const command = ffmpeg(tmpInputPath);

        const timeout = setTimeout(() => {
          command.kill('SIGKILL');
          reject(new Error('Video processing timed out.'));
        }, 60000);

        command
          .inputOptions(['-t 60'])
          .outputOptions(['-vcodec libx264', '-preset fast', '-crf 22', '-acodec aac', '-movflags +faststart'])
          .on('error', (err: Error) => {
            clearTimeout(timeout);
            reject(err);
          })
          .on('end', () => {
            clearTimeout(timeout);
            resolve();
          })
          .save(tmpOutputPath);
      });

      const finalBuffer = await fs.promises.readFile(tmpOutputPath);
      await fileRef.save(finalBuffer, {
        metadata: { 
          contentType: 'video/mp4', 
          cacheControl: 'public, max-age=31536000',
          metadata: { firebaseStorageDownloadTokens: downloadToken }
        },
        resumable: false,
      });
    }

    const cleanUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(finalPath)}?alt=media&token=${downloadToken}`;

    return NextResponse.json({
      success: true,
      url: cleanUrl,
      path: finalPath,
    });

  } catch (err: any) {
    console.error('Upload engine error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Upload failed.' }, { status: 500 });
  } finally {
    if (tmpInputPath) await fs.promises.unlink(tmpInputPath).catch(() => {});
    if (tmpOutputPath) await fs.promises.unlink(tmpOutputPath).catch(() => {});
  }
}
