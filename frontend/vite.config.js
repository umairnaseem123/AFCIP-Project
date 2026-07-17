import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
    headers: {
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' http://127.0.0.1:8000 http://127.0.0.1:8001 https://ubl-project-hackaton-main.vercel.app; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';",
    },
  },
});
