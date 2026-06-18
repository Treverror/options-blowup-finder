/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // yahoo-finance2 ships optional deps that should not be bundled.
    serverComponentsExternalPackages: ["yahoo-finance2"],
  },
};

export default nextConfig;
