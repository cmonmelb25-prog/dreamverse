'use client';

import { useEffect, useState, useRef } from 'react';
import { Bird } from './Bird';
import type { BirdType } from '@/lib/types';

type BirdInstance = {
  id: string;
  type: BirdType;
  duration: number;
};

const birdTypes: BirdType[] = ['gull', 'crow', 'magpie', 'pigeon'];

/** Safe UUID for browser + Node (SSR hydration) */
function safeUUID() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {}
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function BirdSpawner({ active }: { active: boolean }) {
  const [birds, setBirds] = useState<BirdInstance[]>([]);
  const removalTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    if (!active) {
      setBirds([]);
      removalTimeoutsRef.current.forEach(clearTimeout);
      removalTimeoutsRef.current = [];
      return;
    }

    let spawnInterval: NodeJS.Timeout;

    const spawn = () => {
      setBirds(currentBirds => {
        // Population limit for birds
        if (currentBirds.length >= 3) return currentBirds;

        const type = birdTypes[Math.floor(Math.random() * birdTypes.length)];
        const duration = 4000 + Math.random() * 4000;

        // FIXED: safeUUID() instead of crypto.randomUUID()
        const newBird = { id: safeUUID(), type, duration };

        const removalTimeout = setTimeout(() => {
          setBirds(prev => prev.filter(b => b.id !== newBird.id));
        }, duration);

        removalTimeoutsRef.current.push(removalTimeout);

        return [...currentBirds, newBird];
      });

      const nextDelay = 8000 + Math.random() * 12000;
      spawnInterval = setTimeout(spawn, nextDelay);
    };

    const firstDelay = 2000;
    const firstSpawnTimeout = setTimeout(spawn, firstDelay);

    return () => {
      clearTimeout(firstSpawnTimeout);
      clearTimeout(spawnInterval);
      removalTimeoutsRef.current.forEach(clearTimeout);
      removalTimeoutsRef.current = [];
    };
  }, [active]);

  if (!active) return null;

  return (
    <>
      {birds.map(b => (
        <Bird
          key={b.id}
          id={b.id}
          type={b.type}
          duration={b.duration}
        />
      ))}
    </>
  );
}
