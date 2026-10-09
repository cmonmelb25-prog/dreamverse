
import LivePageClient from './LivePageClient';

export const dynamic = 'force-dynamic';

/**
 * Live Hub Index (Server Component)
 */
export default async function LivePage() {
  return (
    <div className="flex-1 flex flex-col h-full bg-black overflow-hidden relative">
      <LivePageClient />
    </div>
  );
}
