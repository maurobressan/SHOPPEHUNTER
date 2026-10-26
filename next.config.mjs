/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { bodySizeLimit: "25mb" } },
  serverExternalPackages: ["exceljs"],
  // fotos da página inicial (Unsplash, licença gratuita)
  images: { remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com", pathname: "/photo-*" }] },
};
export default nextConfig;
