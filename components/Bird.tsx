'use client';

import { useEffect, useRef } from 'react';
import type { BirdType } from '@/lib/types';
import { cn } from '@/lib/utils';

export function Bird({
  id,
  type,
  duration,
}: {
  id: string;
  type: BirdType;
  duration: number; // Flight duration in ms
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // --- Flight Path ---
    const direction = Math.random() < 0.3 ? 'bird-fly-left-to-right' : 'bird-fly-right-to-left';
    el.classList.add(direction);

    // --- Vertical Position, Scale, and Duration ---
    el.style.top = `${4 + Math.random() * 30}vh`; // Fly in the upper half
    el.style.setProperty('--bird-scale', `${0.2 + Math.random() * 0.2}`); // Random size
    el.style.animationDuration = `${duration / 1000}s`; // Flight duration

    // --- Cleanup ---
    // The component is removed by its parent spawner, so no need for el.remove() here
  }, [id, duration, type]);

  return (
    <div ref={ref} className={cn('bird-sprite-container', `bird-type-${type}`)}>
      <div className="bird-sprite" />
    </div>
  );
}
