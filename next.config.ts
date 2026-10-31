import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack(config) {
    // The package's default entry is the Node build (needs tfjs-node). The browser
    // bundle is not reachable through its "exports" map, so alias to it directly.
    // Also applies to the server pass that prerenders client components; the import only runs in the browser.
    config.resolve.alias["@vladmandic/human$"] = path.resolve(
        process.cwd(),
        "node_modules/@vladmandic/human/dist/human.esm.js",
    );
    return config;
  },
};

export default nextConfig;
