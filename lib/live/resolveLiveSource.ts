import { isVideoUrl } from '@/lib/utils';

type ResolveLiveSourceParams = {
  isAI: boolean;
  actingAs?: any;
  videoUrl?: string;
};

/**
 * Resolves the appropriate media source for a Resident live session.
 * PRIORITIES: 
 * 1. User drop-in URL (manual override).
 * 2. Resident Intro Video.
 */
export function resolveLiveSource({
  isAI,
  actingAs,
  videoUrl,
}: ResolveLiveSourceParams): string {
  if (isAI) {
    return (
      videoUrl?.trim() ||
      actingAs?.media?.introVideoUrl ||
      ''
    );
  }

  // Human users always default to local camera feed (WebRTC), so they have no loop source.
  return '';
}
