import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// No service worker on purpose. The previous Workbox app-shell worker
// precached index.html and served built assets CacheFirst, so published
// updates never reached installed clients. public/sw.js is now a kill-switch
// worker that evicts those caches and unregisters itself; do not reintroduce
// an app-shell service worker without the guarded registration wrapper
// (NetworkFirst HTML, never registered in dev/preview, ?sw=off escape hatch).
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),

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
          // Rollup's generated CommonJS interop helpers are virtual modules,
          // not files under node_modules. Left unassigned they get parked in
          // whichever vendor chunk happens to claim them first — and when
          // that was vendor-radix, vendor-react imported the helper back out
          // of it. Two chunks importing each other means Radix evaluated
          // before React existed and the whole app died on `forwardRef`
          // (blank page in production only; dev is unbundled and fine).
          // Pinning the helpers to vendor-react keeps the graph acyclic.
          if (id.includes("commonjsHelpers") || id.includes("commonjs-dynamic-modules")) {
            return "vendor-react";
          }
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
