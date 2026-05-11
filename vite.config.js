import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import posthtml from "@vituum/vite-plugin-posthtml";
import include from "posthtml-include";

export default defineConfig({
  plugins: [
    react(),
    posthtml({
      plugins: [include()],
    }),
  ],
});
