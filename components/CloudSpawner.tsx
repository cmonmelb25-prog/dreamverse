'use client';

import { useEffect, useRef, useState } from 'react';
import { Cloud } from './Cloud';

/** Safe UUID for browser + Node (SSR hydration) */
function safeUUID() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {}
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function CloudSpawner() {
  const [clouds, setClouds] = useState<{ id: string }[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const spawn = () => {
      setClouds(prev => {
        const next = [...prev, { id: safeUUID() }];
        return next.length > 3 ? next.slice(next.length - 3) : next;
      });

      const nextDelay = 20000 + Math.random() * 20000;
      timeoutRef.current = setTimeout(spawn, nextDelay);
    };

    const firstDelay = 5000 + Math.random() * 7000;
    timeoutRef.current = setTimeout(spawn, firstDelay);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <>
      {clouds.map(c => (
        <Cloud key={c.id} />
      ))}
    </>
  );
}
