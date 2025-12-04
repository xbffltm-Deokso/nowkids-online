/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    basePath: '/nowkids-online',
    images: {
        unoptimized: true,
    },
    typescript: {
        ignoreBuildErrors: false,
    },
    eslint: {
        ignoreDuringBuilds: false,
    },
};

export default nextConfig;