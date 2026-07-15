import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "mammoth"],
  // Home dir contains a stray package-lock.json; pin the workspace root
  turbopack: { root: __dirname },
};

export default nextConfig;
