import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com" }],
  },
  // Silences the HMR cross-origin warning when testing from another device on the LAN
  // (e.g. a phone at 172.20.10.5). Unrelated to the Google sign-in redirect issue.
  allowedDevOrigins: ["172.20.10.5"],
};

export default nextConfig;
