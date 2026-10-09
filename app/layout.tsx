import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Sedgwick_Ave_Display, Inter } from "next/font/google";
import RootLayoutClient from "./RootLayoutClient";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { SharedFirestoreStateProvider } from "@/providers/SharedFirestoreStateProvider";
import { NotificationProvider } from "@/providers/NotificationProvider";
import { MinimizedChatProvider } from "@/providers/MinimizedChatProvider";
import { AdminActingAsProvider } from "@/providers/AdminActingAsProvider";
import { MusicProvider } from "@/providers/MusicProvider";
import { ScrollToTop } from "@/components/ScrollToTop";
import { cn } from "@/lib/utils";

const sedgwick = Sedgwick_Ave_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-headline",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "DreamVerse",
  description: "Enter the DreamVerse",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DreamVerse"
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover"
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(inter.variable, sedgwick.variable)}>
      <body suppressHydrationWarning className={cn("antialiased h-full w-full overflow-hidden", inter.className)}>
        <FirebaseClientProvider>
          <SharedFirestoreStateProvider>
            <NotificationProvider>
              <MinimizedChatProvider>
                <MusicProvider>
                  <AdminActingAsProvider>
                    <ScrollToTop />
                    <RootLayoutClient>{children}</RootLayoutClient>
                  </AdminActingAsProvider>
                </MusicProvider>
              </MinimizedChatProvider>
            </NotificationProvider>
          </SharedFirestoreStateProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
