import { getDownloadURL, ref } from "firebase/storage";
import { initializeFirebase } from "@/firebase/init";

/**
 * Resolves a Storage path or URL to a usable, authorized download URL.
 * HARDENED: Detects and "heals" tokenless Firebase Storage URLs in real-time.
 * Environment: Shared (Safe for both Server and Client)
 */
export async function getImageUrl(pathOrUrl?: string | null): Promise<string> {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') return "";
  
  const trimmed = pathOrUrl.trim();

  // 1. If it's already a full URL AND has a token, it's safe to use.
  if (trimmed.startsWith('http') && trimmed.includes('token=')) {
    return trimmed;
  }

  // 2. If it's an external URL (not Firebase Storage), return it as is.
  if (trimmed.startsWith('http') && !trimmed.includes('firebasestorage.googleapis.com')) {
    return trimmed;
  }

  // 3. Otherwise, it's either a path or a tokenless URL. We resolve it via the SDK.
  try {
    let cleanPath = trimmed;

    // If it's a tokenless Firebase Storage URL, extract the path segment
    if (trimmed.includes('firebasestorage.googleapis.com')) {
      const match = trimmed.match(/\/o\/(.+?)(?:\?|$)/);
      if (match && match[1]) {
        cleanPath = decodeURIComponent(match[1]);
      }
    }

    const { storage } = initializeFirebase();
    const imageRef = ref(storage, cleanPath);
    
    // SDK resolution provides a fresh, signed URL with a valid access token.
    return await getDownloadURL(imageRef);
  } catch (err) {
    console.warn("[getImageUrl] Resolution failed for:", trimmed, err);
    // Fallback to the original input if it was a URL, otherwise return empty
    return trimmed.startsWith('http') ? trimmed : "";
  }
}
