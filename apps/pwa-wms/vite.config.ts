import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      devOptions: {
        enabled: true,
        type: "module",
      },
      includeAssets: ["icon.png"],
      manifest: {
        name: "Asstro ERP WMS",
        short_name: "AsstroWMS",
        description: "Enterprise-Grade Warehouse Management System",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#0284c7",
        orientation: "landscape",
        categories: ["business", "productivity", "logistics"],
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
        maximumFileSizeToCacheInBytes: 5000000,
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
      },
    }),
  ],
  resolve: {
    alias: {
      "@asstro/ledger": path.resolve(__dirname, "../../packages/ledger/src/index.ts"),
      "@asstro/projection": path.resolve(__dirname, "../../packages/projection/src/index.ts"),
      "@asstro/protocol": path.resolve(__dirname, "../../packages/protocol/src/index.ts"),
    },
  },
  server: {
    port: 3001,
  },
});
