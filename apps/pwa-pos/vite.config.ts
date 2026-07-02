import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto", // Menyuntikkan script registrasi secara otomatis
      devOptions: {
        enabled: true, // WAJIB DI-TRUE AGAR JALAN SAAT 'npm run dev'
        type: "module",
      },
      includeAssets: ["icon.png"],
      manifest: {
        name: "Asstro ERP POS",
        short_name: "AsstroPOS",
        description: "Enterprise-Grade Local-First Event-Sourced POS System",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#ea580c",
        orientation: "landscape",
        categories: ["business", "productivity"],
        icons: [
          {
            src: "/icon.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
      },
    }),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 3000,
  },
});
