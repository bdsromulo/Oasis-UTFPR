import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CartaoToast } from "../src/ui/toasts/PilhaToasts";
import type { Toast } from "../src/ui/toasts/pilha";

function fonte(caminho: string) {
  return readFileSync(new URL(`../${caminho}`, import.meta.url), "utf8");
}

function cartao(parcial: Partial<Toast>) {
  const toast: Toast = {
    chave: "sim:aviso:extensao",
    tom: "aviso",
    titulo: "Aviso da projeção",
    duracaoMs: 20_000,
    criadoEm: 0,
    pausadoEm: null,
    saindo: false,
    ...parcial,
  };
  return renderToStaticMarkup(
    CartaoToast({ toast, onDispensar: () => undefined }),
  );
}

describe("cartão de aviso flutuante", () => {
  it("anuncia aviso comum como status educado", () => {
    const html = cartao({ tom: "aviso", descricao: "Você ainda deve buscar extensão." });

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("Você ainda deve buscar extensão.");
  });

  it("interrompe o leitor de tela no choque de turma, que substitui um modal", () => {
    const html = cartao({
      tom: "alerta",
      titulo: "Sistemas Distribuídos não entrou na grade",
      detalhes: ["ICSE40 S73 · choque em Seg T1"],
      duracaoMs: 0,
    });

    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="assertive"');
    expect(html).toContain("ICSE40 S73 · choque em Seg T1");
  });

  it("oferece o X com rótulo acessível e alvo de toque de 44px", () => {
    const html = cartao({});

    expect(html).toContain('aria-label="Fechar aviso"');
    expect(html).toContain("min-h-11");
    expect(html).toContain("min-w-11");
  });

  it("troca a animação de entrada pela de saída na fase de fade", () => {
    expect(cartao({ saindo: false })).toContain("animate-toast-entra");
    expect(cartao({ saindo: true })).toContain("animate-toast-sai");
  });
});

describe("contêiner da pilha", () => {
  const arquivo = fonte("src/ui/toasts/PilhaToasts.tsx");

  it("fica no canto inferior direito, acima de todo modal", () => {
    expect(arquivo).toContain('aria-label="Avisos"');
    expect(arquivo).toContain("fixed");
    expect(arquivo).toContain("z-[90]");
    expect(arquivo).toContain("env(safe-area-inset-bottom)");
  });

  it("sobe acima da barra de grade flutuante do mobile", () => {
    expect(arquivo).toContain("acimaDaBarraMobile");
    expect(fonte("src/ui/App.tsx")).toContain(
      "<PilhaToasts acimaDaBarraMobile={barraGradeMobileVisivel} />",
    );
  });
});

describe("as três fontes de conflito publicam na pilha", () => {
  it("o choque de turma virou aviso flutuante, não mais modal bloqueante", () => {
    for (const tela of ["src/ui/telas/LayoutGNH.tsx", "src/ui/telas/PossoCursar.tsx"]) {
      const texto = fonte(tela);
      expect(texto).not.toContain("ModalConflitoTurma");
      expect(texto).toContain("avisarChoque(toasts, bloqueio)");
    }
  });

  it("o Simulador publica avisos e pedidos negados fora do corpo do render", () => {
    const tela = fonte("src/ui/telas/TelaSimuladorFormatura.tsx");

    expect(tela).toContain("avisarProjecao(toasts, resultado.avisos, resultado.exclusoesImpossiveis)");
    // a dependência é a lista de chaves: o resultado é objeto novo a cada
    // mexida num controle e republicaria tudo
    expect(tela).toContain("}, [chavesDosAvisos]);");
  });

  it("o registro dos avisos continua na página, porém recolhido", () => {
    const tela = fonte("src/ui/telas/TelaSimuladorFormatura.tsx");

    expect(tela).toContain("<details");
    expect(tela).toContain("avisos desta projeção");
  });
});
