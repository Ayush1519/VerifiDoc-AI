/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // For production/preview: use local API routes (mock data)
    // For development: can optionally point to real backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL;
    
    if (!backendUrl) {
      // No backend configured - use next.js built-in API routes (mock)
      return [];
    }
    
    // If backend URL is provided, proxy to it
    return [
      {
        source: "/api/verify/:path*",
        destination: `${backendUrl}/api/verify/:path*`,
      },
      {
        source: "/api/health",
        destination: `${backendUrl}/api/health`,
      },
      {
        source: "/api/docs",
        destination: `${backendUrl}/api/docs`,
      },
    ];
  },
};

module.exports = nextConfig;
