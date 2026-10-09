'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Wildlife } from './Wildlife';
import { Moon } from './Moon';
import { PlaneSpawner } from './PlaneSpawner';
import { CloudSpawner } from './CloudSpawner';
import { Starfield } from './Starfield';

type Phase = 'dawn' | 'day' | 'sunset' | 'night';

function getCurrentPhase(): Phase {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 20) return 'day';
  if (hour >= 17 && hour < 18) return 'sunset';
  return 'night';
}

/**
 * TimeAwareBackground
 * FIXED: Removed nested dynamic imports to resolve ChunkLoadError in proxied environments.
 * The entire background system is now bundled into a single reliable client-side chunk.
 */
export function TimeAwareBackground() {
  const [phase, setPhase] = useState<Phase>('night');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const update = () => setPhase(getCurrentPhase());
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!isMounted) {
    return <div className="fixed inset-0 -z-50 bg-background" />;
  }

  const isNight = phase === 'night';
  const isDayTime = phase === 'day' || phase === 'dawn' || phase === 'sunset';

  return (
    <div className="fixed inset-0 overflow-hidden -z-50">
      {/* SKY GRADIENT (bottom-most) */}
      <div
        className={cn(
          'time-aware-sky absolute inset-0 -z-50 transition-all ease-in-out',
          {
            'sky-dawn': phase === 'dawn',
            'sky-day': phase === 'day',
            'sky-sunset': phase === 'sunset',
            'sky-night': phase === 'night',
          }
        )}
        style={{ transitionDuration: '3000ms' }}
      />

      {/* NIGHT ELEMENTS (above sky) */}
      {isNight && (
        <div className="absolute inset-0 pointer-events-none -z-40">
          <div className="milky-way" />
          <div className="moon-glow" />
          <Starfield />
          <Moon />
          <div className="night-haze" />
        </div>
      )}

      {/* CLOUDS (above stars, below wildlife) */}
      {isDayTime && (
        <div className="absolute inset-0 pointer-events-none -z-30">
          <CloudSpawner />
        </div>
      )}

      {/* WILDLIFE (birds, bats, planes) — top-most */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <Wildlife phase={phase} isStorm={false} />
      </div>
    </div>
  );
}

export default TimeAwareBackground;
