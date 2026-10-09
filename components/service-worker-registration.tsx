'use client';

import { useEffect } from 'react';

/**
 * Service Worker Registration Component
 * Registers Firebase Messaging SW safely without HMR loops or duplicate installs.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    // 🚫 Never run in SSR
    if (typeof window === 'undefined') return;

    // 🧪 Dev safety: avoid SW interference with Fast Refresh
    if (process.env.NODE_ENV === 'development') {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations()
          .then(registrations => {
            registrations.forEach(registration => registration.unregister());
          })
          .catch(err => {
            console.debug('[SW] Development cleanup failed:', err?.message);
          });
      }

      console.debug('[SW] Registration skipped in development mode.');
      return;
    }

    // 🔍 Browser support check
    if (!('serviceWorker' in navigator)) return;

    let cancelled = false;

    const register = async () => {
      if (cancelled) return;

      try {
        // 🧠 Prevent duplicate installs
        const existing = await navigator.serviceWorker.getRegistration();

        if (existing) {
          console.debug('[SW] Already registered:', existing.scope);
          return;
        }

        const registration = await navigator.serviceWorker.register(
          '/firebase-messaging-sw.js'
        );

        console.log('[SW] Registered:', registration.scope);
      } catch (err: any) {
        console.debug('[SW] Registration failed:', err?.message);
      }
    };

    const run = () => {
      if (document.readyState === 'complete') {
        register();
      } else {
        window.addEventListener('load', register);
      }
    };

    run();

    return () => {
      cancelled = true;
      window.removeEventListener('load', register);
    };
  }, []);

  return null;
}

export default ServiceWorkerRegistration;
