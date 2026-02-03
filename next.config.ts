import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export',
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ['error'] } : false,
  },
  // Required for WebLLM/WebGPU to load local WASM/Weights generally need loose checks or specific headers
  // However, headers are usually "serve" time, not build time.
  // We keep it simple for now.
};

export default nextConfig;
