import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: false,
      workbox: {
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // Precache the navigation shell only. Hashed build output and images
        // are cached on first use by the runtime rules below, so a first
        // visit no longer downloads every lazy route chunk and every avatar
        // before the user has done anything.
        globPatterns: ["index.html", "manifest.json", "favicon.svg", "favicon.png"],
        navigateFallbackDenylist: [/^\/~oauth/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*supabase.*\/storage/,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /^https:\/\/.*supabase.*\/rest/,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5,
              },
              networkTimeoutSeconds: 3,
            },
          },
          {
            // Build output is content-hashed, so it is safe to serve from
            // cache indefinitely; a new deploy produces new filenames.
            urlPattern: /\/assets\/[^/]+\.(?:js|css)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "app-assets",
              expiration: {
                maxEntries: 150,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|gif|webp|svg|ico)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "images",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            urlPattern: /\.(?:woff2?|ttf|otf)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "fonts",
              expiration: {
                maxEntries: 16,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Keep long-lived dependencies in their own chunks so an app-code
        // deploy does not invalidate React, Supabase and Radix for everyone.
        // Anything not matched here stays with whichever route chunk needs
        // it, which keeps the editor/map/chart libraries off the boot path.
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return;
          if (id.includes("react-router")) return "vendor-router";
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return "vendor-react";
          if (id.includes("@supabase")) return "vendor-supabase";
          if (id.includes("@radix-ui")) return "vendor-radix";
          if (/node_modules\/(framer-motion|motion-dom|motion-utils)\//.test(id)) return "vendor-motion";
          if (id.includes("@tiptap") || id.includes("prosemirror")) return "vendor-editor";
          if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
          if (id.includes("leaflet")) return "vendor-maps";
        },
      },
    },
  },
}));
