import type { NextConfig } from "next";
import path from "path";

// The backend serves /media/ images, so whichever backend this build points at
// has to be an allowed remote image host. Derived from the same env var the app
// uses, so the testing and production deploys each allow their own host and
// neither has a backend URL hardcoded here.
const apiHostname = (() => {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!raw) return null;
  try {
    return new URL(raw).hostname;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
        pathname: "/**",
      },
      ...(apiHostname
        ? [
            {
              protocol: "https" as const,
              hostname: apiHostname,
              port: "",
              pathname: "/**",
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
