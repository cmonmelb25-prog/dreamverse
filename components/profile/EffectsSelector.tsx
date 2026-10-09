'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import type { AnimatedEffect } from '@/lib/themeTypes';

export function EffectsSelector({ value, onChangeAction }: any) {
  const safeValue: AnimatedEffect[] = useMemo(
    () => (Array.isArray(value) ? value : []),
    [value]
  );

  function toggle(effect: AnimatedEffect) {
    const exists = safeValue.includes(effect);

    onChangeAction(
      exists
        ? safeValue.filter((e) => e !== effect)
        : [...safeValue, effect]
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {['sparkle', 'starfield', 'aurora', 'rainbow'].map((e) => (
        <Button key={e} type="button" onClick={() => toggle(e as AnimatedEffect)}>
          {e}
        </Button>
      ))}
    </div>
  );
}