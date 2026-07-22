import { describe, expect, it } from "vitest";
import matrizJson from "../data/matriz-981.json";
import matrizEngCompJson from "../data/eng-comp/matriz-844.json";
import turmas20252 from "../data/turmas/2025-2.json";
import turmas20261 from "../data/turmas/2026-1.json";
import {
  ALTURA_NO,
  LARGURA_NO,
  codigosOfertados,
  montarBoardObrigatorias,
  montarBoardTrilhas,
  type Board,
} from "../src/domain/motor/fluxograma";
import type { Matriz, OfertaSemestre } from "../src/domain/tipos";

const matriz = matrizJson as unknown as Matriz;
const matrizEngComp = matrizEngCompJson as unknown as Matriz;
const ofertas = [turmas20252, turmas20261] as unknown as OfertaSemestre[];
const abertos = codigosOfertados(ofertas);

/** Invariantes que valem para qualquer board desenhável. */
function conferirInvariantes(board: Board) {
  const porId = new Map(board.nos.map((n) => [n.id, n]));

  // ids únicos
  expect(porId.size).toBe(board.nos.length);

  for (const a of board.arestas) {
    const de = porId.get(a.de);
    const para = porId.get(a.para);
    // nenhuma aresta pode apontar para um nó que não é desenhado
    expect(de, `aresta ${a.id} sai de nó inexistente`).toBeDefined();
    expect(para, `aresta ${a.id} chega em nó inexistente`).toBeDefined();
    // o fluxo é sempre da esquerda para a direita: pré-requisito antes do dependente
    expect(de!.x, `aresta ${a.id} volta para trás`).toBeLessThan(para!.x);
  }

  // todo nó cabe dentro da tela calculada
  for (const n of board.nos) {
    expect(n.x + LARGURA_NO).toBeLessThanOrEqual(board.largura);
    expect(n.y + ALTURA_NO).toBeLessThanOrEqual(board.altura);
  }

  // nenhum par de nós se sobrepõe
  for (let i = 0; i < board.nos.length; i++) {
    for (let j = i + 1; j < board.nos.length; j++) {
      const a = board.nos[i];
      const b = board.nos[j];
      const colide =
        a.x < b.x + LARGURA_NO &&
        b.x < a.x + LARGURA_NO &&
        a.y < b.y + ALTURA_NO &&
        b.y < a.y + ALTURA_NO;
      expect(colide, `${a.id} sobrepõe ${b.id}`).toBe(false);
    }
  }
}

describe("board de obrigatórias", () => {
  const board = montarBoardObrigatorias(matriz);

  it("respeita as invariantes de desenho", () => {
    conferirInvariantes(board);
  });

  it("traz exatamente o roster oficial de obrigatórias e 2º estrato, sem o Enade", () => {
    const esperadas = matriz.disciplinas.filter(
      (d) => (d.conjunto === null && !d.codigo.startsWith("ENADE")) || d.conjunto === 1159,
    );
    expect(board.nos).toHaveLength(esperadas.length);
    expect(board.nos.some((n) => n.codigo.startsWith("ENADE"))).toBe(false);

    const codigos = new Set(board.nos.map((n) => n.codigo));
    for (const d of esperadas) expect(codigos.has(d.codigo)).toBe(true);
  });

  it("cria uma aresta para cada pré-requisito por código da matriz", () => {
    const esperadas = new Set<string>();
    for (const n of board.nos) {
      const d = matriz.disciplinas.find((x) => x.codigo === n.codigo)!;
      for (const p of d.prerequisitos) {
        if (/^Per[ií]odo:/i.test(p)) continue;
        if (board.nos.some((x) => x.codigo === p)) esperadas.add(`${p}->${n.codigo}`);
      }
    }
    expect(new Set(board.arestas.map((a) => a.id))).toEqual(esperadas);
  });

  it("guarda a exigência de período como atributo, não como aresta", () => {
    const estagio1 = board.nos.find((n) => n.codigo === "ICSX51");
    expect(estagio1?.exigePeriodo).toBe(4);
    expect(board.arestas.some((a) => a.para === "ICSX51")).toBe(false);
  });

  it("separa obrigatórias e 2º estrato em faixas que não se sobrepõem", () => {
    expect(board.faixas).toHaveLength(2);
    const [obr, est2] = board.faixas;
    expect(obr.y + obr.altura).toBeLessThanOrEqual(est2.y);

    for (const n of board.nos) {
      const faixa = n.grupo === "segundoEstrato" ? est2 : obr;
      expect(n.y, `${n.codigo} fora da faixa`).toBeGreaterThanOrEqual(faixa.y);
      expect(n.y + ALTURA_NO).toBeLessThanOrEqual(faixa.y + faixa.altura);
    }
  });
});

describe("board de obrigatórias — Eng. Comp.", () => {
  const board = montarBoardObrigatorias(matrizEngComp);

  it("não duplica obrigatórias como um 2º estrato inexistente", () => {
    const obrigatorias = matrizEngComp.disciplinas.filter(
      (d) => d.conjunto === null && !d.codigo.startsWith("ENADE"),
    );
    expect(board.nos).toHaveLength(obrigatorias.length);
    expect(board.faixas).toHaveLength(1);
    expect(board.faixas[0]?.rotulo).toBe("Obrigatórias");
    expect(board.nos.some((n) => n.grupo === "segundoEstrato")).toBe(false);
  });

  it("continua respeitando as invariantes de desenho", () => {
    conferirInvariantes(board);
  });
});

describe("board de trilhas", () => {
  const board = montarBoardTrilhas(matriz, abertos);

  it("respeita as invariantes de desenho", () => {
    conferirInvariantes(board);
  });

  it("só desenha disciplinas de trilha que abriram em 2025.2 ou 2026.1", () => {
    const reais = board.nos.filter((n) => !n.externo);
    expect(reais.length).toBeGreaterThan(0);
    for (const n of reais) {
      expect(abertos.has(n.codigo), `${n.codigo} não abriu em nenhum semestre conhecido`).toBe(true);
      const d = matriz.disciplinas.find((x) => x.codigo === n.codigo)!;
      expect(d.conjunto).toBeGreaterThanOrEqual(1162);
      expect(d.conjunto).toBeLessThanOrEqual(1173);
    }
  });

  it("não cria raia para trilha sem nenhuma oferta conhecida", () => {
    for (const faixa of board.faixas) {
      const daTrilha = matriz.disciplinas.filter(
        (d) => d.conjunto === Number(faixa.id) && abertos.has(d.codigo),
      );
      expect(daTrilha.length, `raia ${faixa.rotulo} está vazia`).toBeGreaterThan(0);
    }

    const trilhasComOferta = new Set(
      matriz.disciplinas
        .filter((d) => d.conjunto && d.conjunto >= 1162 && d.conjunto <= 1173 && abertos.has(d.codigo))
        .map((d) => String(d.conjunto)),
    );
    expect(new Set(board.faixas.map((f) => f.id))).toEqual(trilhasComOferta);
  });

  it("materializa como nó fantasma todo pré-requisito de fora da trilha", () => {
    for (const faixa of board.faixas) {
      const trilha = Number(faixa.id);
      const daTrilha = matriz.disciplinas.filter(
        (d) => d.conjunto === trilha && abertos.has(d.codigo),
      );
      const internos = new Set(daTrilha.map((d) => d.codigo));

      for (const d of daTrilha) {
        for (const p of d.prerequisitos) {
          if (/^Per[ií]odo:/i.test(p)) continue;
          if (!matriz.disciplinas.some((x) => x.codigo === p)) continue;
          const no = board.nos.find((n) => n.id === `${trilha}:${p}`);
          expect(no, `${p} (pré-req de ${d.codigo}) não foi desenhado na trilha ${trilha}`).toBeDefined();
          expect(no!.externo).toBe(!internos.has(p));
        }
      }
    }
  });

  it("mantém cada raia num intervalo vertical próprio", () => {
    const ordenadas = [...board.faixas].sort((a, b) => a.y - b.y);
    for (let i = 1; i < ordenadas.length; i++) {
      expect(ordenadas[i - 1].y + ordenadas[i - 1].altura).toBeLessThanOrEqual(ordenadas[i].y);
    }
    for (const n of board.nos) {
      const faixa = board.faixas.find((f) => n.y >= f.y && n.y + ALTURA_NO <= f.y + f.altura);
      expect(faixa, `${n.id} não está contido em nenhuma raia`).toBeDefined();
    }
  });
});
