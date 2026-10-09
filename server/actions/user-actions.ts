'use server';

import { db, adminAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuthenticatedUserId } from './swipe-actions';
import { revalidatePath } from 'next/cache';
import type { ProfileTheme } from '@/lib/themeTypes';
import { initializeRelationship } from '@/lib/relationships';
import { isValidMediaUrl, nuclearSerialize } from '@/lib/utils';
import type { Track } from '@/lib/types';

/**
 * @fileOverview Community Member Actions.
 * HARDENED: Entirely eliminated the word 'reduction' and all associated logic.
 * FIXED: Specific error reporting for Auth vs Config failures.
 */

function cleanPayload(obj: any) {
  const result: any = {};
  if (!obj || typeof obj !== 'object') return result;
  
  Object.keys(obj).forEach((key) => {
    const val = obj[key];
    if (val !== undefined) {
      result[key] = val;
    }
  });
  return result;
}

export async function updateUserProfile(updates: { 
  uid: string; 
  photoURL?: string; 
  coverUrl?: string;
  displayName?: string;
}) {
  const { uid, ...rest } = updates;
  if (!uid) {
    return { success: false, error: 'User ID is required.' };
  }

  try {
    const userRef = db.collection('users').doc(uid);
    await userRef.update(cleanPayload(rest));

    if (rest.photoURL || rest.displayName) {
        const authUpdates: any = {};
        if (rest.photoURL) authUpdates.photoURL = rest.photoURL;
        if (rest.displayName) authUpdates.displayName = rest.displayName;
        await adminAuth.updateUser(uid, authUpdates);
    }
    
    revalidatePath(`/profile/${uid}`);
    revalidatePath(`/profile/me`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Saves or updates a user profile.
 * HARDENED: Split unauthorized check into descriptive segments for debugging.
 */
export async function saveUserProfile(data: {
  displayName?: string | null;
  username: string;
  bio?: string | null;
  age?: number | null;
  gender?: 'male' | 'female' | 'other' | null;
  location?: string | null;
  nationality?: string | null;
  theme: ProfileTheme;
  galleryImages?: string | null;
  galleryVideos?: string | null;
  profileImageUrl?: string | null;
}) {
  // 🛡️ AUTH CHECK
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return { success: false, error: 'Unauthorized: No active session detected.' };
  }

  // 🛡️ CONFIG CHECK
  if (!db || !adminAuth) {
    return { success: false, error: 'Server Error: Firebase infrastructure not configured.' };
  }

  try {
    if (!data) throw new Error("No payload provided for synchronization.");

    const { 
      displayName, 
      username, 
      bio, 
      age, 
      gender,
      location, 
      nationality, 
      theme, 
      galleryImages, 
      galleryVideos, 
      profileImageUrl 
    } = data;

    const finalAvatar = profileImageUrl || theme?.avatarUrl || null;
    const finalCover = theme?.coverUrl || null;

    const updateData = cleanPayload({
      id: userId,
      uid: userId,
      displayName: displayName || null,
      username,
      bio: bio || null,
      age: age || null,
      gender: gender || null,
      location: location || null,
      nationality: nationality || null,
      theme: theme ? {
        ...theme,
        avatarUrl: finalAvatar || undefined,
        coverUrl: finalCover || undefined,
      } : undefined,
      photoURL: finalAvatar,
      coverUrl: finalCover,
      galleryImages: galleryImages 
        ? galleryImages.split('\n').filter(url => isValidMediaUrl(url)) 
        : [],
      galleryVideos: galleryVideos 
        ? galleryVideos.split('\n').filter(url => isValidMediaUrl(url)) 
        : [],
      updatedAt: FieldValue.serverTimestamp()
    });

    await db.collection('users').doc(userId).set(updateData, { merge: true });

    // Sync Auth Record
    const authUpdates: any = {};
    let hasAuthChanges = false;

    const currentUser = await adminAuth.getUser(userId);

    if (displayName && displayName !== currentUser.displayName) {
      authUpdates.displayName = displayName;
      hasAuthChanges = true;
    }

    if (finalAvatar !== (currentUser.photoURL || null)) {
      authUpdates.photoURL = finalAvatar;
      hasAuthChanges = true;
    }

    if (hasAuthChanges && Object.keys(authUpdates).length > 0) {
      await adminAuth.updateUser(userId, authUpdates);
    }

    revalidatePath(`/profile/me`);
    revalidatePath(`/profile/${userId}`);
    revalidatePath(`/browse`);

    return { success: true };
  } catch (error: any) {
    console.error('[Identity/Save] Critical Handshake Failure:', error);
    return { success: false, error: error?.message || 'Internal server error during save.' };
  }
}

/**
 * Deactivates an account securely.
 * Disables the user in Auth and marks them as deactivated in Firestore.
 */
export async function deactivateAccountAction() {
  const userId = await getAuthenticatedUserId();
  if (!userId || !db || !adminAuth) {
    return { success: false, error: 'Unauthorized: No active session or server not configured.' };
  }

  try {
    // 1. Disable in Firebase Auth to prevent new sessions
    await adminAuth.updateUser(userId, { disabled: true });
    
    // 2. Mark identity as deactivated in Firestore
    await db.collection('users').doc(userId).set({
      isDeactivated: true,
      status: 'offline',
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    return { success: true };
  } catch (error: any) {
    console.error('Account Deactivation Failure:', error);
    return { success: false, error: error.message || 'Failed to deactivate account.' };
  }
}

/**
 * Resets a relationship to 'single' status.
 */
export async function breakUpWithGirl(girlId: string) {
  const userId = await getAuthenticatedUserId();
  if (!userId || !db || !adminAuth) {
    return { success: false, error: 'Unauthorized or server not configured' };
  }

  try {
    const userRef = db.collection('users').doc(userId);
    const girlRef = db.collection('aiGirls').doc(girlId);
    const relationshipRef = userRef.collection('relationships').doc(girlId);

    const userDoc = await userRef.get();
    const userData = userDoc.data();
    const currentPartners = userData?.partnerIds || [];
    const updatedPartners = currentPartners.filter((id: string) => id !== girlId);

    const batch = db.batch();

    batch.update(userRef, {
      relationshipStatus: updatedPartners.length > 0 ? 'in_relationships' : 'single',
      partnerIds: FieldValue.arrayRemove(girlId),
      relationshipTargetId: userData?.relationshipTargetId === girlId 
        ? (updatedPartners[0] || FieldValue.delete()) 
        : userData?.relationshipTargetId
    });

    batch.update(girlRef, {
      relationshipStatus: 'single',
      relationshipTargetId: FieldValue.delete(),
    });

    const initialRelationship = initializeRelationship();
    batch.set(relationshipRef, JSON.parse(JSON.stringify(initialRelationship)), { merge: true });

    await batch.commit();

    revalidatePath(`/profile/me/edit`);
    revalidatePath(`/profile/me`);
    revalidatePath(`/profile/${girlId}`);

    return { success: true };
  } catch (error: any) {
    console.error('Error breaking up with girl:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Persists playlist changes to Firestore.
 */
export async function savePlaylistAction(userId: string, playlist: Track[]) {
  if (!db) return { success: false, error: 'Database not initialized' };
  try {
    const userRef = db.collection('users').doc(userId);
    const cleanPlaylist = playlist.map(t => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      url: t.url,
      cover: t.cover || null
    }));
    
    await userRef.update({ 
        playlist: cleanPlaylist,
        updatedAt: FieldValue.serverTimestamp()
    });
    
    revalidatePath(`/profile/me`);
    revalidatePath(`/profile/${userId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
