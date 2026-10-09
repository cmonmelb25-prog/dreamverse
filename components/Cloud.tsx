'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function Cloud() {
  const [fromLeft, setFromLeft] = useState(true);
  const [top, setTop] = useState('20%');
  const [duration, setDuration] = useState(120);
  const [scale, setScale] = useState(1);
  const [opacity, setOpacity] = useState(0.4);
  const [blur, setBlur] = useState(12);

  useEffect(() => {
    setFromLeft(Math.random() > 0.5);
    setTop(`${10 + Math.random() * 40}%`);
    setDuration(90 + Math.random() * 140);
    setScale(0.8 + Math.random() * 1.2);
    setOpacity(0.25 + Math.random() * 0.35);
    setBlur(10 + Math.random() * 20);
  }, []);

  return (
    <div
      className={cn(
        "cloud-container",
        fromLeft ? "cloud-left-right" : "cloud-right-left"
      )}
      style={{
        top,
        animationDuration: `${duration}s`,
        opacity,
        filter: `blur(${blur}px)`,
        transform: `scale(${scale})`,
      }}
    >
      <div className="cloud" />
    </div>
  );
}