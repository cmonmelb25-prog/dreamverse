import { allGirls } from "./server/girls-data";

/**
 * Resolves a case-insensitive girl ID to its canonical static ID.
 * (e.g. "victoria" -> "Victoria").
 * CRITICAL for identity stability across the app.
 */
export function getCanonicalGirlId(id: string | null | undefined): string | null {
  if (!id) return null;
  const match = allGirls.find(g => g.id.toLowerCase() === id.toLowerCase());
  return match ? match.id : id;
}

/**
 * Validates if a string is a standard Firebase UID format.
 */
export function isFirebaseUid(id: string | null | undefined): boolean {
  if (!id || typeof id !== 'string') return false;
  // Firebase UIDs are typically 28 characters and alphanumeric
  return id.length >= 20 && /^[a-zA-Z0-9]+$/.test(id);
}
