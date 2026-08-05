import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TelaSobre } from "../src/ui/telas/TelaSobre";

function paginaSobre() {
  return renderToStaticMarkup(TelaSobre({ onAbrirGestaoInformacao: () => undefined }));
}

function esperarOrdem(html: string, nomes: string[]) {
  const posicoes = nomes.map((nome) => html.indexOf(nome));
  expect(posicoes.every((posicao) => posicao >= 0)).toBe(true);
  expect(posicoes).toEqual([...posicoes].sort((a, b) => a - b));
}

describe("apoiadores na página Sobre", () => {
  it("identifica curso e matriz de todas as pessoas creditadas", () => {
    const html = paginaSobre();
    const creditos = [
      ["Guilherme Oliver Silva Pereira", "Sistemas de Informação (matriz 981)"],
      ["Namie Miquitera Yamada", "Sistemas de Informação (matriz 981)"],
      ["Thayssa Gaia Alves de Oliveira", "Engenharia de Controle e Automação (matriz 978)"],
      ["Victor Damasceno Oliveira", "Engenharia de Computação (matriz 844)"],
      ["Yago Augusto Constantino Ribeiro", "Sistemas de Informação (matriz 981)"],
      ["Beatriz Freire Kobayashi", "Engenharia Mecatrônica (matriz 973)"],
      ["Carlos Eduardo Correa Zanon", "Engenharia Eletrônica (matriz 968)"],
      ["Deborah Feijo Pinto", "Engenharia de Computação (matriz 962)"],
      ["Felipe Sledz Ferreira", "Engenharia de Computação (matriz 962)"],
      ["Jezreel Gonzalez Rodriguez", "Sistemas de Informação (matriz 806)"],
      ["Maria Heloisa Barbosa Benthiem", "Engenharia de Controle e Automação (matriz 978)"],
      ["Maria Luiza Cenci Stedile", "Engenharia de Computação (matriz 844)"],
      ["Rafael Furuyama", "Engenharia Mecatrônica (matriz 823)"],
      ["Victor Hugo Garrett", "Engenharia de Computação (matriz 844)"],
      ["Vitor dos Santos Maximo de Oliveira", "Sistemas de Informação (matriz 806)"],
    ];

    for (const [nome, curso] of creditos) {
      expect(html).toContain(nome);
      expect(html).toContain(curso);
    }
    expect(html).toContain("15 pessoas");
  });

  it("mantém revisores e demais apoiadores em ordem alfabética", () => {
    const html = paginaSobre();
    esperarOrdem(html, [
      "Guilherme Oliver Silva Pereira",
      "Namie Miquitera Yamada",
      "Thayssa Gaia Alves de Oliveira",
      "Victor Damasceno Oliveira",
      "Yago Augusto Constantino Ribeiro",
    ]);
    esperarOrdem(html, [
      "Beatriz Freire Kobayashi",
      "Carlos Eduardo Correa Zanon",
      "Deborah Feijo Pinto",
      "Felipe Sledz Ferreira",
      "Jezreel Gonzalez Rodriguez",
      "Maria Heloisa Barbosa Benthiem",
      "Maria Luiza Cenci Stedile",
      "Rafael Furuyama",
      "Victor Hugo Garrett",
      "Vitor dos Santos Maximo de Oliveira",
    ]);
  });
});
