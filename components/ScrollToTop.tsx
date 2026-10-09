'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Ensures that the main content area scrolls to the top whenever the pathname changes.
 * TARGETED: Specifically scrolls the 'main-scroll-container' instead of the window.
 */
export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    // In an App Shell layout, the window doesn't scroll, the content container does.
    const container = document.getElementById('main-scroll-container');
    if (container) {
      container.scrollTop = 0;
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
}
