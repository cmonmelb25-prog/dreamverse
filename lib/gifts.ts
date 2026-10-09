
/**
 * @fileOverview Gift definitions for the DreamVerse observatory.
 * Each gift has a rarity and an associated XP/stat impact.
 * ECONOMY: Transitioned to Coin pricing. 100 Coins ≈ $1 Value.
 */

export type GiftRarity = 'free' | 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface GiftItem {
  id: string;
  name: string;
  icon?: string;      // Emoji fallback
  imageUrl?: string;  // Direct asset URL

  // TikTok-style animated gift overlay
  animation?: {
    type: 'image' | 'gif' | 'video';
    url: string;
    duration?: number;
  };

  priceCoins: number; // Virtual currency price
  rarity: GiftRarity;
  description: string;
}

export const gifts: GiftItem[] = [
  // --- ROW 1: FREE (EMOJI ENGAGEMENT) ---
  {
    id: 'heart',
    name: 'Sparkle Heart',
    icon: '💖',
    priceCoins: 0,
    rarity: 'free',
    description: 'A simple token of affection.'
  },
  {
    id: 'like',
    name: 'Thumbs Up',
    icon: '👍',
    priceCoins: 0,
    rarity: 'free',
    description: 'Show your support.'
  },
  {
    id: 'coffee',
    name: 'Hot Coffee',
    icon: '☕',
    priceCoins: 0,
    rarity: 'free',
    description: 'Fuel for the stream.'
  },

  // --- COMMON TRIBUTES (100 - 300 Coins) ---
  {
    id: 'white_rose',
    name: 'White Rose',
    imageUrl: 'https://i.imgur.com/8kRYtXG.jpg',
    priceCoins: 100,
    rarity: 'common',
    description: 'A pure gesture of appreciation.'
  },
  {
    id: 'silver_bracelet',
    name: 'Silver Bracelet',
    imageUrl: 'https://i.imgur.com/B6GdoAj.jpg',
    priceCoins: 200,
    rarity: 'common',
    description: 'Silver plane and heart pendants.'
  },
  {
    id: 'chocolates',
    name: 'Chocolates',
    imageUrl: 'https://i.imgur.com/WnE2ffv.jpg',
    priceCoins: 300,
    rarity: 'common',
    description: 'Sweeten her day.'
  },

  // --- RARE TRIBUTES (400 - 700 Coins) ---
  {
    id: 'teddy_bear',
    name: 'Teddy Bear',
    imageUrl: 'https://i.imgur.com/6evU4VJ.jpg',
    priceCoins: 400,
    rarity: 'common',
    description: 'A soft and cuddly companion.'
  },
  {
    id: 'like_you_gif',
    name: 'I Like You',
    imageUrl: 'https://i.imgur.com/0LpvAkg.gif',
    priceCoins: 500,
    rarity: 'rare',
    description: 'Animated: A heartfelt confession.'
  },
  {
    id: 'purple_heart_pendant',
    name: 'Purple Heart',
    imageUrl: 'https://i.imgur.com/O00MpEy.jpg',
    priceCoins: 700,
    rarity: 'rare',
    description: 'A glowing token of deep affection.'
  },

  // --- EPIC & LEGENDARY (1500+ Coins) ---
  {
    id: 'spinning_diamond',
    name: 'Giant Diamond',
    imageUrl: 'https://i.imgur.com/Grq8sN3.mp4',
    priceCoins: 1500,
    rarity: 'epic',
    description: 'A spinning, massive gem.'
  },
  {
    id: 'spinning_heart',
    name: '3D Heart',
    imageUrl: 'https://i.imgur.com/PuvYBTw.mp4',
    priceCoins: 2500,
    rarity: 'epic',
    description: 'A spinning red heart.'
  },
  {
    id: 'spinning_star',
    name: 'Pearl Star',
    imageUrl: 'https://i.imgur.com/bYDmf0r.mp4',
    priceCoins: 3500,
    rarity: 'legendary',
    description: 'A spinning pearlescent star.'
  },
  {
    id: 'golden_crown',
    name: 'Gold Crown',
    imageUrl: 'https://i.imgur.com/hXJ0MAN.mp4',
    priceCoins: 5000,
    rarity: 'mythic',
    description: 'The ultimate royal gift.'
  },
];

export function getGiftById(id: string): GiftItem | undefined {
  return gifts.find(g => g.id === id);
}

/**
 * Calculates the XP impact based on the coin price.
 * 1 XP per 10 Coins.
 */
export function calculateGiftImpact(coins: number): number {
  if (coins <= 0) return 1; 
  return Math.round(coins / 10);
}
