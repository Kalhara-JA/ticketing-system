import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // aligns with attachment cap in PRD
    },
  },
};

export default nextConfig;
