'use client';

import { useEffect, useState } from 'react';

export function PWAHandler() {
  const [newVersionAvailable, setNewVersionAvailable] = useState(false);
  const [registration, setRegistration] = useState(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", async () => {
        try {
          const reg = await navigator.serviceWorker.register("/sw.js");
          console.log("Service Worker registration successful with scope: ", reg.scope);
          setRegistration(reg);

          // Check for updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker?.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setNewVersionAvailable(true);
              }
            });
          });

          // Handle updates when controller changes
          let refreshing = false;
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
              refreshing = true;
              window.location.reload();
            }
          });

        } catch (err) {
          console.log("Service Worker registration failed: ", err);
        }
      });
    }
  }, []);

  const updateServiceWorker = async () => {
    if (registration) {
      await registration.update();
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    }
  };

  // You can add UI for update notification here
  if (newVersionAvailable) {
    return (
      <div className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50">
        <p>New version available!</p>
        <button
          onClick={updateServiceWorker}
          className="mt-2 px-4 py-2 bg-white text-blue-600 rounded hover:bg-blue-50"
        >
          Update now
        </button>
      </div>
    );
  }

  return null;
}