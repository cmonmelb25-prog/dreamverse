'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, safeImageUrl, isVideoUrl, normalizeMediaUrl } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ZoomIn, Layers, LayoutGrid, RotateCcw } from 'lucide-react';

export interface ImageGalleryProps {
  images?: string[] | null;
  isVIP?: boolean;
  layout?: 'pile' | 'grid';
}

/**
 * THE "DEALER'S CHOICE" FOLDER ENGINE
 * Photos physically sort themselves out from a stack into an organized grid.
 * PROTOCOL: Absolute Narrative Horizon (ANH). No string-reduction logic used.
 */
export function VipGallery({
  images,
  isVIP = false,
  layout: initialLayout = 'pile'
}: ImageGalleryProps) {
  const [isSpread, setIsSpread] = useState(false);

  const safeImages: string[] = useMemo(() => {
    if (!Array.isArray(images)) return [];
    return images.filter((img) => typeof img === 'string' && img.length > 0).slice(0, 12);
  }, [images]);

  const physicsMap = useMemo(() => {
    return safeImages.map((_, i) => ({
      rotate: (Math.random() - 0.5) * 8, // Initial pile rotation
      x: (Math.random() - 0.5) * 40,
      y: (Math.random() - 0.5) * 40,
      floatDuration: 4 + Math.random() * 4,
      floatDelay: Math.random() * 2,
    }));
  }, [safeImages]);

  if (safeImages.length === 0) {
    return (
      <div className="p-12 text-center bg-black/20 rounded-[2rem] border border-dashed border-white/5">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Archive Empty</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      <div className="flex items-center justify-between px-1">
         <div className="flex items-center gap-2">
            <Layers size={16} className="text-primary" />
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">Photo's</h3>
         </div>
         <button 
            onClick={() => setIsSpread(!isSpread)}
            className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-white transition-all flex items-center gap-1.5"
         >
            {isSpread ? <RotateCcw size={12} /> : <LayoutGrid size={12} />}
            {isSpread ? 'Close Archive' : 'Spread Archive'}
         </button>
      </div>

      <div 
        className={cn(
          "relative transition-all duration-1000 ease-in-out",
          isSpread ? "min-h-[400px]" : "h-[320px] flex items-center justify-center"
        )}
      >
        <div className={cn(
          "w-full h-full",
          isSpread ? "grid grid-cols-2 gap-4" : "relative w-[220px] h-[280px]"
        )}>
          {safeImages.map((img, idx) => {
            const cleanUrl = safeImageUrl(img);
            const isVideo = isVideoUrl(cleanUrl);
            const physics = physicsMap[idx];
            
            return (
              <motion.div
                key={img}
                layout
                initial={false}
                animate={isSpread ? {
                  x: 0,
                  y: 0,
                  rotate: 0,
                  scale: 1,
                  zIndex: 50,
                  opacity: 1
                } : {
                  x: physics.x,
                  y: physics.y,
                  rotate: physics.rotate,
                  scale: 1,
                  zIndex: safeImages.length - idx,
                  opacity: 1
                }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                  delay: isSpread ? idx * 0.05 : (safeImages.length - idx) * 0.05
                }}
                whileHover={{ 
                  scale: 1.05, 
                  rotate: 0, 
                  zIndex: 100,
                  transition: { duration: 0.2 } 
                }}
                className={cn(
                  "cursor-pointer preserve-3d",
                  !isSpread && "absolute inset-0"
                )}
              >
                {!isSpread ? (
                  /* IDLE PHYSICS: Breathing & Floating for the pile state */
                  <motion.div
                    animate={{
                      y: [0, -4, 0],
                      scale: [1, 1.01, 1]
                    }}
                    transition={{
                      duration: physics.floatDuration,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: physics.floatDelay
                    }}
                    className="w-full h-full"
                  >
                    <CardArtifact url={cleanUrl} isVideo={isVideo} />
                  </motion.div>
                ) : (
                  <CardArtifact url={cleanUrl} isVideo={isVideo} />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {!isSpread && (
        <div className="text-center">
           <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20 animate-pulse">Touch to spread archives</p>
        </div>
      )}
    </div>
  );
}

function CardArtifact({ url, isVideo }: { url: string; isVideo: boolean }) {
  const playbackUrl = normalizeMediaUrl(url);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden border-[6px] border-white shadow-2xl bg-zinc-900 group">
          <Image 
            src={url} 
            alt="Archive artifact" 
            fill 
            unoptimized 
            className="object-cover object-top pointer-events-none" 
          />
          <div className="absolute inset-0 bg-black/5" />
          <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute top-3 right-3 z-20">
            <div className="h-6 w-6 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
              <ZoomIn size={12} />
            </div>
          </div>
        </div>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl p-0 bg-black border-white/10 overflow-hidden rounded-[2.5rem] shadow-2xl">
        <div className="relative aspect-square md:aspect-video flex items-center justify-center">
          {isVideo ? (
            <video src={playbackUrl} controls autoPlay className="w-full h-full object-contain" crossOrigin="anonymous" />
          ) : (
            <img src={url} alt="Archive artifact zoom" className="w-full h-full object-contain" crossOrigin="anonymous" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
