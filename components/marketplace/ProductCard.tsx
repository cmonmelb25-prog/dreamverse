'use client';

import React from 'react';
import type { MarketplaceItem } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, User, Tag } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  item: MarketplaceItem;
  isOwner?: boolean;
  onSelectAction: (item: MarketplaceItem) => void;
}

/**
 * MARKETPLACE PRODUCT CARD
 * Refined for high-fidelity social commerce vibe.
 */
export function ProductCard({ item, isOwner, onSelectAction }: ProductCardProps) {
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(item.price);

  return (
    <Card 
      className={cn(
        "bg-card/40 backdrop-blur-md border-white/10 overflow-hidden group hover:border-primary/40 transition-all duration-500 shadow-2xl cursor-pointer pointer-events-auto rounded-[2rem]",
        isOwner && "ring-2 ring-primary/20"
      )}
      onClick={() => onSelectAction(item)}
    >
      <div className="relative aspect-square bg-zinc-900 overflow-hidden">
        {item.imageUrl ? (
           <img 
            src={item.imageUrl} 
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            data-ai-hint="product photo"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/5">
             <Tag size={48} />
          </div>
        )}
        
        {/* Price Tag Overlay */}
        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-xl px-3 py-1 rounded-full border border-white/10 shadow-xl group-hover:bg-primary transition-colors">
          <span className="text-xs font-black text-white">{formattedPrice}</span>
        </div>

        {/* Owner Indicator */}
        {isOwner && (
          <div className="absolute top-4 right-4 bg-gradient-to-tr from-[#ff0084] to-[#6a00f4] px-2.5 py-0.5 rounded-full border border-white/20 shadow-lg">
             <span className="text-[8px] font-black text-white uppercase tracking-widest">Your Listing</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      <CardContent className="p-5 space-y-3 relative">
        <div className="space-y-1">
            <h3 className="font-bold text-white text-base truncate group-hover:text-primary transition-colors">
            {item.title}
            </h3>
            
            <div className="flex items-center gap-1.5 text-white/30 text-[10px] font-bold uppercase tracking-widest">
            <MapPin size={10} className="text-primary" />
            <span className="truncate">{item.location}</span>
            </div>
        </div>

        <div className="pt-3 border-t border-white/5 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 hover:text-primary transition-colors"
          >
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                <User size={12} className="text-primary" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-tighter text-white/60 truncate max-w-[80px]">
                {item.sellerName}
            </span>
          </div>
          
          <div className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-full border border-white/5 shadow-inner">
             <Tag size={10} className="text-white/20" />
             <span className="text-[9px] font-black uppercase text-white/40 tracking-tighter">{item.category}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
