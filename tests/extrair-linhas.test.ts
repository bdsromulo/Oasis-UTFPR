import { describe, expect, it } from "vitest";

/**
 * O agrupamento de trechos numa linha é o ponto onde um Histórico Escolar
 * inteiro pode se perder em silêncio: se o texto sair com espaço no meio das
 * palavras, nenhum rótulo de seção casa e o perfil vem quase vazio, sem erro.
 *
 * Os PDFs de BSI emitem a letra acentuada num item só; os de Eng. Comp. emitem
 * o acento como item próprio. Juntar tudo com espaço quebra o segundo caso.
 */

// mesma regra do módulo: espaço só quando há lacuna real entre os trechos
const LACUNA = 0.6;
function juntar(itens: { x: number; largura: number; str: string }[]): string {
  let texto = "";
  let fim: number | null = null;
  for (const it of itens) {
    if (fim !== null && it.x - fim > LACUNA) texto += " ";
    texto += it.str;
    fim = it.x + it.largura;
  }
  return texto.replace(/\s+/g, " ").trim();
}

describe("agrupamento de trechos em linha", () => {
  it("não insere espaço onde o acento veio como item separado", () => {
    // "Obrigatórias" quebrado em Obrigat + ó + rias, sem lacuna entre eles
    const itens = [
      { x: 0, largura: 30, str: "Obrigat" },
      { x: 30, largura: 4, str: "ó" },
      { x: 34, largura: 16, str: "rias" },
    ];
    expect(juntar(itens)).toBe("Obrigatórias");
  });

  it("preserva o espaço entre palavras de fato separadas", () => {
    const itens = [
      { x: 0, largura: 40, str: "Disciplinas" },
      { x: 44, largura: 40, str: "Obrigatórias" },
    ];
    expect(juntar(itens)).toBe("Disciplinas Obrigatórias");
  });

  it("reconstrói um cabeçalho de seção com vários acentos", () => {
    const itens = [
      { x: 0, largura: 20, str: "Situa" },
      { x: 20, largura: 8, str: "çã" },
      { x: 28, largura: 4, str: "o" },
      { x: 36, largura: 10, str: "do" },
      { x: 50, largura: 20, str: "Per" },
      { x: 70, largura: 4, str: "í" },
      { x: 74, largura: 12, str: "odo" },
    ];
    expect(juntar(itens)).toBe("Situação do Período");
  });
});
