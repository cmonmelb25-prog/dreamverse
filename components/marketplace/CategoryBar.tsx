
'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { 
  ShoppingBag, 
  Car, 
  Home, 
  Smartphone, 
  Watch, 
  Gamepad, 
  Shirt, 
  Wrench,
  LayoutGrid
} from 'lucide-react';

export const CATEGORIES = [
  { name: 'All', icon: LayoutGrid },
  { name: 'Electronics', icon: Smartphone },
  { name: 'Vehicles', icon: Car },
  { name: 'Property', icon: Home },
  { name: 'Fashion', icon: Shirt },
  { name: 'Hobbies', icon: Gamepad },
  { name: 'Tools', icon: Wrench },
  { name: 'Jewelry', icon: Watch },
  { name: 'Misc', icon: ShoppingBag },
];

interface CategoryBarProps {
  activeCategory: string;
  onSelectAction: (name: string) => void;
}

export function CategoryBar({ activeCategory, onSelectAction }: CategoryBarProps) {
  return (
    <div className="w-full flex gap-3 overflow-x-auto pb-4 no-scrollbar touch-pan-x scroll-smooth">
      {CATEGORIES.map((cat) => {
        const Icon = cat.icon;
        const isActive = activeCategory === cat.name;

        return (
          <button
            key={cat.name}
            onClick={() => onSelectAction(cat.name)}
            className={cn(
              "flex flex-col items-center justify-center gap-2 min-w-[80px] h-20 rounded-2xl border transition-all duration-300",
              isActive 
                ? "bg-primary border-primary shadow-[0_0_15px_rgba(255,0,132,0.3)] text-white" 
                : "bg-card/40 border-white/5 text-white/40 hover:bg-white/5 hover:text-white"
            )}
          >
            <Icon size={20} className={cn("transition-transform", isActive && "scale-110")} />
            <span className="text-[10px] font-black uppercase tracking-tighter">{cat.name}</span>
          </button>
        );
      })}
    </div>
  );
}
