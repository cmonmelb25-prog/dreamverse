'use client';

import { BirdSpawner } from './BirdSpawner';
import { BatSpawner } from './BatSpawner';
import { PlaneSpawner } from './PlaneSpawner';

type WildlifeProps = {
  phase: 'dawn' | 'day' | 'sunset' | 'night';
  isStorm: boolean;
};

export function Wildlife({ phase, isStorm }: WildlifeProps) {
  const isBirdTime = phase === 'dawn' || phase === 'day';
  const isNightTime = phase === 'sunset' || phase === 'night';

  return (
    <>
      {/* Only show planes at night to avoid confusion with birds during day */}
      {isNightTime && !isStorm && <PlaneSpawner />}

      {/* Birds only during dawn/day */}
      {isBirdTime && !isStorm && (
        <BirdSpawner active={true} />
      )}

      {/* Bats only during night/sunset */}
      {isNightTime && !isStorm && (
        <>
          <BatSpawner active={true} />
        </>
      )}
    </>
  );
}
