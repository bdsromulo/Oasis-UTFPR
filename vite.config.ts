import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { createHash } from "node:crypto";

// Injeta uma Content-Security-Policy restritiva apenas no build de produção
// (o servidor de dev do Vite usa HMR/eval e seria bloqueado por ela).
// O hash SHA-256 de cada <script> inline (o anti-flicker de tema em index.html)
// é calculado automaticamente, então a CSP nunca fica dessincronizada.
function csp(): Plugin {
  return {
    name: "oasis-csp",
    apply: "build",
    enforce: "post",
    transformIndexHtml(html) {
      const hashes: string[] = [];
      const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(html)) !== null) {
        const codigo = m[1];
        if (!codigo.trim()) continue;
        hashes.push(`'sha256-${createHash("sha256").update(codigo, "utf8").digest("base64")}'`);
      }
      const politica = [
        "default-src 'self'",
        `script-src 'self' ${hashes.join(" ")}`.trim(),
        // React/Tailwind aplicam estilos inline em runtime (baixo risco vs. script)
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        // worker do pdf.js: mesma origem (bundle) e, em alguns navegadores, via blob:
        "worker-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'none'",
        "frame-ancestors 'none'",
      ].join("; ");
      return html.replace(
        "</title>",
        `</title>\n    <meta http-equiv="Content-Security-Policy" content="${politica}" />`,
      );
    },
  };
}

// base: repositório GitHub Pages (https://bdsromulo.github.io/Oasis-UTFPR/)
export default defineConfig({
  base: "/Oasis-UTFPR/",
  plugins: [react(), tailwindcss(), csp()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // em Node, o pdf.js precisa do build legacy (fake worker)
    alias: { "pdfjs-dist": "pdfjs-dist/legacy/build/pdf.mjs" },
  },
} as never);
