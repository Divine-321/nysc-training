// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
  
// };

// export default nextConfig;

import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
