/** @type {import('next').NextConfig} */
const nextConfig = {
reactStrictMode: true,
images: {
// Se quiser usar <Image/>, configure domínios aqui
remotePatterns: [
{ protocol: 'https', hostname: '**.supabase.co' }
]
}
};
module.exports = nextConfig;