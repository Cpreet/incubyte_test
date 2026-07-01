import path from "node:path";
import { defineConfig } from "vitest/config";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/employees": "http://127.0.0.1:8787",
      "/components": "http://127.0.0.1:8787",
      "/component-definitions": "http://127.0.0.1:8787",
      "/analytics": "http://127.0.0.1:8787",
      "/health": "http://127.0.0.1:8787",
    },
  },
  preview: {
    proxy: {
      "/employees": "http://127.0.0.1:8787",
      "/components": "http://127.0.0.1:8787",
      "/component-definitions": "http://127.0.0.1:8787",
      "/analytics": "http://127.0.0.1:8787",
      "/health": "http://127.0.0.1:8787",
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
});
