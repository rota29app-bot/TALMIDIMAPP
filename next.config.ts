import type { NextConfig } from "next";
// PWA ROTA29 servido em /sw.js com atualização online-first.
// Evita o cache antigo que causava telas e login desatualizados.
const nextConfig: NextConfig = { turbopack: {} };
export default nextConfig;
