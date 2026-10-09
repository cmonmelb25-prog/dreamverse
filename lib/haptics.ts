/**
 * @fileOverview Universal haptic feedback helper.
 * Provides tactile vibration patterns for mobile devices.
 */

export const vibrate = (pattern: number | number[] = 50) => {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Fail silently on restricted devices
    }
  }
};
