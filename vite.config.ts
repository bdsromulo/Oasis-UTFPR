import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// base: repositório GitHub Pages (https://bdsromulo.github.io/Oasis-UTFPR/)
export default defineConfig({
  base: "/Oasis-UTFPR/",
  plugins: [react(), tailwindcss()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // em Node, o pdf.js precisa do build legacy (fake worker)
    alias: { "pdfjs-dist": "pdfjs-dist/legacy/build/pdf.mjs" },
  },
} as never);
