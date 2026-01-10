/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/admin',
  images: {
    unoptimized: true
  },
  typescript: {
    ignoreBuildErrors: false,
  },
}

module.exports = nextConfig