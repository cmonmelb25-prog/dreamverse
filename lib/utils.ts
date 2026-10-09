import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { allGirls } from "./server/girls-data";
import type { AuthorSnapshot } from "./types";

/**
 * Tailwind + clsx class merging utility.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 🛡️ HARDENED UID DETECTOR
 * Detects strings that match the Firebase UID or technical document ID pattern.
 */
export function isUidPattern(val: string | null | undefined): boolean {
  if (!val || typeof val !== 'string') return false;
  const valString = val;
  
  const isAlphaNum = /^[a-zA-Z0-9_-]{20,}$/.test(valString);
  const hasMixedChars = /[a-zA-Z]/.test(valString) && /[0-9]/.test(valString);
  
  return isAlphaNum && hasMixedChars;
}

/**
 * Identity Hardening Utility.
 * Ensures an author snapshot never displays a technical UID as a name.
 * REFINED: Absolute Narrative Horizon (ANH) enforced. No string reduction.
 */
export function hardenAuthor(author: any): AuthorSnapshot {
  const authorObj = (author && typeof author === 'object') ? author : {};
  const id = authorObj.id || authorObj.uid || authorObj.authorId || authorObj.actorId;
  
  if (!id) {
    return {
      id: 'ghost',
      name: 'Member',
      profileImageUrl: '',
      role: 'user',
      nationality: 'American',
      currentMood: 'Neutral',
      promotionTier: 'non-vip'
    };
  }

  const role = authorObj.role || (String(id).length < 15 ? 'aigirl' : 'user');
  const currentName = authorObj.name || authorObj.displayName || authorObj.username || '';
  
  // Hard-check for technical fallbacks or UID patterns
  const isBroken = !currentName || 
                   currentName === 'null' || 
                   currentName === 'undefined' || 
                   currentName === 'unknown' ||
                   isUidPattern(currentName);

  let finalName = currentName;
  if (isBroken) {
    const canonical = getCanonicalGirlId(String(id));
    if (canonical) {
      const match = allGirls.find(g => g.id === canonical);
      finalName = match ? match.name : canonical;
    } else {
      finalName = (role === 'aigirl' || String(id).length < 15) ? 'Resident' : 'Member';
    }
  }

  return {
    id: String(id),
    name: finalName,
    profileImageUrl: authorObj.profileImageUrl || authorObj.photoURL || '',
    role: role as any,
    nationality: authorObj.nationality || 'American',
    currentMood: authorObj.currentMood || 'Neutral',
    promotionTier: authorObj.promotionTier || authorObj.vipTier || 'non-vip',
    isAdmin: authorObj.isAdmin || false
  };
}

/**
 * Resolves a case-insensitive girl ID to its canonical static ID.
 */
export function getCanonicalGirlId(id: string | null | undefined): string | null {
  if (!id) return null;
  const match = allGirls.find(g => g.id.toLowerCase() === id.toLowerCase());
  return match ? match.id : id;
}

/**
 * Normalizes media URLs for broadcasting and display.
 * HARDENED: Expanded to support high-fidelity PNG resolution by default for bare IDs.
 */
export function normalizeMediaUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return "";
  let val = url;
    
  if (val.includes('imgur.com') && !val.includes('i.imgur.com')) {
    const idMatch = val.match(/imgur\.com\/(?:a\/|gallery\/)?([a-zA-Z0-9]+)/);
    if (idMatch && idMatch[1]) {
      const hasExt = /\.(mp4|webm|mov|gif|jpg|jpeg|png|webp|avif)$/i.test(val);
      // Default to .png for imgur IDs if no extension is present
      val = `https://i.imgur.com/${idMatch[1]}${hasExt ? '' : '.png'}`;
    }
  }

  return getCacheBustedUrl(val);
}

/**
 * Appends a cache-buster for media playback in Workstation proxies.
 */
export function getCacheBustedUrl(url: string): string {
  if (!url || typeof url !== 'string') return "";
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (url.includes('cb=')) return url;
  
  if (!url.startsWith('http')) return url;

  let buster = "1";
  if (typeof window !== 'undefined') {
    buster = (window as any).__dv_session_buster || "1";
  }

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}cb=${buster}`;
}

/**
 * Validates if a string is a potentially valid media URL or Storage path.
 */
export function isValidMediaUrl(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  const val = url;
  
  const protocols = ['http:', 'https:', 'data:', 'blob:', '/'];
  if (protocols.some(p => val.toLowerCase().startsWith(p)) && val.length > 5) {
    return true;
  }

  return val.includes('/') && val.length > 3;
}

/**
 * Returns a clean normalized URL. 
 */
export function safeImageUrl(url: any): string {
  if (!url || typeof url !== "string") return "";
  const val = url;
  if (!isValidMediaUrl(val)) return "";
  
  return normalizeMediaUrl(val);
}

/**
 * Comprehensive video detection engine.
 * HARDENED: Expanded to support a wide range of cinematic formats.
 */
export function isVideoUrl(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  
  try {
    const cleanPath = url.split("?")[0].toLowerCase();
    const videoExtensions = [
      ".mp4", ".mov", ".webm", ".m4v", ".avi", ".mkv", ".gifv", 
      ".3gp", ".wmv", ".flv", ".ogv", ".mpeg", ".mpg"
    ];
    
    const hasVideoExt = videoExtensions.some(ext => cleanPath.endsWith(ext));

    if (hasVideoExt) return true;
    
    const lowerUrl = url.toLowerCase();
    return lowerUrl.includes('video/') || 
           lowerUrl.includes('.mp4?') || 
           lowerUrl.includes('type=video') ||
           lowerUrl.includes('modality=video') ||
           (lowerUrl.includes('firebasestorage') && lowerUrl.includes('.mp4'));
  } catch (e) {
    return false;
  }
}

/**
 * Universal media classifier.
 * HARDENED: Expanded support for modern image and audio containers.
 */
export function detectMediaType(
  url?: string | null
): "image" | "video" | "audio" | "text" {
  if (!url || typeof url !== "string") return "text";
  if (!isValidMediaUrl(url)) return "text";

  const lowerUrl = url.toLowerCase();
  
  const audioExtensions = [
    ".mp3", ".wav", ".webm", ".ogg", ".m4a", ".aac", ".flac", ".opus"
  ];
  
  const isAudio = audioExtensions.some(ext => lowerUrl.includes(ext)) || 
                  lowerUrl.includes("voice-messages") ||
                  lowerUrl.startsWith("data:audio");

  if (isAudio) return "audio";
  if (isVideoUrl(url)) return "video";
  
  const imageExtensions = [
    ".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".svg", ".bmp", ".tiff"
  ];
  
  const isImage = imageExtensions.some(ext => lowerUrl.includes(ext)) || 
                  lowerUrl.startsWith("data:image");

  if (isImage) return "image";
  
  return "image";
}

export function getSafeDate(timestamp: any): Date | null {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
    
  if (typeof timestamp?.toDate === "function") {
    try {
      const d = timestamp.toDate();
      if (d) return d;
    } catch { }
  }

  const seconds = timestamp?.seconds ?? timestamp?._seconds;
  if (typeof seconds === 'number') {
    return new Date(seconds * 1000);
  }
    
  if (typeof timestamp === "string" || typeof timestamp === "number") {
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) return date;
  }
    
  return null;
}

export function serializeFirestore(value: any, seen = new WeakSet()): any {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object") return value;
  if (seen.has(value)) return null;
  seen.add(value);

  if (typeof value?.toDate === "function") {
    try {
      const d = value.toDate();
      return d ? d.toISOString() : null;
    } catch (e) {
      return null;
    }
  }

  if (value instanceof Date) return value.toISOString();

  if (typeof value.seconds === 'number' || typeof value._seconds === 'number') {
    const s = value.seconds ?? value._seconds;
    return new Date(s * 1000).toISOString();
  }

  if (Array.isArray(value)) {
    return value
      .map(item => serializeFirestore(item, seen))
      .filter(item => item !== undefined);
  }

  const out: any = {};
  const keys = Object.keys(value);
  for (const key of keys) {
    if (key.startsWith('_') || typeof value[key] === 'function') continue;
    const val = value[key];
    const serialized = serializeFirestore(val, seen);
    out[key] = (serialized === undefined) ? null : serialized;
  }
  return out;
}

/**
 * Nuclear Serialization: Forces a perfectly clean POJO.
 */
export function nuclearSerialize<T>(value: T): T {
  if (value === null || value === undefined) return null as any;
  try {
    const clean = serializeFirestore(value);
    return JSON.parse(JSON.stringify(clean));
  } catch (err) {
    console.error("[NuclearSerialize] Critical Failure:", err);
    return null as any;
  }
}
