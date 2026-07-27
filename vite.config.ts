import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { createHash } from "node:crypto";

// Únicas exceções de terceiro na CSP: o GoatCounter (analytics sem cookies nem
// dados pessoais). O count.js vem do CDN gc.zgo.at e registra o hit tentando
// navigator.sendBeacon() (cai em connect-src) com fallback para um <img>
// (cai em img-src) — por isso o host do painel precisa aparecer nas duas.
const GC_SCRIPT = "https://gc.zgo.at";
const GC_ENDPOINT = "https://oasisutfpr.goatcounter.com";

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
        `script-src 'self' ${GC_SCRIPT} ${hashes.join(" ")}`.trim(),
        // React/Tailwind aplicam estilos inline em runtime (baixo risco vs. script)
        "style-src 'self' 'unsafe-inline'",
        `img-src 'self' data: ${GC_ENDPOINT}`,
        "font-src 'self'",
        `connect-src 'self' ${GC_ENDPOINT}`,
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

// base: raiz do domínio próprio (oasisutfpr.com.br via public/CNAME).
// Era "/Oasis-UTFPR/" enquanto o site vivia em bdsromulo.github.io/Oasis-UTFPR/;
// com domínio customizado o GitHub Pages serve a partir da raiz.
export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss(), csp()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // em Node, o pdf.js precisa do build legacy (fake worker)
    alias: { "pdfjs-dist": "pdfjs-dist/legacy/build/pdf.mjs" },
    // As suítes de histórico real abrem PDFs de centenas de páginas pelo pdf.js.
    // Isoladas levam ~2s, mas com a suíte inteira rodando em paralelo passavam
    // dos 5s padrão e falhavam por tempo — vermelho intermitente que não é
    // defeito nenhum do código.
    testTimeout: 30000,
  },
} as never);
