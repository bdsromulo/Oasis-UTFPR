import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ModalNovidades } from "../src/ui/telas/ModalNovidades";
import { NOVIDADES, VERSAO_NOVIDADES } from "../src/ui/novidades";

function fonte(caminho: string) {
  return readFileSync(new URL(`../${caminho}`, import.meta.url), "utf8");
}

function renderizar() {
  return renderToStaticMarkup(
    createElement(ModalNovidades, { aberto: true, onFechar: () => undefined }),
  );
}

describe("conteúdo das novidades", () => {
  it("tem ids únicos e não vazios, que servem de âncora", () => {
    const ids = NOVIDADES.map((n) => n.id);

    expect(ids.every((id) => id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("anuncia a virada de semestre, a presunção e os avisos em pop-up", () => {
    const html = renderizar();

    expect(html).toContain("2027.1");
    expect(html).toContain("2026.1");
    expect(html).toContain("aprovadas");
    expect(html).toContain("canto inferior direito");
  });

  it("renderiza um cartão por item, na ordem do arquivo de conteúdo", () => {
    const html = renderizar();
    const posicoes = NOVIDADES.map((n) => html.indexOf(`data-novidade="${n.id}"`));

    expect(posicoes.every((p) => p >= 0)).toBe(true);
    expect([...posicoes].sort((a, b) => a - b)).toEqual(posicoes);
  });
});

describe("a versão dispara o modal de novo", () => {
  it("mudou em relação à campanha anterior", () => {
    // a chave do localStorage carrega a versão no nome: uma chave nova nunca
    // foi lida por ninguém, e o destaque volta para toda a base
    expect(VERSAO_NOVIDADES).not.toBe("cursos_matrizes_2026_08_v1");
  });

  it("a chave do App interpola a versão, em vez de repetir o slug à mão", () => {
    const app = fonte("src/ui/App.tsx");

    expect(app).toContain("oasis.novidades_lidas.${VERSAO_NOVIDADES}");
    expect(app).not.toContain("cursos_matrizes_2026_08_v1");
  });
});

describe("o botão de Novidades não depende de avaliações", () => {
  it("abre para qualquer curso, tenha ou não acervo de reviews", () => {
    // o modal abre sozinho sem essa guarda; com ela no botão, quem não tivesse
    // reviews recebia o modal e ficava sem como reabri-lo
    const app = fonte("src/ui/App.tsx");
    const trechos = app.split("onClick={abrirNovidades}");

    expect(trechos.length).toBeGreaterThan(1);
    for (const antes of trechos.slice(0, -1)) {
      const contexto = antes.slice(-400);
      expect(contexto).not.toContain("reviewsHabilitadasPara");
    }
  });
});
