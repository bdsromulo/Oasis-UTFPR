import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ModalNovidades } from "../src/ui/telas/ModalNovidades";

function renderizarNovidades() {
  return renderToStaticMarkup(createElement(ModalNovidades, {
    aberto: true,
    onFechar: () => undefined,
  }));
}

describe("novos cursos e matrizes nas Novidades", () => {
  it("consolida BSI, Controle e Mecatrônica em um único bloco", () => {
    const html = renderizarNovidades();

    expect(html.match(/Adição de novos cursos e matrizes/g)).toHaveLength(1);
    expect(html).not.toContain("Matriz 806 de Sistemas de Informação");
    expect(html).not.toContain("Engenharia de Controle e Automação — matriz 978");
    expect(html).toContain("Sistemas de Informação");
    expect(html).toContain("Engenharia de Controle e Automação");
    expect(html).toContain("Engenharia Mecatrônica");
    for (const matriz of ["806", "978", "823", "973"]) {
      expect(html).toContain(`matriz ${matriz}`);
    }
    expect(html.indexOf("Adição de novos cursos e matrizes")).toBeLessThan(
      html.indexOf("Savefile: leve seu planejamento"),
    );
  });
});
