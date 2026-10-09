
'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { getSafeDate } from '@/lib/utils';

interface TimeAgoProps {
  timestamp: any;
  className?: string;
}

/**
 * Enhanced TimeAgo component with absolute clock-drift compensation.
 * HARDENED: Displays "just now" for any date in the future or within 60s
 * to prevent workstation local-clock skew errors reporting "2 months ago".
 */
export function TimeAgo({ timestamp, className }: TimeAgoProps) {
  const [timeAgo, setTimeAgo] = useState<string>('just now');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    let interval: NodeJS.Timeout;

    const update = () => {
      const date = getSafeDate(timestamp);
      
      // If timestamp is null (pending) or invalid, stick to "just now"
      if (!date || isNaN(date.getTime())) {
        setTimeAgo('just now');
        return;
      }
      
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();

      // ABSOLUTE DRIFT COMPENSATION:
      // If diffMs is negative, the workstation clock is behind the server (future date).
      // If diffMs is small (< 60s), it's a new item.
      // In both cases, show "just now".
      if (diffMs < 60000) {
        setTimeAgo('just now');
      } else {
        try {
          const distance = formatDistanceToNow(date, { addSuffix: true });
          if (distance.includes('in about') || distance.includes('less than')) {
              setTimeAgo('just now');
          } else {
              setTimeAgo(distance);
          }
        } catch (e) {
          setTimeAgo('just now');
        }
      }
    };

    update();
    interval = setInterval(update, 30000); 

    return () => clearInterval(interval);
  }, [timestamp, mounted]);

  // SSR Placeholder
  if (!mounted) {
    return <span className={className}>just now</span>;
  }

  return (
    <span className={className} suppressHydrationWarning>
      {timeAgo}
    </span>
  );
}
