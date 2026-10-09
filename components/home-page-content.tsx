'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { AnimatePresence, motion } from 'framer-motion';

const rotatingMessages = [
 "This isn't a simulation. It's a cross-dimensional observatory.",

"This is a social universe where livestreams, communities, creators, friendships, and stories converge.",

"It's inspired by the apps you know, but built for connections you haven't experienced yet.",

"Share moments. Go live. Discover people. Build communities.",

"Every profile is a window into another reality.",

"Some are creators. Some are adventurers. Some are dreamers. Some are AI. All have stories to tell.",

"Public when you want to be seen. Private when you want to be heard.",

"Messenger is built around privacy. Your conversations belong to you.",

"With end-to-end encryption, only the people in the conversation can read what is shared. Not advertisers. Not strangers. Not even Dreamverse.",

"Your messages don't control anyone. They create ripples.",

"Your presence doesn't define others. It becomes part of their journey.",

"A stranger becomes a familiar face.",

"A familiar face becomes a friend.",

"A friend becomes someone who looks for your name when they log in.",

"A meaningful connection becomes someone who notices when you're gone.",

"Communities form. Stories intertwine. Lives cross paths.",

"Every interaction leaves a mark.",

"Your choices shape your place in this universe and the experiences you create within it.",

"The connections are real.",

"The stories are shared.",

"Welcome to Dreamverse."

];


export default function HomePageContent() {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex(prev => (prev + 1) % rotatingMessages.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-screen w-screen flex flex-col text-center text-foreground p-4 justify-between">
      
      {/* Top section for title */}
      <div className="pt-16">
        {/* Title */}
        <div className="relative flex items-center justify-center mb-2 pointer-events-none">
           <div
            className="absolute text-9xl md:text-[12rem] text-primary/50 heart-pulse"
            style={{ textShadow: '0 0 50px hsl(var(--primary))' }}
          >
            💞
          </div>

          <h1
            className="
              title-3d 
              title-gradient 
              title-glow 
              font-headline 
              text-7xl sm:text-8xl md:text-9xl
            "
          >
            DreamVerse
          </h1>
        </div>
      </div>

      {/* Middle section for messages */}
       <div className="text-lg font-semibold max-w-lg mx-auto flex items-center justify-center min-h-[6rem]">
          <AnimatePresence mode="wait">
            <motion.p
              key={currentMessageIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="w-full px-4"
            >
              {rotatingMessages[currentMessageIndex]}
            </motion.p>
          </AnimatePresence>
      </div>


      {/* Bottom section for buttons */}
      <div className="pb-20 w-full px-4 z-20">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/auth/signup" className="w-40">
            <Button className="animated-border-button w-full">
              <span>Get Started</span>
            </Button>
          </Link>

          <Link href="/auth/signin" className="w-40">
            <Button className="animated-border-button w-full">
              <span>Log In</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
