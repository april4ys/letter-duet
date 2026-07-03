import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig(({ mode }) => ({
  base: "./",
  build: {
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) =>
          assetInfo.names.some((name) => name.endsWith(".css"))
            ? "style.css"
            : "assets/[name]-[hash][extname]",
      },
    },
  },
  plugins: [react(), ...(mode === "https" ? [basicSsl()] : [])],
}));
