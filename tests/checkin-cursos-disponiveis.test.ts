import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MATRIZES_DO_CURSO, TelaCheckin } from "../src/ui/telas/Checkin";
import { dadosDoCursoPorMatriz } from "../src/domain/dadosCurso";

function renderizarCheckin() {
  return renderToStaticMarkup(createElement(TelaCheckin, {
    carregando: false,
    erro: null,
    onProcessarArquivo: () => undefined,
    onAnalisarSavefile: async () => { throw new Error("não usado"); },
    onConfirmarSavefile: () => undefined,
    onContinuarSemRegistro: () => undefined,
    onAbrirGestaoInformacao: () => undefined,
  }));
}

describe("cursos disponíveis no check-in", () => {
  it("exibe todos os cursos e matrizes cobertos abaixo da importação", () => {
    const html = renderizarCheckin();
    const importacao = html.indexOf("Já tenho um savefile");
    const lista = html.indexOf("Cursos e matrizes disponíveis");
    const modoLivre = html.indexOf("2. Entrar sem Histórico");

    expect(importacao).toBeGreaterThanOrEqual(0);
    expect(lista).toBeGreaterThan(importacao);
    expect(modoLivre).toBeGreaterThan(lista);
    expect(html).toContain("Sistemas de Informação");
    expect(html).toContain("Engenharia de Computação");
    expect(html).toContain("Engenharia Eletrônica");
    expect(html).toContain("Engenharia de Controle e Automação");
    expect(html).toContain("Engenharia Mecatrônica");
    for (const matriz of ["806", "981", "844", "962", "968", "978", "823", "973"]) {
      expect(html).toContain(`>${matriz}<`);
    }
  });
});

/**
 * O modo livre não lê histórico: a matriz sai do que o aluno escolhe no
 * dropdown. Se uma matriz implementada não estiver listada aqui, ela fica
 * inalcançável para quem entra sem histórico, mesmo tendo dados completos —
 * foi o que aconteceu com a 806, anunciada na lista pública mas ausente do
 * seletor.
 */
describe("matrizes selecionáveis no modo livre", () => {
  it("oferece a 806 junto da 981 para BSI", () => {
    const opcoes = MATRIZES_DO_CURSO["bsi-981"];
    expect(opcoes.map((o) => o.numero)).toEqual(["981", "806"]);
    expect(opcoes.every((o) => o.disponivel)).toBe(true);
  });

  it("mantém a 981 como matriz padrão do BSI", () => {
    // `selecionarCurso` adota a primeira opção disponível: trocar a ordem
    // mudaria silenciosamente o padrão de quem entra sem histórico.
    expect(MATRIZES_DO_CURSO["bsi-981"].find((o) => o.disponivel)?.numero).toBe("981");
  });

  it("toda matriz marcada como disponível resolve para dados de curso reais", () => {
    for (const [curso, opcoes] of Object.entries(MATRIZES_DO_CURSO)) {
      for (const opcao of opcoes.filter((o) => o.disponivel)) {
        expect(
          dadosDoCursoPorMatriz(Number(opcao.numero)),
          `${curso} anuncia a matriz ${opcao.numero} sem dados carregados`,
        ).not.toBeNull();
      }
    }
  });

  it("todas as matrizes da lista pública podem ser escolhidas no modo livre", () => {
    const selecionaveis = new Set(
      Object.values(MATRIZES_DO_CURSO)
        .flat()
        .filter((o) => o.disponivel)
        .map((o) => o.numero),
    );
    for (const matriz of ["806", "981", "844", "962", "968", "978", "823", "973"]) {
      expect(selecionaveis, `matriz ${matriz} anunciada mas não selecionável`).toContain(matriz);
    }
  });
});
