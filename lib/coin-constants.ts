/**
 * @fileOverview Static definitions for the DreamVerse economy.
 * Moved to a dedicated file to ensure compatibility with Next.js Client Components.
 */

export type CoinPackage = {
  id: string;
  coins: number;
  priceUsd: number;
  bonusText?: string;
};

export const COIN_PACKAGES: CoinPackage[] = [
  { id: 'coins_small', coins: 500, priceUsd: 4.99 },
  { id: 'coins_medium', coins: 1200, priceUsd: 9.99, bonusText: '20% Bonus' },
  { id: 'coins_large', coins: 3000, priceUsd: 19.99, bonusText: '50% Bonus' },
  { id: 'coins_vault', coins: 10000, priceUsd: 49.99, bonusText: 'Double Coins' },
];
