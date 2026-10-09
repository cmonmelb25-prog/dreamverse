
import { getMarketplaceItems } from '@/server/actions/marketplace-actions';
import MarketplaceClient from './MarketplaceClient';
import { nuclearSerialize } from '@/lib/utils';
import { ShoppingBag } from 'lucide-react';

export const dynamic = 'force-dynamic';

/**
 * DreamVerse Marketplace
 * MODELED: FB Marketplace architecture with observatory aesthetics.
 */
export default async function MarketplacePage() {
  const items = await getMarketplaceItems();
  const serializedItems = nuclearSerialize(items || []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-10 space-y-2">
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                <ShoppingBag className="text-primary h-5 w-5" />
             </div>
             <h1 className="text-4xl font-bold font-headline bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
               Marketplace
             </h1>
          </div>
          <p className="text-white/40 font-medium max-w-2xl px-1">
            Trade items, artifacts, and essentials with other members of the DreamVerse community.
          </p>
        </header>

        <MarketplaceClient initialItems={serializedItems} />
      </div>
    </div>
  );
}
