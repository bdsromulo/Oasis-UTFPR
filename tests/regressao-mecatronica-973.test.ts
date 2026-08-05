import { describe, expect, it } from "vitest";
import matriz973Json from "../data/eng-mecatronica/matriz-973.json";
import {
  ENG_MECATRONICA_973,
  categoriaSimples,
  ehGrupoOpcao,
  ehTrilha,
  grupoOpcaoDe,
  trilhasDaMatriz,
} from "../src/domain/cursos";
import { dadosDoCursoPorMatriz } from "../src/domain/dadosCurso";
import type { Matriz } from "../src/domain/tipos";
import { rotulosClassificacaoCatalogo } from "../src/ui/telas/Catalogo";

const matriz = matriz973Json as unknown as Matriz;

describe("matriz 973 — integridade da importação de apoio", () => {
  it("preserva identidade, quantidades e cargas declaradas", () => {
    expect(matriz).toMatchObject({ matriz: 973, campus: "Curitiba" });
    expect(matriz.disciplinas).toHaveLength(206);
    expect(matriz.cargas).toMatchObject({
      obrigatorias: 3435,
      optativas: 360,
      extensao: 420,
      eletiva: 0,
      ch_total_ppc: 3795,
    });
    expect(
      matriz.disciplinas
        .filter((disciplina) => disciplina.conjunto === null)
        .reduce((total, disciplina) => total + disciplina.horas.total, 0),
    ).toBe(3435);
  });

  it("não deixa código, conjunto ou pré-requisito órfão", () => {
    const codigos = new Set(matriz.disciplinas.map((disciplina) => disciplina.codigo));
    expect(codigos.size).toBe(matriz.disciplinas.length);
    for (const disciplina of matriz.disciplinas) {
      if (disciplina.conjunto !== null) {
        expect(matriz.conjuntos[String(disciplina.conjunto)], disciplina.codigo).toBeDefined();
      }
      for (const requisito of disciplina.prerequisitos) {
        if (!requisito.startsWith("Período:")) {
          expect(codigos.has(requisito), `${disciplina.codigo} → ${requisito}`).toBe(true);
        }
      }
    }
  });

  it("preserva estágio, TCC e as três pools curriculares", () => {
    expect(matriz.disciplinas.find((disciplina) => disciplina.codigo === "ELN70B")).toMatchObject({
      modelo: "Estágio",
      periodo: 6,
      horas: { total: 360 },
    });
    expect(matriz.disciplinas.find((disciplina) => disciplina.codigo === "ELN70A")).toMatchObject({
      modelo: "TCC",
      periodo: 10,
      horas: { total: 15 },
    });
    expect(matriz.disciplinas.filter((disciplina) => disciplina.conjunto === 1120)).toHaveLength(30);
    expect(matriz.disciplinas.filter((disciplina) => disciplina.conjunto === 1121)).toHaveLength(21);
    expect(matriz.disciplinas.filter((disciplina) => [1135, 1222].includes(disciplina.conjunto ?? -1))).toHaveLength(50);
  });
});

describe("descritor e interface da matriz 973", () => {
  it("liga a matriz ao curso sem inventar uma oferta de outro curso", () => {
    const curso = dadosDoCursoPorMatriz(973);
    expect(curso?.id).toBe("eng-mecatronica-973");
    expect(curso?.ofertas["2026-2"].disciplinas).toEqual([]);
    expect(curso?.ofertas["2026-2"].fonte).toContain("ainda não importada");
  });

  it("modela as duas trilhas formativas como exigências separadas de 120h", () => {
    expect(ENG_MECATRONICA_973.gruposOpcao).toEqual([1120, 1121]);
    expect(trilhasDaMatriz(matriz)).toEqual([]);
    expect(ehGrupoOpcao(ENG_MECATRONICA_973, 1120)).toBe(true);
    expect(ehGrupoOpcao(ENG_MECATRONICA_973, 1121)).toBe(true);
    expect(ehTrilha(ENG_MECATRONICA_973, 1120)).toBe(false);
    expect(ehTrilha(ENG_MECATRONICA_973, 1121)).toBe(false);
  });

  it("agrega as duas listas de Humanidades no Ciclo de 120h", () => {
    expect(grupoOpcaoDe(ENG_MECATRONICA_973, 1135)).toBeNull();
    expect(categoriaSimples(ENG_MECATRONICA_973, 1135)?.conjunto).toBe(1122);
    expect(categoriaSimples(ENG_MECATRONICA_973, 1222)?.conjunto).toBe(1122);
  });

  it("exibe categoria e nome da trilha nos cards do Catálogo", () => {
    const eletronica = matriz.disciplinas.find((disciplina) => disciplina.codigo === "ELE13")!;
    const mecanica = matriz.disciplinas.find((disciplina) => disciplina.codigo === "MEC78B")!;

    expect(rotulosClassificacaoCatalogo(matriz, eletronica, "opcoes")).toEqual({
      categoria: "Opção curricular",
      trilha: "Trilha Formativa em Eletrônica",
    });
    expect(rotulosClassificacaoCatalogo(matriz, mecanica, "opcoes")).toEqual({
      categoria: "Opção curricular",
      trilha: "Trilha Formativa em Mecânica",
    });
  });

  it("classifica a pool extensionista como extensão, não como trilha isolada", () => {
    const extensionista = matriz.disciplinas.find((disciplina) => disciplina.codigo === "ARQ7DH")!;
    expect(ehTrilha(ENG_MECATRONICA_973, extensionista.conjunto)).toBe(false);
    expect(rotulosClassificacaoCatalogo(matriz, extensionista, "extensao")).toEqual({
      categoria: "Extensão",
      trilha: null,
    });
  });
});
