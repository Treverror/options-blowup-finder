/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Keep yahoo-finance2 out of the server bundle where possible.
    serverComponentsExternalPackages: ["yahoo-finance2"],
  },
  webpack: (config) => {
    // yahoo-finance2's ESM build re-exports a test helper (tests/fetchCache.js)
    // that imports Deno-only modules webpack can't resolve. We never invoke it,
    // so alias those imports to empty modules to keep the build green.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@std/testing/mock": false,
      "@std/testing/bdd": false,
      "@gadicc/fetch-mock-cache/runtimes/deno.ts": false,
    };
    return config;
  },
};

export default nextConfig;
