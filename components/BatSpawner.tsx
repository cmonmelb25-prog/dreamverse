'use client';
import { useEffect, useState, useRef } from 'react';
import { Bat } from './Bat';
import type { BatType } from '@/lib/types';

type BatInstance = {
  id: string;
  type: BatType;
  duration: number;
};

const batTypes: BatType[] = ['fruit', 'big'];

/** Safe UUID generator that works on BOTH server + browser */
function safeUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export function BatSpawner({ active }: { active: boolean }) {
  const [bats, setBats] = useState<BatInstance[]>([]);
  const removalTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    if (!active) {
      setBats([]);
      removalTimeoutsRef.current.forEach(clearTimeout);
      removalTimeoutsRef.current = [];
      return;
    }

    let spawnInterval: NodeJS.Timeout;

    const spawn = () => {
      setBats(currentBats => {
        // Limit to prevent stacking
        if (currentBats.length >= 2) return currentBats;

        const type = batTypes[Math.floor(Math.random() * batTypes.length)];
        const duration = (3 + Math.random() * 4) * 1000;

        // FIXED: safeUUID() instead of crypto.randomUUID()
        const newBat = { id: safeUUID(), type, duration };

        const removalTimeout = setTimeout(() => {
          setBats(prev => prev.filter(b => b.id !== newBat.id));
        }, duration);

        removalTimeoutsRef.current.push(removalTimeout);

        return [...currentBats, newBat];
      });

      const nextSpawnTime = 10000 + Math.random() * 15000;
      spawnInterval = setTimeout(spawn, nextSpawnTime);
    };

    const firstSpawnTimeout = setTimeout(spawn, 3000);

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
      {bats.map(b => (
        <Bat key={b.id} id={b.id} type={b.type} duration={b.duration} />
      ))}
    </>
  );
}
