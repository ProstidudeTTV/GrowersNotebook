import type { NextConfig } from "next";
import {
  plausibleEventDestination,
  plausibleScriptDestination,
} from "./lib/plausible-proxy";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        pathname: "/vi/**",
      },
      {
        protocol: "https",
        hostname: "*.giphy.com",
        pathname: "/media/**",
      },
      {
        protocol: "https",
        hostname: "media.tenor.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "c.tenor.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
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
