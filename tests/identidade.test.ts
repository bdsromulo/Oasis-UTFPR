import { describe, expect, it } from "vitest";
import { criarMapaIdentidade } from "../src/domain/motor/identidade";
import type { Matriz } from "../src/domain/tipos";

describe("Identidade Resolver", () => {
  const matrizMock: Matriz = {
    matriz: 999,
    curso: "Teste",
    campus: "Curitiba",
    cargas: {
      obrigatorias: 100,
      optativas: 0,
      extensao: 0,
      eletiva: 0,
      soma: 100,
      soma_sem_ext: 100,
      chext_disc_obrigatorias: 0,
      chext_disc_optativas: 0,
      ch_total_ppc: 100
    },
    conjuntos: {},
    eletiva: { ch: 0, periodo_inicial: 1, periodo_final: 8, prereq_periodo: 0 },
    disciplinas: [
      {
        codigo: "COD10",
        nome: "Disciplina Base",
        periodo: 1,
        conjunto: null,
        modelo: "V",
        aulas_semanais: { teoricas: 2, praticas: 0, total: 2, aps: 0, apcc: 0 },
        horas: { ad: 30, chext: 0, chead: 0, total: 30 },
        prerequisitos: [],
        equivalentes: [
          { codigo: "EQV10", cht: null, grupo: null },
          { codigo: "OLD10", cht: null, grupo: null }
        ]
      },
      {
        codigo: "COD20",
        nome: "Outra Disciplina",
        periodo: 2,
        conjunto: null,
        modelo: "V",
        aulas_semanais: { teoricas: 2, praticas: 0, total: 2, aps: 0, apcc: 0 },
        horas: { ad: 30, chext: 0, chead: 0, total: 30 },
        prerequisitos: [],
        equivalentes: []
      }
    ]
  };

  const mapa = criarMapaIdentidade(matrizMock);

  it("resolver() retorna o próprio código se for da matriz", () => {
    expect(mapa.resolver("COD10")).toBe("COD10");
    expect(mapa.resolver("COD20")).toBe("COD20");
  });

  it("resolver() mapeia códigos equivalentes declarados de volta para a matriz", () => {
    expect(mapa.resolver("EQV10")).toBe("COD10");
    expect(mapa.resolver("OLD10")).toBe("COD10");
  });

  it("resolver() retorna o código original se for totalmente desconhecido", () => {
    expect(mapa.resolver("SOLTO99")).toBe("SOLTO99");
  });

  it("resolverPorNome() encontra o código canônico a partir de uma equivalência de nome exato", () => {
    expect(mapa.resolverPorNome("disciplina base")).toBe("COD10");
    expect(mapa.resolverPorNome(" Outra   Disciplina ")).toBe("COD20");
  });

  it("resolverPorNome() lida com remoção de acentos corretamente", () => {
    expect(mapa.resolverPorNome("díscípliná básè")).toBe("COD10");
  });

  it("equivalentesDe() retorna os equivalentes conhecidos, incluindo o próprio código", () => {
    const eqvs = mapa.equivalentesDe("COD10");
    expect(eqvs).toContain("COD10");
    expect(eqvs).toContain("EQV10");
    expect(eqvs).toContain("OLD10");
    expect(eqvs.length).toBe(3);
  });

  it("equivalentesDe() retorna apenas o próprio código se não tiver equivalentes", () => {
    const eqvs = mapa.equivalentesDe("COD20");
    expect(eqvs).toEqual(["COD20"]);
  });

  it("mesmaExigencia() retorna true para códigos da mesma panela de equivalência", () => {
    expect(mapa.mesmaExigencia("COD10", "EQV10")).toBe(true);
    expect(mapa.mesmaExigencia("OLD10", "EQV10")).toBe(true);
    expect(mapa.mesmaExigencia("COD10", "COD10")).toBe(true);
  });

  it("mesmaExigencia() retorna false para códigos não relacionados", () => {
    expect(mapa.mesmaExigencia("COD10", "COD20")).toBe(false);
    expect(mapa.mesmaExigencia("EQV10", "COD20")).toBe(false);
  });

  it("mesmaExigencia() retorna false para disciplinas totalmente desconhecidas", () => {
    expect(mapa.mesmaExigencia("XYZ", "XYZ")).toBe(false);
  });
});
