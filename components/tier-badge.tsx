'use client';

import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTierBadge } from '@/lib/badges';

export function TierBadge({ tier, isAdmin, className }: { tier?: string; isAdmin?: boolean; className?: string }) {
  if (isAdmin) {
    return (
      <Badge className={cn("bg-gradient-to-r from-green-400 to-emerald-600 text-white border-none font-bold gap-1 shadow-[0_0_10px_rgba(52,211,153,0.5)]", className)}>
        <ShieldCheck className="h-3 w-3" /> Admin
      </Badge>
    );
  }

  const badge = getTierBadge(tier);

  // Show if either icon or label is present (🥈 icon is always present for non-vip)
  if (!badge.icon && !badge.label) return null;

  return (
    <Badge 
      className={cn(
        "gap-1 font-bold border-none shadow-md",
        badge.color === 'vip' ? "bg-gradient-to-r from-slate-400 to-slate-600 text-white" :
        "bg-black/40 text-white/70",
        className
      )}
    >
      {badge.icon && <span className="text-sm">{badge.icon}</span>}
      {badge.label}
    </Badge>
  );
}
