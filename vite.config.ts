import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

function removeCrossoriginAttributes(): Plugin {
  return {
    name: "remove-crossorigin-attributes",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        return html.replace(/\s+crossorigin(?:="[^"]*")?/g, "");
      },
    },
  };
}

export default defineConfig(({ mode }) => ({
  base: "./",
  build: {
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        entryFileNames: "assets/index-Bbh26qMm.js",
        chunkFileNames: (chunkInfo) =>
          chunkInfo.name === "App"
            ? "assets/App-CvvPHPcN.js"
            : "assets/[name].js",
        assetFileNames: (assetInfo) =>
          assetInfo.names.some((name) => name.endsWith(".css"))
            ? "style.css"
            : "assets/[name]-[hash][extname]",
      },
    },
  },
  plugins: [
    react(),
    removeCrossoriginAttributes(),
    ...(mode === "https" ? [basicSsl()] : []),
  ],
}));
