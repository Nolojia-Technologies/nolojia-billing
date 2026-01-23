import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Optimize images
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24, // 24 hours
  },

  // Compiler optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === "production",
  },

  // Experimental optimizations
  experimental: {
    // Enable optimized package imports - reduces bundle size
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-icons",
      "recharts",
      "@tanstack/react-query",
      "date-fns",
      "dayjs",
    ],
  },

  // Module transpilation for specific packages
  transpilePackages: ["lucide-react"],

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: "all",
          cacheGroups: {
            // Separate vendor chunks for better caching
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: "vendors",
              chunks: "all",
              priority: 10,
            },
            // Separate chunk for map libraries
            maps: {
              test: /[\\/]node_modules[\\/](leaflet|maplibre-gl|react-leaflet)[\\/]/,
              name: "maps",
              chunks: "all",
              priority: 20,
            },
            // Separate chunk for chart libraries
            charts: {
              test: /[\\/]node_modules[\\/](recharts|d3-.*)[\\/]/,
              name: "charts",
              chunks: "all",
              priority: 20,
            },
          },
        },
      };
    }
    return config;
  },
};

export default nextConfig;
