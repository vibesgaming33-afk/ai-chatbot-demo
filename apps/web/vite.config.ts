import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: "localhost",
    port: 5173, // frontend React jalan di sini
    proxy: {
      "/api": {
        target: "http://localhost:5000", // backend Express jalan di sini
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
