/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Keep yahoo-finance2 out of the server bundle where possible.
    serverComponentsExternalPackages: ["yahoo-finance2"],
  },
  webpack: (config, { webpack }) => {
    // yahoo-finance2's ESM build re-exports a Deno-only test cache helper
    // (tests/fetchCache.js) that imports modules which don't exist in a
    // Node/webpack build (@std/testing/*, @gadicc/fetch-mock-cache/*). We
    // never call it, so ignore that whole family of imports to keep the
    // production build green.
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^(@std\/testing|@gadicc\/fetch-mock-cache)/,
      })
    );
    return config;
  },
};

export default nextConfig;
