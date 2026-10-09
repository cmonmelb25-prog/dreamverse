/* src/components/profile/ThemeProfilePreview.tsx */
'use client';

import React, { useMemo } from 'react';
import { ProfileTheme } from '@/lib/themeTypes';
import { cn } from '@/lib/utils';
import styles from './profile-page.module.css';

type ProfilePreviewProps = {
  theme: ProfileTheme | null | undefined;
};

const isVideoUrl = (url?: string) => {
  if (!url) return false;
  return /\.(mp4|webm|mov)$/i.test(url);
};

export function ProfilePreview({ theme }: ProfilePreviewProps) {
  /* -------------------------------------------------------------------------- */
  /*                          1. NORMALIZE THE THEME                            */
  /* -------------------------------------------------------------------------- */

  const safeTheme: ProfileTheme = useMemo(() => {
    if (!theme || typeof theme !== 'object') {
      return {
        themePreset: 'default-theme',
        fontFamily: 'Inter, sans-serif',
        fontColor: '#ffffff',
        backgroundType: 'solid',
        backgroundValue: '#000',
        layout: 'classic',
        borderStyle: 'rounded',
        animatedEffects: [],
        effects: { glow: false, blur: false, shadow: false, parallax: false, rounded: false },
        themeColor: '#ff66cc',
        overlayStrength: 0.5,
        avatarUrl: '',
        coverUrl: '',
        customCss: '',
        avatarPosition: { x: 50, y: 50 },
        coverPosition: { x: 50, y: 50 },
      };
    }

    const validLayouts = ['classic', 'centered-card', 'myspace', 'banner', 'minimal', 'magazine'];
    return {
      themePreset: theme.themePreset ?? 'default-theme',
      fontFamily: theme.fontFamily ?? 'Inter, sans-serif',
      fontColor: theme.fontColor ?? '#ffffff',
      backgroundType: theme.backgroundType ?? 'solid',
      backgroundValue: theme.backgroundValue ?? '#000',
      layout: validLayouts.includes(theme.layout ?? '') ? theme.layout : 'classic',
      borderStyle: theme.borderStyle ?? 'rounded',
      animatedEffects: Array.isArray(theme.animatedEffects) ? theme.animatedEffects : [],
      effects: {
        glow: theme.effects?.glow ?? false,
        shadow: theme.effects?.shadow ?? false,
        blur: theme.effects?.blur ?? false,
        parallax: theme.effects?.parallax ?? false,
        rounded: theme.effects?.rounded ?? false,
      },
      themeColor: theme.themeColor ?? '#ff66cc',
      overlayStrength: theme.overlayStrength ?? 0.5,
      avatarUrl: theme.avatarUrl ?? '',
      coverUrl: theme.coverUrl ?? '',
      customCss: theme.customCss ?? '',
      avatarPosition: theme.avatarPosition ?? { x: 50, y: 50 },
      coverPosition: theme.coverPosition ?? { x: 50, y: 50 },
    };
  }, [theme]);

  const {
    fontFamily,
    fontColor,
    backgroundType,
    backgroundValue,
    layout,
    borderStyle,
    animatedEffects,
    effects,
    themeColor,
    overlayStrength,
    avatarUrl,
    coverUrl,
    customCss,
    avatarPosition,
    coverPosition,
  } = safeTheme;

  /* -------------------------------------------------------------------------- */
  /*                        2. ROOT STYLE COMPUTATION                           */
  /* -------------------------------------------------------------------------- */

  const rootStyles = useMemo(() => {
    const baseStyles: React.CSSProperties = {
      fontFamily,
      color: fontColor,
      '--theme-accent': themeColor,
      '--overlay-strength': overlayStrength,
    } as React.CSSProperties;

    if (backgroundType === 'solid') {
      baseStyles.backgroundColor = backgroundValue;
    } else if (backgroundType === 'gradient') {
      baseStyles.backgroundImage = backgroundValue;
    } else if (backgroundType === 'image') {
      if (backgroundValue?.trim().startsWith('linear-gradient')) {
        baseStyles.backgroundImage = backgroundValue;
      } else {
        baseStyles.backgroundImage = `url(${backgroundValue})`;
      }
      baseStyles.backgroundSize = 'cover';
      baseStyles.backgroundPosition = 'center';
      baseStyles.backgroundAttachment = 'fixed';
    }
    return baseStyles;
  }, [fontFamily, fontColor, themeColor, overlayStrength, backgroundType, backgroundValue]);

  /* -------------------------------------------------------------------------- */
  /*                        3. SHARED LAYOUT CONTAINER                           */
  /* -------------------------------------------------------------------------- */

  const effectClasses = animatedEffects.map((e) => styles[`effect-${e}`]).filter(Boolean);
  const customCssScoped = customCss?.trim() ? `.profile-preview-scope { ${customCss} }` : '';

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <div
      className={cn(
        styles.root,
        'profile-preview-scope',
        styles[`layout-${layout}`],
        ...effectClasses
      )}
      style={rootStyles}
    >
      {customCssScoped && <style dangerouslySetInnerHTML={{ __html: customCssScoped }} />}
      <div className={styles.overlay} />
      {children}
    </div>
  );

  /* -------------------------------------------------------------------------- */
  /*                        4. CONDITIONAL RENDER DIRECTIVES                    */
  /* -------------------------------------------------------------------------- */

  const avatarX = avatarPosition?.x ?? 50;
  const avatarY = avatarPosition?.y ?? 50;
  const coverX = coverPosition?.x ?? 50;
  const coverY = coverPosition?.y ?? 50;

  return (
    <Wrapper>
      <div className={styles.page}>
        {layout !== 'minimal' && (
          <div className={cn(styles.coverWrapper, styles[`border-${borderStyle}`], effects.glow && styles.glow)}>
            {isVideoUrl(coverUrl) ? (
              <video 
                src={coverUrl} 
                autoPlay loop muted playsInline 
                className={styles.coverImage} 
                style={{ objectPosition: `${coverX}% ${coverY}%` }}
              />
            ) : coverUrl ? (
              <div 
                className={styles.coverImage} 
                style={{ 
                  backgroundImage: `url(${coverUrl})`,
                  backgroundPosition: `${coverX}% ${coverY}%`
                }} 
              />
            ) : (
              <div className={styles.coverPlaceholder} />
            )}
          </div>
        )}

        <div className={cn(styles.layoutContent, styles[`border-${borderStyle}`])}>
          <aside className={styles.sidebar}>
            <div className={styles.avatarWrapper}>
              {isVideoUrl(avatarUrl) ? (
                <video 
                  src={avatarUrl} 
                  autoPlay loop muted playsInline 
                  className={cn(styles.avatar, styles[`border-${borderStyle}`])} 
                  style={{ objectPosition: `${avatarX}% ${avatarY}%` }}
                />
              ) : avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt="Avatar" 
                  className={cn(styles.avatar, styles[`border-${borderStyle}`])} 
                  style={{ objectPosition: `${avatarX}% ${avatarY}%` }}
                />
              ) : (
                <div className={styles.avatarPlaceholder}>Y</div>
              )}
            </div>

            <div className={styles.identityBlock}>
              <div className={styles.displayName}>Your Name</div>
              <div className={styles.username}>@username</div>
            </div>

            <div className={cn(styles.sectionBox, styles[`border-${borderStyle}`])}>
              <div className={styles.sectionTitle}>About Me</div>
              <p className={styles.sectionBody}>Preview of your new identity.</p>
            </div>
          </aside>

          <main className={styles.main}>
            <div className={cn(styles.sectionBox, styles[`border-${borderStyle}`])}>
              <div className={styles.sectionTitle}>Profile Feed</div>
              <p className={styles.sectionBody}>Your content will appear here.</p>
            </div>
          </main>
        </div>
      </div>
    </Wrapper>
  );
}
