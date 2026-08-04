import { describe, expect, it } from "vitest";
import { criarPilhaCamadas } from "../src/ui/hooks/pilhaCamadas";

/**
 * Regressão do bug de iOS.
 *
 * No iPhone, tocar em "Configurações", "Como usar" ou "Sobre" dentro do menu do
 * celular fechava o menu e não abria nada. A troca de camada acontece num commit
 * só — o menu fecha e a tela nova abre —, e a versão anterior perguntava ao
 * navegador, via `history.state`, quem estava no topo. O WebKit não reflete o
 * `pushState` na mesma volta do event loop, então a resposta era a camada
 * ANTERIOR, o código dava `history.back()` e o `popstate` derrubava a tela recém
 * aberta.
 *
 * O caso que fixa isso é o "fechar camada coberta": fechar uma camada que já não
 * é o topo NÃO pode mexer no histórico.
 */

function pilhaFalsa() {
  const chamadas: string[] = [];
  const pilha = criarPilhaCamadas({
    empilhar: (id) => chamadas.push(`empilhar:${id}`),
    voltar: () => chamadas.push("voltar"),
  });
  return { pilha, chamadas };
}

describe("pilha de camadas", () => {
  it("abre e fecha uma camada sozinha, desfazendo a entrada", () => {
    const { pilha, chamadas } = pilhaFalsa();
    pilha.abrir("modal");
    expect(pilha.camadas()).toEqual(["modal"]);
    pilha.fechar("modal");
    expect(pilha.camadas()).toEqual([]);
    expect(chamadas).toEqual(["empilhar:modal", "voltar"]);
  });

  it("não volta ao fechar camada que já foi coberta por outra", () => {
    const { pilha, chamadas } = pilhaFalsa();
    // é a sequência do menu do celular: a tela nova abre e o menu fecha
    pilha.abrir("menuMobile");
    pilha.abrir("sobre");
    pilha.fechar("menuMobile");

    expect(pilha.camadas(), "a camada de cima continua aberta").toEqual(["sobre"]);
    expect(
      chamadas.filter((c) => c === "voltar"),
      "voltar aqui derrubaria a tela recém aberta — é o bug do iOS",
    ).toEqual([]);
  });

  it("depois disso, fechar a de cima ainda desfaz a entrada dela", () => {
    const { pilha, chamadas } = pilhaFalsa();
    pilha.abrir("menuMobile");
    pilha.abrir("sobre");
    pilha.fechar("menuMobile");
    pilha.fechar("sobre");
    expect(pilha.camadas()).toEqual([]);
    expect(chamadas.filter((c) => c === "voltar")).toEqual(["voltar"]);
  });

  it("o popstate pertence só à camada do topo", () => {
    const { pilha } = pilhaFalsa();
    pilha.abrir("menuMobile");
    pilha.abrir("sobre");
    expect(pilha.ehTopo("sobre")).toBe(true);
    expect(pilha.ehTopo("menuMobile")).toBe(false);
  });

  it("saída por popstate não pede voltar de novo", () => {
    const { pilha, chamadas } = pilhaFalsa();
    pilha.abrir("modal");
    // o botão voltar do Android já consumiu a entrada
    pilha.removerSemVoltar("modal");
    expect(pilha.camadas()).toEqual([]);
    // o efeito do React ainda vai rodar a limpeza; ela não pode voltar de novo
    pilha.fechar("modal");
    expect(chamadas.filter((c) => c === "voltar")).toEqual([]);
  });

  it("ignora o fechamento de camada que não está aberta", () => {
    const { pilha, chamadas } = pilhaFalsa();
    pilha.fechar("fantasma");
    expect(chamadas).toEqual([]);
  });
});
