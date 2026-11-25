import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Classic dynamic rendering: every page reads the session cookie and live
  // balances, so there is nothing useful to prerender.
  cacheComponents: false,
  // PGlite (local dev DB) ships its own WASM; keep it out of the bundle.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Tailwind CSS v4 runs as a Turbopack loader.
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
  experimental: {
    // Phone screenshots can be a few MB before client-side compression.
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default nextConfig;
