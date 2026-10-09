'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { BatType } from '@/lib/types';

export function Bat({
  id,
  type,
  duration,
}: {
  id: string;
  type: BatType;
  duration: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // --- Flight Path ---
    const directionClass =
      Math.random() > 0.5 ? 'bat-fly-left-to-right' : 'bat-fly-right-to-left';
    el.classList.add(directionClass);

    // --- Vertical Position, Scale, and Duration ---
    el.style.top = `${5 + Math.random() * 40}vh`; // Fly in the upper half at night
    el.style.setProperty('--bat-scale', `${0.4 + Math.random() * 0.5}`); // Random size
    el.style.animationDuration = `${duration / 1000}s`;
  }, [id, duration, type]);

  return (
    <div
      ref={ref}
      className={cn('bat-sprite-container', `bat-type-${type}`)}
    >
      <div className="bat-sprite" />
    </div>
  );
}
