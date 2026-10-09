
'use client';

import { AIGirl } from '@/lib/types';

/**
 * Gating removed - all profiles are now accessible.
 */
export function ProfileGatedContent({ children }: { girl: AIGirl; children: React.ReactNode }) {
  return <>{children}</>;
}
