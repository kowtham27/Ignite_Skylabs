import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Test builds (NEXT_PUBLIC_APPWRITE_TABLE_PREFIX=test_) go to their own folder,
  // so a normal `npm start` can never serve a build wired to test tables.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
