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

/**
 * Ambiente de testes aberto, servido por outro repositório no GitHub Pages.
 *
 * Ligado por `OASIS_BETA=1` no build. Muda três coisas e nada mais, para que o
 * beta continue sendo o mesmo código do site — um beta que diverge do produto
 * deixa de testar o produto.
 */
const BETA = process.env.OASIS_BETA === "1";

/**
 * Prefixo do caminho servido.
 *
 * A produção vive na raiz do domínio próprio (oasisutfpr.com.br via
 * public/CNAME). Um repositório comum no GitHub Pages serve em SUBPASTA
 * (usuario.github.io/repo/), e nesse caso `base` precisa ser essa subpasta com
 * as barras nas duas pontas — senão o HTML carrega e todo o JS e CSS dá 404,
 * resultando numa página em branco sem erro visível.
 */
const BASE = process.env.OASIS_BASE ?? "/";

/**
 * No beta, pede para os buscadores não indexarem.
 *
 * É o ponto que importa deste ambiente: o beta serve as mesmas avaliações, com
 * nome completo de gente real. Sem o noindex, o buscador indexa essas pessoas
 * duas vezes, e o consentimento que elas deram fala do site do Oásis, não de uma
 * cópia paralela.
 *
 * A remoção do `public/CNAME` — que reivindicaria oasisutfpr.com.br para o
 * repositório do beta — NÃO mora aqui: `public/` é copiado pelo Vite fora do
 * bundle e depois dos hooks, então o workflow apaga o arquivo do `dist`.
 */
function beta(): Plugin {
  return {
    name: "oasis-beta",
    apply: "build",
    enforce: "post",
    transformIndexHtml(html) {
      if (!BETA) return html;
      return html.replace(
        "</head>",
        '  <meta name="robots" content="noindex, nofollow" />\n  </head>',
      );
    },
  };
}

export default defineConfig({
  base: BASE,
  plugins: [react(), tailwindcss(), csp(), beta()],
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
