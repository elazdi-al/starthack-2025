import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },

  // Configure allowed dev origins for ngrok tunnels
  
    allowedDevOrigins: [
      "https://ae801d7f98f2.ngrok-free.app",
      "ae801d7f98f2.ngrok-free.app"
    ],


  // Add headers to allow Base Account popup to function
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
