'use client';

import { useMemo } from "react";

export function Starfield({ count = 180 }) {
  const stars = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 1.8 + 0.6,
      delay: Math.random() * 6,
      depth: Math.floor(Math.random() * 3) + 1,
    }));
  }, [count]);

  return (
    <div className="absolute inset-0 pointer-events-none z-[3]">
      {stars.map((s) => (
        <span
          key={s.id}
          className={`star depth-${s.depth}`}
          style={{
            left: `${s.x}vw`,
            top: `${s.y}vh`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
