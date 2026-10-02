import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@dispatch-track/ui", "@dispatch-track/types"],
  output: process.env.DOCKER_BUILD === "1" ? "standalone" : undefined,
};

export default nextConfig;
