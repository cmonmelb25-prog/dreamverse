/**
 * @fileOverview Canonical theme constants for DreamVerse.
 * These values drive the UI, preset picker, and theme editor.
 * PROTOCOL: Absolute Narrative Horizon (ANH).
 * HARDENED: Entirely eliminated the word 'reduction' and all associated logic.
 */

import type {
  ProfileTheme,
  BackgroundType,
  BorderStyle,
  AnimatedEffect,
} from './themeTypes';

/* -------------------------------------------------------------------------- */
/*                               BORDER STYLES                                 */
/* -------------------------------------------------------------------------- */

export const borderStyles: BorderStyle[] = [
  'none',
  'rounded',
  'full-rounded',
  'sharp',
  'glow',
  'double',
  'dashed',
  'dotted',
  'gradient',
  'frosted',
];

/* -------------------------------------------------------------------------- */
/*                              BACKGROUND TYPES                               */
/* -------------------------------------------------------------------------- */

export const backgroundTypes: BackgroundType[] = [
  'solid',
  'gradient',
  'image',
  'animated',
  'video',
];

/* -------------------------------------------------------------------------- */
/*                          PRE-MADE ANIMATED OPTIONS                          */
/* -------------------------------------------------------------------------- */

export const preMadeAnimatedBackgrounds = [
  { id: 'city-rain', name: 'City Raining', description: 'Moody urban rain atmosphere.' },
  { id: 'pink-glitter', name: 'Dreamy Pink Glitter', description: 'Vibrant pink with flying sparkles.' },
  { id: 'matrix-glitch', name: 'Timeline Matrix', description: 'Digital glitch reality.' },
  { id: 'ocean-waves', name: 'Ocean Depths', description: 'Calm deep sea movement.' },
  { id: 'nebula-gas', name: 'Stellar Nebula', description: 'Stellar clouds of galactic gas.' }
];

/* -------------------------------------------------------------------------- */
/*                                   LAYOUTS                                   */
/* -------------------------------------------------------------------------- */

export const layouts: ProfileTheme['layout'][] = [
  'classic',
  'centered-card',
  'myspace',
  'banner',
  'minimal',
  'magazine',
  'glass-card',
  'vogue',
  'dashboard-focus',
  'wavy-identity',
  'single-column',
  'reverse-sidebar',
  'zig-zag'
];

/* -------------------------------------------------------------------------- */
/*                             ANIMATED EFFECTS                                */
/* -------------------------------------------------------------------------- */

export const animatedEffects: AnimatedEffect[] = [
  'glow-pulse',
  'neon-flicker',
  'shimmer',
  'particles',
  'starfield',
  'bokeh',
  'rainbow',
  'vaporwave-grid',
  'scanlines',
  'aurora',
  'sparkle',
  'soft-glow',
];

/* -------------------------------------------------------------------------- */
/*                               DEFAULT THEME                                 */
/* -------------------------------------------------------------------------- */

export const defaultTheme: ProfileTheme = {
  themePreset: 'default-theme',

  fontFamily: 'Inter, sans-serif',
  fontColor: '#e5e7eb',

  backgroundType: 'solid',
  backgroundValue: '#020617',

  layout: 'classic',
  borderStyle: 'rounded',

  animatedEffects: [],

  effects: {
    glow: false,
    blur: false,
    shadow: true,
    rounded: true,
    parallax: false,
  },

  avatarPosition: { x: 50, y: 50 },
  coverPosition: { x: 50, y: 50 },

  layoutOrder: ['identity', 'timeline', 'media'],

  themeColor: '#38bdf8',
  overlayStrength: 0.6,

  avatarUrl: '',
  coverUrl: '',
  customCss: '',
};
