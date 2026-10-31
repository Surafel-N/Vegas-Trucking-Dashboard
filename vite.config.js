import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (id.includes("recharts")) {
            return "charts";
          }

          if (id.includes("lucide-react")) {
            return "icons";
          }

          if (id.includes("react")) {
            return "react";
          }
        },
      },
    },
  },
});
