/** @type {import('next').NextConfig} */
const withPWAInit = require('next-pwa');

const withPWA = withPWAInit({
  dest: "public",
  maximumFileSizeToCacheInBytes: 3000000,
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development"
});

const nextConfig = withPWA({
  trailingSlash: true,
  reactStrictMode: true,
  productionBrowserSourceMaps: true,
});

module.exports = nextConfig;