import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/wasm/:path*.wasm",
        headers: [{ key: "Content-Type", value: "application/wasm" }],
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
