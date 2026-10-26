/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { bodySizeLimit: "25mb" } },
  serverExternalPackages: ["exceljs"],
};
export default nextConfig;
