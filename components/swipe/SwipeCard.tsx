'use client';

import React, { useRef } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { User } from '@/lib/types';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface SwipeCardProps {
  user: User;
  isActive: boolean;
  onDragEnd: (_: any, info: PanInfo) => void;
}

const SwipeCard: React.FC<SwipeCardProps> = ({ user, isActive, onDragEnd }) => {
  const router = useRouter();
  const hasDragged = useRef(false);

  const handleTap = () => {
    if (hasDragged.current) return;
    router.push(`/profile/${user.uid}`);
  };

  return (
    <motion.div
      drag={isActive ? 'x' : false}
      onDragStart={() => (hasDragged.current = false)}
      onDrag={(_, info) => {
        if (Math.abs(info.offset.x) > 10) {
          hasDragged.current = true;
        }
      }}
      onDragEnd={onDragEnd}
      onTap={handleTap}
      className="absolute w-full h-full"
      animate={{
        scale: isActive ? 1 : 0.95,
        opacity: isActive ? 1 : 0.6,
      }}
    >
      <div className="relative w-full h-full rounded-2xl overflow-hidden bg-black">
        <Image
          src={user.photoURL || `https://picsum.photos/seed/${user.uid}/600/800`}
          alt={user.displayName || 'User'}
          fill
          className="object-cover"
          priority={isActive}
          unoptimized
        />

        <div className="absolute bottom-0 p-6 text-white">
          <h2 className="text-3xl font-bold">
            {user.displayName}, {user.age}
          </h2>
          <p>{user.location}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default SwipeCard;