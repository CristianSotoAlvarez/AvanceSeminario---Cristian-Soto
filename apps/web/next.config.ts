import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@dispatch-track/ui", "@dispatch-track/types", "@dispatch-track/utils"],
};

export default nextConfig;
