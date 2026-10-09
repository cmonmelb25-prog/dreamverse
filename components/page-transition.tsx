'use client';

import * as React from 'react';

// This component is now a simple passthrough to disable page transitions.
export function PageTransition({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
