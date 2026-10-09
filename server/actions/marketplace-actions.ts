'use server';

import { db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import type { MarketplaceItem } from '@/lib/types';
import { nuclearSerialize } from '@/lib/utils';
import { getAuthenticatedUserId } from './swipe-actions';

/**
 * Fetches marketplace items.
 * @param category Optional category filter.
 */
export async function getMarketplaceItems(category?: string): Promise<MarketplaceItem[]> {
  if (!db) return [];
  try {
    let query = db.collection('marketplace').orderBy('createdAt', 'desc');
    if (category && category !== 'All') {
      query = query.where('category', '==', category);
    }
    const snap = await query.get();
    const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as MarketplaceItem[];
    return nuclearSerialize(items);
  } catch (error) {
    console.error('[Marketplace] Fetch error:', error);
    return [];
  }
}

/**
 * Creates a new marketplace item.
 */
export async function createMarketplaceItem(data: Omit<MarketplaceItem, 'id' | 'createdAt'>) {
  if (!db) return { success: false, error: 'Database service unavailable' };
  try {
    const itemData = {
      ...data,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      price: Number(data.price || 0)
    };
    const docRef = await db.collection('marketplace').add(itemData);
    revalidatePath('/marketplace');
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error('[Marketplace] Create error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Deletes a marketplace item.
 */
export async function deleteMarketplaceItem(itemId: string, sellerId: string) {
    if (!db) return { success: false, error: 'Database service unavailable' };
    try {
        const userId = await getAuthenticatedUserId();
        if (!userId || userId !== sellerId) {
            return { success: false, error: 'Unauthorized session.' };
        }
        const ref = db.collection('marketplace').doc(itemId);
        const docSnap = await ref.get();
        if (!docSnap.exists) {
            return { success: false, error: 'Listing not found.' };
        }
        if (docSnap.data()?.sellerId !== userId) {
            return { success: false, error: 'Permission denied.' };
        }
        await ref.delete();
        revalidatePath('/marketplace');
        return { success: true };
    } catch (e: any) {
        console.error('[Marketplace] Delete error:', e);
        return { success: false, error: e.message };
    }
}

/**
 * Updates a marketplace item.
 */
export async function updateMarketplaceItem(itemId: string, data: Partial<MarketplaceItem>) {
  if (!db) return { success: false, error: 'Database service unavailable' };
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return { success: false, error: 'Unauthorized.' };
    
    const ref = db.collection('marketplace').doc(itemId);
    const docSnap = await ref.get();
    
    if (!docSnap.exists) return { success: false, error: 'Item not found' };
    if (docSnap.data()?.sellerId !== userId) return { success: false, error: 'Permission denied.' };
    
    const cleanedData: any = { 
        ...data, 
        updatedAt: FieldValue.serverTimestamp() 
    };
    
    if (data.price !== undefined) {
      cleanedData.price = Number(data.price);
    }
    
    await ref.update(cleanedData);
    revalidatePath('/marketplace');
    return { success: true };
  } catch (error: any) {
    console.error('[Marketplace] Update error:', error);
    return { success: false, error: error.message };
  }
}
