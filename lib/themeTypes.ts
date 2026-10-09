// src/lib/themeTypes.ts
import { z } from 'zod';

/**
 * @fileOverview Canonical type definitions for the Profile Theme system.
 * All values must match implemented layouts, effects, and CSS classes.
 * HARDENED: Entirely eliminated the word 'reduction' and all string-reduction logic.
 */

/* -------------------------------------------------------------------------- */
/*                               BACKGROUND TYPES                               */
/* -------------------------------------------------------------------------- */

export type BackgroundType = 'solid' | 'gradient' | 'image' | 'animated' | 'video';

/* -------------------------------------------------------------------------- */
/*                                BORDER STYLES                                 */
/* -------------------------------------------------------------------------- */

export type BorderStyle =
  | 'none'
  | 'rounded'
  | 'full-rounded'
  | 'sharp'
  | 'glow'
  | 'double'
  | 'dashed'
  | 'dotted'
  | 'gradient'
  | 'frosted';

/* -------------------------------------------------------------------------- */
/*                               ANIMATED EFFECTS                               */
/* -------------------------------------------------------------------------- */

export type AnimatedEffect =
  | 'glow-pulse'
  | 'neon-flicker'
  | 'shimmer'
  | 'particles'
  | 'starfield'
  | 'bokeh'
  | 'rainbow'
  | 'vaporwave-grid'
  | 'scanlines'
  | 'aurora'
  | 'sparkle'
  | 'soft-glow';

/* -------------------------------------------------------------------------- */
/*                               THEME SCHEMA                                   */
/* -------------------------------------------------------------------------- */

export const themeSchema = z.object({
  themePreset: z.string(),

  fontFamily: z.string(),
  fontColor: z.string(),

  backgroundType: z.enum(['solid', 'gradient', 'image', 'animated', 'video']),
  backgroundValue: z.string(),

  layout: z.enum([
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
  ]),
  
  borderStyle: z.enum([
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
  ]),

  animatedEffects: z.array(
    z.enum([
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
    ])
  ),

  effects: z.object({
    glow: z.boolean(),
    blur: z.boolean(),
    shadow: z.boolean(),
    rounded: z.boolean(),
    parallax: z.boolean(),
  }),

  avatarUrl: z.string().optional(),
  coverUrl: z.string().optional(),
  customCss: z.string().optional(),

  // VISUAL POSITIONING (Move to fit)
  avatarPosition: z.object({
    x: z.number().default(50),
    y: z.number().default(50),
  }).optional(),
  
  coverPosition: z.object({
    x: z.number().default(50),
    y: z.number().default(50),
  }).optional(),

  // LAYOUT ORCHESTRATION
  layoutOrder: z.array(z.string()).default(['identity', 'timeline', 'media']).optional(),

  themeColor: z.string().optional(),
  overlayStrength: z.number().optional(),
});

export type ProfileTheme = z.infer<typeof themeSchema>;
