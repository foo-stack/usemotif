/** @type {import('next').NextConfig} */
const nextConfig = {
  // The shared screens and the motif packages are workspace sources and 'use client' modules,
  // which the App Router has to compile itself.
  transpilePackages: [
    '@usemotif/example-universal-shared',
    'usemotif',
    '@usemotif/react',
    '@usemotif/headless',
    '@usemotif/ui',
    '@usemotif/tokens',
  ],
};

export default nextConfig;
