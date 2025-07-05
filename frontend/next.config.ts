import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Enable HTTPS in development for camera/microphone access
  ...(process.env.NODE_ENV === 'development' && {
    experimental: {
      serverComponentsExternalPackages: [],
    },
  }),
};

export default nextConfig;
