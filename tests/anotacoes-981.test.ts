// A matriz 981 servida à aplicação é o parse do PDF oficial MAIS a camada
// curada em data/anotacoes-981.json. Estes testes existem para que a curadoria
// não volte a sumir sem ninguém perceber: antes de ela virar arquivo próprio,
// as 13 disciplinas e as 7 equivalências eram edições à mão dentro do JSON, e
// um `parse_matriz.py` apagava tudo em silêncio.
import { describe, expect, it } from "vitest";
import matriz981 from "../data/matriz-981.json";
import anotacoes from "../data/anotacoes-981.json";

const M = matriz981 as any;
const A = anotacoes as any;
const porCodigo = new Map<string, any>(M.disciplinas.map((d: any) => [d.codigo, d]));

describe("camada de anotação da matriz 981", () => {
  it("é da própria matriz e não está vazia", () => {
    expect(A.matriz).toBe(M.matriz);
    expect(A.disciplinas.length).toBe(13);
    expect(Object.keys(A.equivalentes).length).toBe(7);
  });

  it("toda disciplina anotada está na matriz servida, com o mesmo conteúdo", () => {
    for (const anotada of A.disciplinas) {
      const naMatriz = porCodigo.get(anotada.codigo);
      expect(naMatriz, `${anotada.codigo} sumiu da matriz`).toBeDefined();
      // "apos" é instrução de posicionamento e não pode vazar para o dado
      const { apos, ...esperado } = anotada;
      expect(naMatriz).toEqual(esperado);
      expect(naMatriz.apos).toBeUndefined();
    }
  });

  it("a âncora de posição continua existindo e é respeitada", () => {
    const ordem = M.disciplinas.map((d: any) => d.codigo);
    for (const anotada of A.disciplinas) {
      if (!anotada.apos) continue;
      const iAncora = ordem.indexOf(anotada.apos);
      expect(iAncora, `âncora ${anotada.apos} não existe`).toBeGreaterThanOrEqual(0);
      expect(ordem.indexOf(anotada.codigo)).toBe(iAncora + 1);
    }
  });

  it("toda equivalência anotada está aplicada na matriz servida", () => {
    for (const [codigo, extras] of Object.entries<any[]>(A.equivalentes)) {
      const d = porCodigo.get(codigo);
      expect(d, `${codigo} não existe na matriz`).toBeDefined();
      for (const extra of extras) {
        expect(
          d.equivalentes.some((e: any) => e.codigo === extra.codigo),
          `${codigo} perdeu a equivalência anotada ${extra.codigo}`,
        ).toBe(true);
      }
    }
  });

  it("o conjunto e o cabeçalho anotados estão na matriz servida", () => {
    for (const [chave, conjunto] of Object.entries(A.conjuntos)) {
      expect(M.conjuntos[chave], `conjunto ${chave} sumiu`).toEqual(conjunto);
    }
    for (const [campo, valor] of Object.entries(A.cabecalho)) {
      expect(M[campo], `cabeçalho ${campo}`).toEqual(valor);
    }
  });

  it("a anotação não duplica nada que já venha do PDF", () => {
    // cada código anotado aparece uma única vez na matriz final
    for (const anotada of A.disciplinas) {
      const ocorrencias = M.disciplinas.filter((d: any) => d.codigo === anotada.codigo);
      expect(ocorrencias.length, `${anotada.codigo} duplicada`).toBe(1);
    }
    for (const [codigo, extras] of Object.entries<any[]>(A.equivalentes)) {
      const lista = porCodigo.get(codigo).equivalentes.map((e: any) => e.codigo);
      for (const extra of extras) {
        expect(lista.filter((c: string) => c === extra.codigo).length).toBe(1);
      }
    }
  });
});
