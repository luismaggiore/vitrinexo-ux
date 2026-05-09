import { defineConfig } from "vite";
import posthtml from "@vituum/vite-plugin-posthtml";
import include from "posthtml-include";

export default defineConfig({
  plugins: [
    posthtml({
      plugins: [include()],
    }),
  ],
});
