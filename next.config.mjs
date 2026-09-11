const nextConfig = {
  transpilePackages: ["three", "@react-three/fiber"],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  experimental: {
    serverActions: {
      allowedOrigins: ["ejeuno.onrender.com", "localhost:3000"],
    },
  },
};

export default nextConfig;
