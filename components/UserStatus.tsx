'use client';
import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { getSafeDate } from '@/lib/utils';

interface UserStatusProps {
  status?: 'online' | 'offline';
  lastSeen?: any;
}

export function UserStatus({ status, lastSeen }: UserStatusProps) {
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    if (status === 'offline' && lastSeen) {
      const date = getSafeDate(lastSeen);
      if (date && !isNaN(date.getTime())) {
        const distance = formatDistanceToNow(date, { addSuffix: true });
        setTimeAgo(distance);
      } else {
        setTimeAgo('');
      }
    }
  }, [status, lastSeen]);

  if (status === 'online') {
    return (
        <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <p className="text-xs text-muted-foreground">Active now</p>
        </div>
    );
  }

  if (status === 'offline' && timeAgo) {
    return (
      <p className="text-xs text-muted-foreground" suppressHydrationWarning>
        Last seen {timeAgo}
      </p>
    );
  }

  // Fallback for offline status without a valid timestamp
  return <p className="text-xs text-muted-foreground" suppressHydrationWarning>Offline</p>;
}
