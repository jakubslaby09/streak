import { defineConfig } from "vite"
import { viteSingleFile } from "vite-plugin-singlefile"

export default defineConfig({
  plugins: [
    viteSingleFile({
      inlinePattern: [ "*.css" ],
    }),
  ],
  server: {
    port: 3200,
    host: true,
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: "[name].js",
      }
    }
  },
})