'use server';

import type { LinkPreview } from '@/lib/types';

/**
 * HARDENED: Link Preview Generation Action.
 * Fetches Open Graph metadata from a URL without string-reduction logic.
 * FIXED: Implemented multi-pattern attribute order detection for resilient extraction.
 */
export async function getLinkPreviewAction(url: string): Promise<LinkPreview | null> {
  if (!url || typeof url !== 'string') return null;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      },
      next: { revalidate: 3600 } 
    });

    if (!response.ok) throw new Error('Preview fetch failed');

    const html = await response.text();

    // 🛡️ MULTI-PATTERN EXTRACTION SUITE (Reference Match)
    const extractMeta = (content: string, property: string) => {
        // Pattern A: property/name then content
        const regexA = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i');
        const matchA = content.match(regexA);
        if (matchA) return matchA[1];

        // Pattern B: content then property/name
        const regexB = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i');
        const matchB = content.match(regexB);
        return matchB ? matchB[1] : null;
    };

    const title = extractMeta(html, 'og:title') || 
                  html.match(/<title>([^<]+)<\/title>/i)?.[1];

    const description = extractMeta(html, 'og:description') ||
                        extractMeta(html, 'description');

    const image = extractMeta(html, 'og:image');
    
    const siteName = extractMeta(html, 'og:site_name');

    if (!title && !description) return null;

    return {
      url,
      title: title || null,
      description: description || null,
      image: image || null,
      siteName: siteName || null
    };
  } catch (error) {
    console.warn(`[Preview] Failed to generate for ${url}`);
    return null;
  }
}
