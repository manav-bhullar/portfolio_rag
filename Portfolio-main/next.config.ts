/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['images.unsplash.com', 'assets.aceternity.com'],
  },
  eslint: {
    // DO block the build if there are eslint errors
    ignoreDuringBuilds: false,
  },
  serverExternalPackages: ['onnxruntime-node', '@xenova/transformers'],
};

module.exports = nextConfig;
