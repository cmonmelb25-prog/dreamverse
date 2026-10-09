'use client';

import { Button } from '@/components/ui/button';
import { Gem } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProfileTheme, AnimatedEffect } from '@/lib/themeTypes';
import { freeProfileThemePresets, vipProfileThemePresets } from '@/lib/profile-theme-presets';
import { EffectsSelector } from './EffectsSelector';
import { defaultTheme } from '@/lib/theme-constants';

export interface Preset {
  id: string;
  name: string;
  description: string;
  tier: 'non-vip' | 'vip';
  theme: Partial<ProfileTheme>;
}

interface PresetPickerProps {
  isVIP: boolean;
  value: Partial<ProfileTheme> | null | undefined;
  onChangeAction: (newValue: Partial<ProfileTheme>) => void;
  onVipClickAction: () => void;
}

export function PresetPicker({ isVIP, value, onChangeAction, onVipClickAction }: PresetPickerProps) {
  // ⭐ Always ensure we have a valid theme object
  const safeValue: Partial<ProfileTheme> = value && typeof value === 'object'
    ? value
    : { ...defaultTheme };

  const selectedPresetId = safeValue.themePreset;

  // VIP filtering
  const allPresets = isVIP
    ? [...freeProfileThemePresets, ...vipProfileThemePresets]
    : freeProfileThemePresets;

  /* -------------------------------------------------------------------------- */
  /* APPLYING A PRESET SAFELY                          */
  /* -------------------------------------------------------------------------- */

  const handleSelectPreset = (preset: Preset) => {
    if (preset.tier === 'vip' && !isVIP) {
      onVipClickAction();
      return;
    }

    // FIXED: Preserve existing uploaded assets explicitly so they don't get stomped by presets
    const currentAvatar = safeValue.avatarUrl || (safeValue as any).profileImageUrl || '';
    const currentCover = safeValue.coverUrl || (safeValue as any).bannerUrl || '';

    // Merge preset theme with existing theme, but ensure defaults fill gaps
    const merged: Partial<ProfileTheme> = {
      ...defaultTheme,
      ...safeValue,
      ...preset.theme,
      themePreset: preset.id,
      // FIXED: Lock these down post-spread to protect the live uploaded images
      avatarUrl: currentAvatar || preset.theme.avatarUrl || defaultTheme.avatarUrl,
      coverUrl: currentCover || preset.theme.coverUrl || defaultTheme.coverUrl,
    };

    // Extra normalization block for older legacy key matching
    if ((merged as any).bannerUrl) (merged as any).bannerUrl = merged.coverUrl;
    if ((merged as any).profileImageUrl) (merged as any).profileImageUrl = merged.avatarUrl;

    // Ensure animatedEffects is always an array
    if (!Array.isArray(merged.animatedEffects)) {
      merged.animatedEffects = [];
    }

    onChangeAction(merged);
  };

  /* -------------------------------------------------------------------------- */
  /* RENDER                                   */
  /* -------------------------------------------------------------------------- */

  return (
    <div className="space-y-6">
      {/* PRESET GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {allPresets.map((preset) => {
          const isVipLocked = preset.tier === 'vip' && !isVIP;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className={cn(
                'relative group p-2 rounded-lg border-2 transition-all text-left',
                selectedPresetId === preset.id
                  ? 'border-primary'
                  : 'border-border hover:border-primary/50',
                'cursor-pointer'
              )}
            >
              {/* VIP LOCK OVERLAY */}
              {isVipLocked && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center rounded-md z-10 p-2">
                  <Gem className="h-6 w-6 text-yellow-400 mb-1" />
                  <span className="text-xs font-semibold text-yellow-300">VIP</span>
                </div>
              )}

              {/* PREVIEW BOX */}
              <div
                className="h-16 rounded-md mb-2 bg-cover bg-center"
                style={{ background: preset.theme.backgroundValue || '#111' }}
              />

              <div className="text-sm font-semibold">{preset.name}</div>
              <div className="text-xs text-muted-foreground">{preset.description}</div>
            </button>
          );
        })}
      </div>

      {/* EFFECTS SELECTOR */}
      <div className="space-y-2">
        <p className="font-semibold text-sm">Dynamic Effects:</p>

        <EffectsSelector
          isVIP={isVIP}
          value={Array.isArray(safeValue.animatedEffects) ? safeValue.animatedEffects : []}
          onChangeAction={(newEffects: AnimatedEffect[]) =>
            onChangeAction({
              ...safeValue,
              animatedEffects: newEffects,
            })
          }
          onVipClickAction={onVipClickAction}
        />
      </div>
    </div>
  );
}