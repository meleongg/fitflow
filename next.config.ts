import type { NextConfig } from "next";

const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development", // Disable in development
  fallbacks: {
    document: "/_offline", // Fallback page when offline
  },
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: "NetworkFirst",
      options: {
        cacheName: "offlineCache",
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      // Cache workout data
      urlPattern: /\/api\/workouts/,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "workout-data",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      // Cache session data
      urlPattern: /\/api\/sessions/,
      handler: "NetworkFirst",
      options: {
        cacheName: "session-data",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
  ],
  cacheOnFrontEndNav: true, // Enable caching for client-side navigation
  reloadOnOnline: false, // Don't reload when coming back online (we'll handle sync manually)
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default withPWA(nextConfig);
