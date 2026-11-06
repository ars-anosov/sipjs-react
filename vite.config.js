import { cpSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { mockApiPlugin } from "./mock/vite-mock-api.js";

// GitHub Pages: публикуется каталог dist/ целиком (npm run deploy), поэтому документация должна
// лежать внутри сборки: диаграммы — /archify/, оглавление — /docs/. В dev-режиме не нужна.
const githubPagesDocs = () => {
  let root = process.cwd();
  let outDir = "dist";
  return {
    name: "github-pages-docs",
    apply: "build",
    configResolved(config) {
      root = config.root;
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      // .visual-check.* — служебные скриншоты и receipt archify, в git они игнорируются.
      cpSync(resolve(root, "docs/archify"), resolve(outDir, "archify"), {
        recursive: true,
        filter: (source) => !/\.visual-check\./.test(source),
      });
      mkdirSync(resolve(outDir, "docs"), { recursive: true });
      cpSync(resolve(root, "docs/index.html"), resolve(outDir, "docs/index.html"));
    },
  };
};

export default defineConfig({
  base: "./", // делает ссылки относительными
  build: {
    outDir: "dist",
    assetsDir: "assets",
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "react",
              test: /node_modules\/(react|react-dom)\//,
            },
            {
              name: "redux",
              test: /node_modules\/(redux|react-redux|redux-thunk|redux-logger)\//,
            },
            {
              name: "mui",
              test: /node_modules\/(@mui|@emotion)\//,
            },
            {
              name: "sipjs",
              test: /node_modules\/(sip\.js)\//,
            },
            {
              name: "livekit",
              test: /node_modules\/(@livekit|livekit-client)\//,
            },
            {
              name: "vendor",
              test: /node_modules/,
            },
          ],
        },
      },
    },
  },
  server: {
    port: 3000,
    host: "0.0.0.0",
    watch: {
      usePolling: true, // Включает опрос для отслеживания изменений в контейнерах/WSL
    },
  },
  plugins: [react(), mockApiPlugin(), githubPagesDocs()],
});
