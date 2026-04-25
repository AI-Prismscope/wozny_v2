import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },
  webpack(config) {
    // Allow webpack to process .mjs files from node_modules (e.g. wa-sqlite).
    // Without this, webpack may reject ESM-only packages that ship .mjs dist files.
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: "javascript/auto",
    });

    // wa-sqlite.wasm is NOT bundled by webpack — it is served as a static
    // asset from public/wa-sqlite.wasm and fetched at runtime by the db
    // worker via the locateFile callback. No asyncWebAssembly experiment
    // is needed because the WASM never passes through the webpack pipeline.

    return config;
  },
};

export default nextConfig;
