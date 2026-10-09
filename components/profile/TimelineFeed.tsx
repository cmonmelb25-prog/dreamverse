'use client';

import React, { useState } from 'react';
import type { ActivityPost } from '@/lib/types';
import { cn, safeImageUrl } from '@/lib/utils';
import Image from 'next/image';
import { SafeInitial } from '@/components/safe-initial';

type TimelineFeedProps = {
  activities?: ActivityPost[] | null;
  isVIP: boolean;
};

export function TimelineFeed({ activities, isVIP }: TimelineFeedProps) {
  // Always normalize to a safe array
  const safeActivities: ActivityPost[] = Array.isArray(activities)
    ? activities.filter((a) => a && typeof a === 'object')
    : [];

  // Track image load failures using an ID map to prevent native .src override crashes
  const [failedAvatars, setFailedAvatars] = useState<Record<string, boolean>>({});

  if (safeActivities.length === 0) {
    return (
      <div className="text-gray-400 text-center py-20 bg-black/20 rounded-[2.5rem] border border-dashed border-white/5">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/20">
          No posts on this wall yet.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {safeActivities.map((activity) => {
        const author = activity.author || {
          name: 'Unknown',
          avatarUrl: '',
        };

        const activityId = activity.id || Math.random().toString();
        const hasImageFailed = failedAvatars[activityId];
        const cleanAvatarUrl = author.avatarUrl ? safeImageUrl(author.avatarUrl) : '';

        // Safe timestamp formatting
        let timestampText = 'Just now';
        if (activity.timestamp) {
          const date = new Date(activity.timestamp);
          if (!isNaN(date.getTime())) {
            timestampText = date.toLocaleString();
          }
        }

        return (
          <div
            key={activityId}
            className={cn(
              'p-4 bg-black/40 border border-white/5 rounded-3xl flex gap-4 items-start transition-all',
              isVIP && 'shadow-[0_0_15px_rgba(255,0,132,0.15)] border-primary/20'
            )}
          >
            {/* Avatar Container */}
            <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-black/20 relative border border-white/10">
              {cleanAvatarUrl && !hasImageFailed ? (
                <Image
                  src={cleanAvatarUrl}
                  alt={author.name }
                  fill
                  unoptimized
                  className="object-cover"
                  onError={() => {
                    // Update state cleanly instead of manipulating the DOM direct
                    setFailedAvatars(prev => ({ ...prev, [activityId]: true }));
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white font-bold text-sm">
                  <SafeInitial characterName={author.name } />
                </div>
              )}
            </div>

            {/* Content Block */}
            <div className="flex-1 text-left min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-sm text-white font-bold truncate">
                  {author.name}
                </div>
                <div className="text-[10px] font-medium text-white/40 whitespace-nowrap">
                  {timestampText}
                </div>
              </div>

              <div className="text-sm text-white/80 mt-1 break-words leading-relaxed">
                {activity.content || ''}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}