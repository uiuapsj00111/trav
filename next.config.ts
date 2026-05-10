import type { NextConfig } from "next";
import path from "node:path";

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  outputFileTracingRoot: path.resolve(__dirname, '../../'),
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  ...(isDev && (() => {
    try {
      const loaderPath = require.resolve('orchids-visual-edits/loader.js');
      return {
        turbopack: {
          rules: {
            "*.{jsx,tsx}": {
              loaders: [loaderPath]
            }
          }
        }
      };
    } catch {
      return {};
    }
  })()),
} as NextConfig;

export default nextConfig;
