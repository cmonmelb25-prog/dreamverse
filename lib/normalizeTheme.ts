'use client';

import { defaultTheme } from '@/lib/theme-constants';
import type { ProfileTheme } from '@/lib/themeTypes';

/**
 * Ensures theme never crashes UI anywhere in the app.
 * This is your single source of truth sanitizer.
 */
export function normalizeTheme(theme: any): ProfileTheme {
  return {
    ...defaultTheme,
    ...theme,

    effects: {
      ...defaultTheme.effects,
      ...(theme?.effects || {}),
    },

    animatedEffects: Array.isArray(theme?.animatedEffects)
      ? theme.animatedEffects
      : [],

    avatarPosition: {
      x: typeof theme?.avatarPosition?.x === 'number' ? theme.avatarPosition.x : 50,
      y: typeof theme?.avatarPosition?.y === 'number' ? theme.avatarPosition.y : 50,
    },

    coverPosition: {
      x: typeof theme?.coverPosition?.x === 'number' ? theme.coverPosition.x : 50,
      y: typeof theme?.coverPosition?.y === 'number' ? theme.coverPosition.y : 50,
    },

    layout: theme?.layout ?? defaultTheme.layout,
    borderStyle: theme?.borderStyle ?? defaultTheme.borderStyle,

    overlayStrength:
      typeof theme?.overlayStrength === 'number'
        ? theme.overlayStrength
        : defaultTheme.overlayStrength,
  };
}
