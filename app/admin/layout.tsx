'use client';

import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  // This pass-through layout ensures the main RootLayout (with the Header) is applied.
  return <>{children}</>;
}
