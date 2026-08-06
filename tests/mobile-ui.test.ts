import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function fonte(caminho: string) {
  return readFileSync(new URL(`../${caminho}`, import.meta.url), "utf8");
}

describe("contratos da interface móvel", () => {
  it("carrega o pdf.js apenas quando o aluno escolhe um PDF", () => {
    const main = fonte("src/main.tsx");
    const app = fonte("src/ui/App.tsx");
    const adaptador = fonte("src/domain/historico/extrair-pdf-browser.ts");

    expect(main).not.toContain("pdfjs-dist");
    expect(app).toContain('await import("../domain/historico/extrair-pdf-browser")');
    expect(adaptador).toContain('pdf.worker.min.mjs?url');
  });

  it("protege as barras e gavetas fixas da área segura do aparelho", () => {
    expect(fonte("src/ui/App.tsx")).toContain("env(safe-area-inset-bottom)");
    expect(fonte("src/ui/MenuMobile.tsx")).toContain("env(safe-area-inset-bottom)");
    expect(fonte("src/ui/telas/Contato.tsx")).toContain("env(safe-area-inset-bottom)");
  });

  it("mantém os controles móveis principais com alvo mínimo de 44 px", () => {
    expect(fonte("src/ui/componentes.tsx")).toContain("h-11 w-11");
    expect(fonte("src/ui/telas/Grade.tsx")).toContain("min-h-11");
    expect(fonte("src/ui/telas/Contato.tsx")).toContain("min-h-11");
  });

  it("torna as tabelas largas navegáveis e explicadas no celular", () => {
    const grade = fonte("src/ui/telas/Grade.tsx");
    const gestao = fonte("src/ui/telas/TelaGestaoInformacao.tsx");

    expect(grade).toContain('aria-label="Grade horária com rolagem horizontal"');
    expect(grade).toContain("Deslize horizontalmente");
    expect(gestao).toContain('aria-label="Tabela com rolagem horizontal"');
    expect(gestao).toContain("Deslize horizontalmente");
  });
});
