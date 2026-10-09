'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const LOADER_VARIANTS = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const TEXT_VARIANTS = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

const LOADING_TEXTS = [
  'Initializing DreamVerse...',
  'Connecting timelines...',
  'Waking the girls...',
  'Loading memories...',
  'Syncing parallel realities...',
];

export function GlobalLoader({ isLoading }: { isLoading: boolean }) {
  const [index, setIndex] = React.useState(0);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  React.useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % LOADING_TEXTS.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [isLoading]);
  
  if (!isLoading || !isMounted) return null;

  return (
    <motion.div
      key="global-loader"
      variants={LOADER_VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm"
    >
      <div className="font-headline text-3xl title-pulse-glow bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent animate-pulse">
        <AnimatePresence mode="wait">
          <motion.span
            key={index}
            variants={TEXT_VARIANTS}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            {LOADING_TEXTS[index]}
          </motion.span>
        </AnimatePresence>
      </div>
      <div className="flex items-center justify-center gap-1.5 mt-4">
        <span className="h-3 w-3 bg-primary rounded-full animate-pulse [animation-delay:-0.3s]"></span>
        <span className="h-3 w-3 bg-primary rounded-full animate-pulse [animation-delay:-0.15s]"></span>
        <span className="h-3 w-3 bg-primary rounded-full animate-pulse"></span>
      </div>
    </motion.div>
  );
}
