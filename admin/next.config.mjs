import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  outputFileTracingRoot: path.join(__dirname, '../'),
  onDemandEntries: {
    maxInactiveAge: 0,
  },
};

export default nextConfig;
