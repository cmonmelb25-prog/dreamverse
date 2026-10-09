/**
 * @fileOverview Global registry for system sound effects.
 * HARDENED: Uses backticks for variable interpolation and correct storage path encoding.
 */

const BUCKET = "studio-6071976643-3737c.firebasestorage.app";

export const sounds = {
  // Memphis Cult Loli Marimba Remix
  incoming: `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/sounds%2F9MM_-_Memphis_Cult_Loli_Marimba_Remix-657199-mobiles24.mp3?alt=media&token=a2e784ce-6cfc-46f1-873c-3894361c1e76`,
  
  // Phone Calling Tone
  outgoing: `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/sounds%2Fphone-calling-1b.mp3?alt=media`,
  
  // iPhone Message Notification (Corrected Encoding)
  notification: `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/sounds%2Fiphone%20sound%20message%20-%20QuickSounds.com.mp3?alt=media&token=3b5538d2-e317-44f7-8f29-4dadcd79fa84`
};
