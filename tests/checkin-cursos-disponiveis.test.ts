import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TelaCheckin } from "../src/ui/telas/Checkin";

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
