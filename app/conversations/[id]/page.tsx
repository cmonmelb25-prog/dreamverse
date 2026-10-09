import { notFound } from 'next/navigation';
import { getGirl } from '@/lib/server/girls';
import ChatPageClient from '@/components/chat/ChatPageClient';
import { nuclearSerialize } from '@/lib/utils';
import { normalizeAIGirl } from '@/lib/normalizeAIGirl';

export const dynamic = 'force-dynamic';

/**
 * Resident Chat Thread Page in Inbox.
 * UNIFIED: Points to canonical component in src/components/chat/
 */
export default async function ResidentThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!id) notFound();

  const girlResult = await getGirl(id);
  if (!girlResult) notFound();

  const fullGirl = normalizeAIGirl(girlResult);

  const leanGirl: any = {
    id: fullGirl.id,
    name: fullGirl.name,
    media: {
      profileImageUrl: fullGirl.media.profileImageUrl,
    },
    currentMood: fullGirl.currentMood,
    promotionTier: fullGirl.promotionTier,
    role: 'aigirl',
  };

  const serializedLeanGirl = nuclearSerialize(leanGirl);

  return (
    <ChatPageClient
      params={{ id }}
      girlConfig={serializedLeanGirl}
      girlImage={leanGirl.media.profileImageUrl}
    />
  );
}
