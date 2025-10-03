/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Se quiser usar <Image/>, configure domínios aqui
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      // MUDANÇA: Adicionada esta linha para autorizar as imagens de perfil do Google
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ]
  }
};

module.exports = nextConfig;