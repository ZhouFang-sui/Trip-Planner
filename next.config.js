/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'api.example.com'],
  },
  env: {
    NEXT_PUBLIC_APP_NAME: 'Trip Planner',
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // Disable webpack's persistent filesystem caching in development
      // to prevent "RangeError: Failed to allocate memory" warnings.
      // to prevent huge storage bloat and memory allocation warnings.
      config.cache = false;
    }
    return config;
  },
};

module.exports = nextConfig;
