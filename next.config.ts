import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  rewrites: async () => {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:7071/api/:path*",
      },
    ];
  },
};

export default nextConfig;
