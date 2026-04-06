import path from "path";
import type { NextConfig } from "next";
import {
  plausibleEventDestination,
  plausibleScriptDestination,
} from "./lib/plausible-proxy";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      const prev = config.resolve.alias;
      const base =
        typeof prev === "object" && prev !== null && !Array.isArray(prev)
          ? prev
          : {};
      config.resolve.alias = {
        ...base,
        "@matrix-org/matrix-sdk-crypto-wasm": path.resolve(
          __dirname,
          "node_modules/@matrix-org/matrix-sdk-crypto-wasm",
        ),
      };
    }
    return config;
  },
  async headers() {
    return [
      {
        source: "/wasm/:path*.wasm",
        headers: [{ key: "Content-Type", value: "application/wasm" }],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/gnpx/s.js",
        destination: plausibleScriptDestination(),
      },
      {
        source: "/gnpx/e",
        destination: plausibleEventDestination(),
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/c",
        destination: "/",
        permanent: true,
      },
      {
        source: "/c/",
        destination: "/",
        permanent: true,
      },
      {
        source: "/c/:slug/new",
        destination: "/community/:slug/new",
        permanent: true,
      },
      {
        source: "/c/:slug",
        destination: "/community/:slug",
        permanent: true,
      },
      {
        source: "/admin/name-blocklist",
        destination: "/admin/disallowed-names",
        permanent: false,
      },
      {
        source: "/admin/name-blocklist/create",
        destination: "/admin/disallowed-names/create",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
