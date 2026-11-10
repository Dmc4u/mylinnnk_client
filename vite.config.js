import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3002,
    open: true,
    // Development only: forward API calls to the MyLinnnk API (mylinnnk_api) on port 3003.
    proxy: {
      "/api": "http://localhost:3003",
    },
  },
});
