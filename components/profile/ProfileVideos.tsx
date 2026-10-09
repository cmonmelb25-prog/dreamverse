'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Pause, AlertCircle, Loader as LoaderIcon, Clapperboard } from 'lucide-react';
import { cn, normalizeMediaUrl } from '@/lib/utils';
import { getImageUrl } from '@/lib/storage/getImageUrl';
import { motion } from 'framer-motion';

interface ProfileVideosProps {
  videos: string[];
}

export function ProfileVideos({ videos }: ProfileVideosProps) {
  if (!videos || videos.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4">
      {videos.map((url, idx) => (
        <VideoCard key={`${url}-${idx}`} url={url} />
      ))}
    </div>
  );
}

function VideoCard({ url }: { url: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState<string>("");
  const [isResolving, setIsResolving] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let active = true;
    const resolve = async () => {
      try {
        const resolved = await getImageUrl(url);
        if (active) {
          const normalized = normalizeMediaUrl(resolved);
          setPlaybackUrl(normalized);
          setHasError(!normalized);
        }
      } catch (err) {
        if (active) setHasError(true);
      } finally {
        if (active) setIsResolving(false);
      }
    };
    resolve();
    return () => { active = false; };
  }, [url]);

  const togglePlay = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const video = videoRef.current;
    if (!video || !playbackUrl || isResolving) return;

    try {
      if (isPlaying) {
        video.pause();
        setIsPlaying(false);
      } else {
        await video.play();
        setIsPlaying(true);
      }
    } catch (error) {
      setHasError(true);
      setIsPlaying(false);
    }
  };

  return (
    <Card 
      className="feed-card overflow-hidden group cursor-pointer border-white/10 bg-black shadow-xl rounded-2xl relative"
      onClick={togglePlay}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-0">
        <div className="relative aspect-video bg-black overflow-hidden">
          {isResolving ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-white/20">
               <LoaderIcon className="animate-spin h-6 w-6" />
            </div>
          ) : playbackUrl ? (
            <video 
              ref={videoRef}
              src={playbackUrl}
              className="w-full h-full object-contain relative z-10" 
              playsInline 
              loop 
              preload="metadata"
              crossOrigin="anonymous"
              onError={() => setHasError(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-white/10 bg-zinc-900">
               <AlertCircle size={32} />
               <span className="text-[10px] font-black uppercase mt-2">Unavailable</span>
            </div>
          )}
          
          <div className={cn(
            "absolute inset-0 flex items-center justify-center z-20 transition-all duration-300",
            (isPlaying && !isHovered) || isResolving ? "opacity-0 pointer-events-none" : "opacity-100 bg-black/30"
          )}>
            <div className="bg-white/10 backdrop-blur-md rounded-full p-4 border border-white/20 shadow-2xl group-hover:scale-110 transition-transform">
              {isPlaying ? <Pause className="h-6 w-6 text-white fill-white" /> : <Play className="h-6 w-6 text-white fill-white translate-x-0.5" />}
            </div>
          </div>

          <div className="absolute bottom-3 left-3 z-30 flex items-center gap-2">
            <motion.div
              whileHover={{ rotate: -15, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              className="bg-primary/80 backdrop-blur-md p-1.5 rounded-lg border border-white/20 shadow-lg"
            >
              <Clapperboard size={14} className="text-white" />
            </motion.div>
            <span className="text-[8px] font-black uppercase tracking-[0.2em] bg-black/60 text-white px-2 py-0.5 rounded-full border border-white/10">
              Action
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
