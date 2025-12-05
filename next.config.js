/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', '*.vercel.app', '*.supabase.co'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
}

module.exports = nextConfig

