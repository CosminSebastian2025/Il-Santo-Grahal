// Configurazione Next.js: export statico compatibile con Tauri e GitHub Pages.
import type { NextConfig } from "next";

// Sottopercorso di pubblicazione (vuoto in locale e nell'app Tauri).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  // Genera file statici in out/ invece di richiedere un server Node.
  output: "export",
  basePath,
  images: {
    // L'export statico non supporta l'ottimizzatore di immagini.
    unoptimized: true,
  },
  // Cartelle con index.html, compatibili con hosting statico.
  trailingSlash: true,
};

export default nextConfig;