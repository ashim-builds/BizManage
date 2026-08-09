/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@bizmanage/types', '@bizmanage/validation'],
  reactStrictMode: true,
  // Required for Docker: produces a self-contained bundle without full node_modules
  output: 'standalone',
};

export default nextConfig;
