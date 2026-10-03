import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    // Product/category/banner images come from the Django backend (local
    // /media/ in dev, the S3 bucket when USE_S3=True). They're rendered with
    // plain <img>, so no remotePatterns are needed here.
    unoptimized: true,
  },
};

export default nextConfig;
