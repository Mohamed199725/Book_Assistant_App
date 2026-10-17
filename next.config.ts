import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    experimental: {
        serverActions: {
            bodySizeLimit: '100mb',
        }
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    images: { 
        remotePatterns: [
            { protocol: 'https', hostname: 'covers.openlibrary.org' },
            { protocol: 'https', hostname: 's7pmqnffig4zbjdb.public.blob.vercel-storage.com' },
        ]
    },
    // 👇 ADD THIS BLOCK 👇
    turbopack: {
        resolveAlias: {
            '@': '.',
        },
    },
};

export default nextConfig;