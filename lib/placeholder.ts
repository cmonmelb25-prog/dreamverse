import { placeholderData as data } from '@/lib/placeholder-images';

export type ImagePlaceholder = {
  id: string;
  description: string;
  imageUrl: string;
  imageHint?: string;
};

export const placeholderImages: ImagePlaceholder[] =
  data.placeholderImages as ImagePlaceholder[];

/**
 * Resolves a placeholder image URL by ID.
 * Uses the canonical registry at src/lib/placeholder-images.ts.
 * Environment: Shared (Safe for both Server and Client)
 */
export function getPlaceholderImage(id?: string): string {
  if (!id) {
    return data.placeholderImages.find(img => img.id === 'fallback')?.imageUrl || 'https://picsum.photos/seed/1/800/800';
  }

  const image = placeholderImages.find(
    (img: ImagePlaceholder) => img.id.toLowerCase() === id.toLowerCase()
  );

  return image?.imageUrl || data.placeholderImages.find(img => img.id === 'fallback')?.imageUrl || 'https://picsum.photos/seed/1/800/800';
}
