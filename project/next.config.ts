import type { NextConfig } from "next";
const config: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  devIndicators: false,
  poweredByHeader: false,
  turbopack: { root: process.cwd() },
};
export default config;
