import type { Preset } from '@/components/profile/PresetPicker';
import type { ProfileTheme } from '@/lib/themeTypes';
import { defaultTheme } from '@/lib/theme-constants';

/* -------------------------------------------------------------------------- */
/*                         CANONICAL EFFECT MAPPING                            */
/* -------------------------------------------------------------------------- */

const EFFECT_TO_FLAGS: Record<string, Partial<ProfileTheme['effects']>> = {
  sparkle: { glow: true, shadow: true },
  'soft-glow': { glow: true },
  'glow-pulse': { glow: true },
  'neon-flicker': { glow: true },
  'vaporwave-grid': { glow: true },
  aurora: { blur: true },
  starfield: { shadow: true },
};

/* -------------------------------------------------------------------------- */
/*                         RAW PRESET DEFINITIONS                              */
/* -------------------------------------------------------------------------- */

const rawThemes = {
  free: [
    {
      name: 'Classic Blue',
      backgroundType: 'solid',
      backgroundValue: '#1e3a8a',
      themeColor: '#3b82f6',
      fontFamily: 'Arial, sans-serif',
      fontColor: '#ffffff',
      borderStyle: 'rounded',
      animatedEffect: null,
    },
    {
      name: 'Soft Lavender',
      backgroundType: 'gradient',
      backgroundValue: 'linear-gradient(135deg, #a18cd1, #fbc2eb)',
      themeColor: '#c084fc',
      fontFamily: 'Verdana, sans-serif',
      fontColor: '#ffffff',
      borderStyle: 'rounded',
      animatedEffect: null,
    },
    {
      name: 'Dark Mode',
      backgroundType: 'solid',
      backgroundValue: '#0f172a',
      themeColor: '#f472b6',
      fontFamily: 'Inter, sans-serif',
      fontColor: '#f8fafc',
      borderStyle: 'sharp',
      animatedEffect: null,
    },
    {
      name: 'High Contrast',
      backgroundType: 'solid',
      backgroundValue: '#000000',
      themeColor: '#ffffff',
      fontFamily: "'Courier New', monospace",
      fontColor: '#ffffff',
      borderStyle: 'sharp',
      animatedEffect: 'scanlines',
    },
    {
      name: 'Forest Green',
      backgroundType: 'solid',
      backgroundValue: '#064e3b',
      themeColor: '#10b981',
      fontFamily: 'Georgia, serif',
      fontColor: '#ecfdf5',
      borderStyle: 'rounded',
      animatedEffect: null,
    },
    {
      name: 'Sunset Orange',
      backgroundType: 'gradient',
      backgroundValue: 'linear-gradient(180deg, #fdba74, #f97316)',
      themeColor: '#ea580c',
      fontFamily: 'Arial, sans-serif',
      fontColor: '#fff7ed',
      borderStyle: 'full-rounded',
      animatedEffect: null,
    }
  ],

  vip: [
    {
      name: 'Galactic Stars',
      backgroundType: 'solid',
      backgroundValue: '#000000',
      themeColor: '#8b5cf6',
      fontFamily: 'Arial, sans-serif',
      fontColor: '#ffffff',
      borderStyle: 'glow',
      animatedEffect: 'starfield',
    },
    {
      name: 'Cyberpunk Neon',
      backgroundType: 'solid',
      backgroundValue: '#050505',
      themeColor: '#39ff14',
      fontFamily: 'Orbitron, sans-serif',
      fontColor: '#39ff14',
      borderStyle: 'glow',
      animatedEffect: 'neon-flicker',
    },
    {
      name: 'Solar Flare',
      backgroundType: 'gradient',
      backgroundValue: 'radial-gradient(circle, #f97316, #7c2d12)',
      themeColor: '#fbbf24',
      fontFamily: 'Poppins, sans-serif',
      fontColor: '#fffbeb',
      borderStyle: 'gradient',
      animatedEffect: 'glow-pulse',
    },
    {
      name: 'Oceanic Immersive',
      backgroundType: 'gradient',
      backgroundValue: 'linear-gradient(to bottom, #0c4a6e, #082f49)',
      themeColor: '#0ea5e9',
      fontFamily: 'Inter, sans-serif',
      fontColor: '#f0f9ff',
      borderStyle: 'frosted',
      animatedEffect: 'aurora',
    },
    {
      name: 'Emerald City',
      backgroundType: 'solid',
      backgroundValue: '#022c22',
      themeColor: '#34d399',
      fontFamily: 'Lora, serif',
      fontColor: '#f0fdf4',
      borderStyle: 'double',
      animatedEffect: 'sparkle',
    },
    {
      name: 'Rose Gold Luxury',
      backgroundType: 'gradient',
      backgroundValue: 'linear-gradient(135deg, #fdf2f8, #fbcfe8)',
      themeColor: '#db2777',
      fontFamily: "'Playfair Display', serif",
      fontColor: '#831843',
      borderStyle: 'gradient',
      animatedEffect: 'shimmer',
    }
  ],
};

/* -------------------------------------------------------------------------- */
/*                         PRESET NORMALIZATION LOGIC                          */
/* -------------------------------------------------------------------------- */

function toPreset(themeData: any, tier: 'non-vip' | 'vip'): Preset {
  const id = themeData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const animatedEffects = themeData.animatedEffect
    ? [themeData.animatedEffect]
    : [];

  const effectFlags = animatedEffects.reduce(
    (acc, effect) => ({ ...acc, ...(EFFECT_TO_FLAGS[effect] || {}) }),
    {}
  );

  const effects: ProfileTheme['effects'] = {
    glow: themeData.borderStyle === 'glow' || effectFlags.glow || false,
    blur: themeData.borderStyle === 'frosted' || effectFlags.blur || false,
    shadow: effectFlags.shadow ?? true,
    rounded: themeData.borderStyle !== 'sharp',
    parallax: false,
  };

  const theme: Partial<ProfileTheme> = {
    ...defaultTheme,
    backgroundType: themeData.backgroundType,
    backgroundValue: themeData.backgroundValue,
    themeColor: themeData.themeColor,
    fontFamily: themeData.fontFamily,
    fontColor: themeData.fontColor,
    borderStyle: themeData.borderStyle,
    animatedEffects,
    effects,
    themePreset: id,

    coverUrl: '',
    avatarUrl: '',

    layout: 'classic', 

    overlayStrength: 0.5,
    customCss: '',
  };

  return {
    id,
    name: themeData.name,
    description: `A ${themeData.name.toLowerCase()} theme.`,
    tier,
    theme,
  };
}

/* -------------------------------------------------------------------------- */
/*                         FINAL PRESET EXPORTS                                */
/* -------------------------------------------------------------------------- */

export const freeProfileThemePresets: Preset[] = rawThemes.free.map((t) =>
  toPreset(t, 'non-vip')
);

export const vipProfileThemePresets: Preset[] = rawThemes.vip.map((t) =>
  toPreset(t, 'vip')
);
