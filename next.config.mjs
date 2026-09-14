const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  experimental: {
    serverActions: {
      allowedOrigins: ["ejeuno.onrender.com", "ejeuno-web.onrender.com", "localhost:3000"],
    },
  },
};

export default nextConfig;
