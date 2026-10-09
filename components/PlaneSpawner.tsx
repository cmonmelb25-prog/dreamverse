'use client';

import { useEffect, useState, useRef } from 'react';
import { Plane } from './Plane';

type PlaneInstance = {
  id: string;
  duration: number; // in milliseconds
  fromLeft: boolean; 
  top: string;
};

/** Safe UUID for browser + Node (SSR hydration) */
function safeUUID() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {}
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Manages the spawning of aviation entities with vertical lane separation.
 * This prevents collision and visual stacking.
 */
const corridors = ['15%', '30%', '45%', '60%', '75%'];

export function PlaneSpawner() {
  const [planes, setPlanes] = useState<PlaneInstance[]>([]);
  const removalTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const spawnTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const spawn = () => {
      setPlanes(currentPlanes => {
        // Limit total planes to prevent clutter
        if (currentPlanes.length >= 2) {
          return currentPlanes;
        }

        // Identify currently occupied lanes
        const occupiedLanes = new Set(currentPlanes.map(p => p.top));
        const availableLanes = corridors.filter(lane => !occupiedLanes.has(lane));
        
        if (availableLanes.length === 0) return currentPlanes;

        const duration = (35 + Math.random() * 25) * 1000;
        const fromLeft = Math.random() > 0.5;

        // Select a distinct lane to ensure vertical separation
        const top = availableLanes[Math.floor(Math.random() * availableLanes.length)];

        // FIXED: safeUUID() instead of crypto.randomUUID()
        const newPlane = { id: safeUUID(), duration, fromLeft, top };

        const removalTimeout = setTimeout(() => {
          setPlanes(prev => prev.filter(p => p.id !== newPlane.id));
        }, duration);

        removalTimeoutsRef.current.push(removalTimeout);

        return [...currentPlanes, newPlane];
      });

      // Randomized delay between spawns
      const nextDelay = 40000 + Math.random() * 50000;
      spawnTimeoutRef.current = setTimeout(spawn, nextDelay);
    };

    // Initial delay before the first plane appears
    const firstDelay = 15000;
    spawnTimeoutRef.current = setTimeout(spawn, firstDelay);

    return () => {
      if (spawnTimeoutRef.current) clearTimeout(spawnTimeoutRef.current);
      removalTimeoutsRef.current.forEach(clearTimeout);
      removalTimeoutsRef.current = [];
    };
  }, []);

  return (
    <>
      {planes.map(p => (
        <Plane 
          key={p.id} 
          fromLeft={p.fromLeft} 
          duration={p.duration / 1000} 
          top={p.top} 
        />
      ))}
    </>
  );
}
