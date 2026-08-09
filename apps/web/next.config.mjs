/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@bizmanage/types', '@bizmanage/validation', '@bizmanage/shared'],
  reactStrictMode: true,
};

export default nextConfig;
