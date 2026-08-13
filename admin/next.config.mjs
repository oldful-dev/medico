import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  output: 'export',
  outputFileTracingRoot: path.join(__dirname, '../'),
  assetPrefix: '/',
  basePath: '',
  images: {
    unoptimized: true,
  },
  onDemandEntries: {
    maxInactiveAge: 0,
  },
};

export default nextConfig;
