import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matriz973Json from "../data/eng-mecatronica/matriz-973.json";
import oferta20262Json from "../data/eng-mecatronica/turmas/2026-2.json";
import oferta20261Json from "../data/eng-mecatronica/turmas/2026-1.json";
import oferta20252Json from "../data/eng-mecatronica/turmas/2025-2.json";
import {
  ENG_MECATRONICA_973,
  categoriaSimples,
  ehGrupoOpcao,
  ehTrilha,
  grupoOpcaoDe,
  trilhasDaMatriz,
} from "../src/domain/cursos";
import {
  carregarOfertasHistoricasMecatronica,
  dadosDoCursoPorMatriz,
} from "../src/domain/dadosCurso";
import { reviewsHabilitadasPara } from "../src/domain/reviews/config";
import { extrairLinhas } from "../src/domain/historico/extrair-linhas";
import { parseHistorico } from "../src/domain/historico/parser";
import type { Matriz, OfertaSemestre, PerfilAluno } from "../src/domain/tipos";
import { rotulosClassificacaoCatalogo } from "../src/ui/telas/Catalogo";

const matriz = matriz973Json as unknown as Matriz;
const ofertas = [oferta20262Json, oferta20261Json, oferta20252Json] as unknown as OfertaSemestre[];

describe("matriz 973 — integridade da fonte oficial", () => {
  it("preserva identidade, quantidades e cargas declaradas", () => {
    expect(matriz).toMatchObject({ matriz: 973, campus: "Curitiba" });
    expect(matriz.disciplinas).toHaveLength(208);
    expect(matriz.cargas).toMatchObject({
      obrigatorias: 3435,
      optativas: 300,
      extensao: 420,
      eletiva: 0,
      ch_total_ppc: 4155,
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
      modelo: "Trabalho De Conclusão",
      periodo: 10,
      horas: { total: 15 },
    });
    expect(matriz.disciplinas.filter((disciplina) => disciplina.conjunto === 1120)).toHaveLength(30);
    expect(matriz.disciplinas.filter((disciplina) => disciplina.conjunto === 1121)).toHaveLength(21);
    expect(matriz.disciplinas.filter((disciplina) => [1135, 1222].includes(disciplina.conjunto ?? -1))).toHaveLength(50);
  });
});

/** Auditoria opt-in: o histórico pessoal permanece fora do repositório. */
const PASTA_REFERENCIA =
  process.env.OASIS_MATERIAL_MECATRONICA_973 ?? "materiais-referencia/Eng-Mecatronica-973";
const HISTORICOS = existsSync(PASTA_REFERENCIA)
  ? readdirSync(PASTA_REFERENCIA)
      .filter((nome) => /^Histórico do Aluno.*\.pdf$/i.test(nome))
      .map((nome) => join(PASTA_REFERENCIA, nome))
  : [];

describe.skipIf(HISTORICOS.length === 0)("histórico real da matriz 973", () => {
  it("reconhece a matriz e extrai componentes sem guardar o PDF", async () => {
    const perfis: PerfilAluno[] = [];
    for (const caminho of HISTORICOS) {
      const arquivo = readFileSync(caminho);
      const linhas = await extrairLinhas(
        arquivo.buffer.slice(arquivo.byteOffset, arquivo.byteOffset + arquivo.byteLength) as ArrayBuffer,
      );
      const perfil = parseHistorico(linhas.map((linha) => linha.texto));
      if (perfil.matriz === 973 && perfil.cursadas.length > 0) perfis.push(perfil);
    }
    expect(perfis.length).toBeGreaterThan(0);
    expect(perfis[0].matriz).toBe(973);
    expect(perfis[0].cursadas.length).toBeGreaterThan(0);
  });
});

describe("descritor e interface da matriz 973", () => {
  it("liga a matriz às três ofertas próprias e habilita as avaliações", async () => {
    const curso = dadosDoCursoPorMatriz(973);
    expect(curso?.id).toBe("eng-mecatronica-973");
    expect(Object.keys(curso?.ofertas ?? {})).toEqual(["2026-2"]);
    await carregarOfertasHistoricasMecatronica();
    expect(Object.keys(curso?.ofertas ?? {})).toEqual(["2026-2", "2026-1", "2025-2"]);
    expect(curso?.semestresPreMatricula).toEqual(["2026-2"]);
    expect(ofertas.map((oferta) => oferta.curso)).toEqual([
      "ENG MECATRÔNICA",
      "ENG MECATRÔNICA",
      "ENG MECATRÔNICA",
    ]);
    expect(reviewsHabilitadasPara(973)).toBe(true);
  });

  it("modela as duas trilhas formativas como exigências separadas de 120h", () => {
    expect(ENG_MECATRONICA_973.gruposOpcao).toEqual([1120, 1121]);
    expect(trilhasDaMatriz(matriz)).toEqual([]);
    expect(ehGrupoOpcao(ENG_MECATRONICA_973, 1120)).toBe(true);
    expect(ehGrupoOpcao(ENG_MECATRONICA_973, 1121)).toBe(true);
    expect(ehTrilha(ENG_MECATRONICA_973, 1120)).toBe(false);
    expect(ehTrilha(ENG_MECATRONICA_973, 1121)).toBe(false);
  });

  it("agrega as duas listas de Humanidades no Ciclo oficial de 60h", () => {
    expect(matriz.conjuntos["1122"].ch).toBe(60);
    expect(grupoOpcaoDe(ENG_MECATRONICA_973, 1135)).toBeNull();
    expect(categoriaSimples(ENG_MECATRONICA_973, 1135)?.conjunto).toBe(1122);
    expect(categoriaSimples(ENG_MECATRONICA_973, 1222)?.conjunto).toBe(1122);
  });

  it("preserva as contagens auditadas das três ofertas", () => {
    const contagens = ofertas.map((oferta) => ({
      semestre: oferta.semestre,
      disciplinas: oferta.disciplinas.length,
      turmas: oferta.disciplinas.reduce((total, disciplina) => total + disciplina.turmas.length, 0),
      horarios: oferta.disciplinas.reduce(
        (total, disciplina) =>
          total + disciplina.turmas.reduce((subtotal, turma) => subtotal + turma.horarios.length, 0),
        0,
      ),
    }));
    expect(contagens).toEqual([
      { semestre: "2026-2", disciplinas: 176, turmas: 440, horarios: 1523 },
      { semestre: "2026-1", disciplinas: 180, turmas: 449, horarios: 1541 },
      { semestre: "2025-2", disciplinas: 172, turmas: 440, horarios: 1498 },
    ]);
  });

  it("preserva ME79B S01 sem inventar os horários ausentes na fonte", () => {
    const me79b = ofertas[0].disciplinas.find((disciplina) => disciplina.codigo === "ME79B")!;
    expect(me79b.turmas.find((turma) => turma.codigo === "S01")?.horarios).toEqual([]);
  });

  it("exibe categoria e nome da trilha nos cards do Catálogo", () => {
    const eletronica = matriz.disciplinas.find((disciplina) => disciplina.codigo === "ELE13")!;
    const mecanica = matriz.disciplinas.find((disciplina) => disciplina.codigo === "MEC78B")!;

    expect(rotulosClassificacaoCatalogo(matriz, eletronica, "opcoes")).toEqual({
      categoria: "Opção curricular",
      trilha: "Trilha Formativa Em Eletrônica",
    });
    expect(rotulosClassificacaoCatalogo(matriz, mecanica, "opcoes")).toEqual({
      categoria: "Opção curricular",
      trilha: "Trilha Formativa Em Mecânica",
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
