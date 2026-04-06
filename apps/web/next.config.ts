import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@dispatch-track/ui", "@dispatch-track/types", "@dispatch-track/utils"],
  output: process.env.DOCKER_BUILD === "1" ? "standalone" : undefined,
};

export default nextConfig;
