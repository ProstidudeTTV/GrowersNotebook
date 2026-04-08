import type { NextConfig } from "next";
import {
  plausibleEventDestination,
  plausibleScriptDestination,
} from "./lib/plausible-proxy";

const nextConfig: NextConfig = {
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
