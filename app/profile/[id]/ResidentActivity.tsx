'use client';

import type { FeedPost, Reel } from '@/lib/types';
import PostCard from '@/app/feed/PostCard';
import { Card, CardContent } from '@/components/ui/card';
import { Play } from 'lucide-react';
import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * Enhanced Reel card for profile view - Handles local playback.
 */
function ProfileReelCard({ reel }: { reel: Reel }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const bgVideoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        bgVideoRef.current?.pause();
      } else {
        videoRef.current.play().catch(console.error);
        bgVideoRef.current?.play().catch(console.error);
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <Card 
      className="feed-card overflow-hidden group cursor-pointer border-white/10 bg-black"
      onClick={togglePlay}
    >
      <CardContent className="p-0">
        <div className="relative aspect-video bg-black overflow-hidden">
          {/* Background layer */}
          <video 
            ref={bgVideoRef}
            src={reel.videoUrl} 
            className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-110 pointer-events-none" 
            muted 
            playsInline 
            loop 
            preload="metadata"
          />
          {/* Foreground layer - contained for face visibility */}
          <video 
            ref={videoRef}
            src={reel.videoUrl} 
            className="relative z-10 w-full h-full object-contain transition-transform duration-500 group-hover:scale-105" 
            playsInline 
            loop 
            preload="metadata"
          />
          
          <div className={cn(
            "absolute inset-0 flex items-center justify-center z-20 transition-all duration-300",
            isPlaying ? "opacity-0 pointer-events-none" : "opacity-100 bg-black/20"
          )}>
            <div className="bg-white/20 backdrop-blur-md rounded-full p-4 group-hover:bg-white/30 transition-colors z-20">
              <Play className="h-8 w-8 text-white fill-white" />
            </div>
          </div>

          <div className="absolute bottom-4 left-4 right-4 text-white z-30 pointer-events-none">
            <p className="text-sm font-bold line-clamp-2 drop-shadow-md">{reel.caption}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[9px] uppercase font-black tracking-widest bg-primary px-2 py-0.5 rounded shadow-lg">Reel</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ResidentActivity({ content }: { content: (FeedPost | Reel)[] }) {
  if (!content || content.length === 0) {
    return (
      <div className="bg-card/40 backdrop-blur-sm border border-white/10 rounded-2xl p-16 text-center border-dashed">
        <p className="text-white/20 italic font-black uppercase tracking-widest text-[10px]">No recent updates yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {content.map((item) => {
        if ('content' in item) {
          return <PostCard key={item.id} post={item as FeedPost} />;
        } else if ('videoUrl' in item) {
          return <ProfileReelCard key={item.id} reel={item as Reel} />;
        }
        return null;
      })}
    </div>
  );
}
