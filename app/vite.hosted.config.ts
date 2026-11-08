import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appDirectory = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: resolve(appDirectory, "hosted"),
  plugins: [react()],
  envDir: appDirectory,
  publicDir: false,
  server: { host: "127.0.0.1", port: 4174, strictPort: true },
  build: {
    outDir: resolve(appDirectory, "dist-hosted"),
    emptyOutDir: true,
  },
});
