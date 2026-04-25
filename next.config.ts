import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },
  // Next.js 16 uses Turbopack by default. Turbopack handles ESM and .mjs
  // files from node_modules natively — no custom webpack rule is needed.
  // The wa-sqlite.wasm is loaded at runtime via fetch (locateFile callback)
  // and served as a static asset from public/, so no bundler WASM config
  // is required either.
  turbopack: {},
};

export default nextConfig;
