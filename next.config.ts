import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: { "/*": [".private-documents/**/*"] },
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb"
    }
  }
};

export default nextConfig;
