import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matriz823Json from "../data/eng-mecatronica/matriz-823.json";
import oferta20262Json from "../data/eng-mecatronica/turmas/2026-2.json";
import {
  ENG_MECATRONICA_823 as DESCRICAO_823,
  categoriaSimples,
  ehTrilha,
  exigeExtensao,
  trilhasDaMatriz,
} from "../src/domain/cursos";
import {
  carregarOfertasHistoricasMecatronica,
  dadosDoCursoPorMatriz,
} from "../src/domain/dadosCurso";
import { extrairLinhas } from "../src/domain/historico/extrair-linhas";
import { parseHistorico } from "../src/domain/historico/parser";
import { listarElegiveis, cumpre } from "../src/domain/motor/elegiveis";
import { criarMapaIdentidade } from "../src/domain/motor/identidade";
import { montarPainel } from "../src/domain/motor/situacao";
import { reviewsHabilitadasPara } from "../src/domain/reviews/config";
import type { Matriz, OfertaSemestre, PerfilAluno } from "../src/domain/tipos";
import { rotulosClassificacaoCatalogo } from "../src/ui/telas/Catalogo";

const matriz = matriz823Json as unknown as Matriz;
const oferta20262 = oferta20262Json as unknown as OfertaSemestre;
const mapa = criarMapaIdentidade(matriz);

describe("matriz 823 — integridade da fonte oficial", () => {
  it("preserva identidade, quantidades e cargas declaradas", () => {
    expect(matriz).toMatchObject({ matriz: 823, campus: "Curitiba" });
    expect(matriz.disciplinas).toHaveLength(89);
    expect(matriz.cargas).toMatchObject({
      obrigatorias: 4066,
      optativas: 90,
      extensao: 0,
      eletiva: 240,
      ch_total_ppc: 4396,
    });
    expect(
      matriz.disciplinas
        .filter((disciplina) => disciplina.conjunto === null)
        .reduce((total, disciplina) => total + disciplina.horas.total, 0),
    ).toBe(4066);
  });

  it("modela Humanidades como categoria única, sem inventar trilhas", () => {
    expect(Object.keys(matriz.conjuntos)).toEqual(["932"]);
    expect(matriz.conjuntos["932"]).toMatchObject({
      nome: "Ciências Humanas, Sociais E Cidadania",
      ch: 90,
      periodo_inicial: 2,
      periodo_final: 3,
    });
    expect(matriz.disciplinas.filter((disciplina) => disciplina.conjunto === 932)).toHaveLength(21);
    expect(categoriaSimples(DESCRICAO_823, 932)?.id).toBe("humanidades");
    expect(trilhasDaMatriz(matriz)).toEqual([]);
    expect(ehTrilha(DESCRICAO_823, 932)).toBe(false);
    expect(exigeExtensao(matriz)).toBe(false);
  });

  it("preserva os componentes especiais e as 264 equivalências", () => {
    expect(matriz.disciplinas.find((disciplina) => disciplina.codigo === "EL70A")).toMatchObject({
      modelo: "Atividades Complementares",
      periodo: 2,
      horas: { total: 180 },
    });
    expect(matriz.disciplinas.find((disciplina) => disciplina.codigo === "EL70B")).toMatchObject({
      modelo: "Estágio",
      periodo: 7,
      horas: { total: 400 },
    });
    expect(matriz.disciplinas.find((disciplina) => disciplina.codigo === "EL70D")).toMatchObject({
      modelo: "Trabalho De Conclusão",
      periodo: 10,
      horas: { total: 60 },
    });
    expect(
      matriz.disciplinas.reduce(
        (total, disciplina) => total + disciplina.equivalentes.length,
        0,
      ),
    ).toBe(264);
  });
});

describe("ofertas e interface da matriz 823", () => {
  it("usa as mesmas três ofertas da Mecatrônica 973", async () => {
    const curso823 = dadosDoCursoPorMatriz(823)!;
    const curso973 = dadosDoCursoPorMatriz(973)!;
    expect(curso823.id).toBe("eng-mecatronica-823");

    await carregarOfertasHistoricasMecatronica();
    expect(Object.keys(curso823.ofertas)).toEqual(["2026-2", "2026-1", "2025-2"]);
    for (const semestre of ["2026-2", "2026-1", "2025-2"]) {
      expect(curso823.ofertas[semestre]).toBe(curso973.ofertas[semestre]);
    }
    expect(curso823.semestresPreMatricula).toEqual(["2026-2"]);
    expect(reviewsHabilitadasPara(823)).toBe(true);
  });

  it("casa a oferta atual com a identidade antiga pelas equivalências", () => {
    const elegiveis = listarElegiveis(null, matriz, oferta20262);
    const controle1 = elegiveis.find((item) => item.disciplina.codigo === "EL76A");
    expect(controle1?.oferta?.codigo).toBe("ELEC20");
    expect(mapa.resolver("ELEC20")).toBe("EL76A");
    expect(controle1?.categoria).toBe("obrigatória");
  });

  it("exibe o conjunto 932 como Humanidades no Catálogo", () => {
    const humana = matriz.disciplinas.find((disciplina) => disciplina.codigo === "FCH7FC")!;
    expect(rotulosClassificacaoCatalogo(matriz, humana, "humanidades")).toEqual({
      categoria: "Humanidades",
      trilha: null,
    });
  });
});

/** Auditoria opt-in: o histórico pessoal permanece fora do repositório. */
const PASTA_REFERENCIA =
  process.env.OASIS_MATERIAL_MECATRONICA_823 ?? "materiais-referencia/Eng-Mecatronica-823";
const HISTORICOS = existsSync(PASTA_REFERENCIA)
  ? readdirSync(PASTA_REFERENCIA)
      .filter((nome) => /^Histórico do Aluno.*\.pdf$/i.test(nome))
      .map((nome) => join(PASTA_REFERENCIA, nome))
  : [];

async function carregarHistorico(caminho: string): Promise<PerfilAluno> {
  const arquivo = readFileSync(caminho);
  const linhas = await extrairLinhas(
    arquivo.buffer.slice(arquivo.byteOffset, arquivo.byteOffset + arquivo.byteLength) as ArrayBuffer,
  );
  return parseHistorico(linhas.map((linha) => linha.texto));
}

describe.skipIf(HISTORICOS.length === 0)("histórico real da matriz 823", () => {
  it("fecha disciplinas, equivalências e resumos com o documento oficial", async () => {
    const perfis = await Promise.all(HISTORICOS.map(carregarHistorico));
    const perfil = perfis.find((item) => item.matriz === 823)!;

    expect(perfil).toBeDefined();
    expect(perfil.cursadas.length).toBeGreaterThan(40);
    expect(perfil.avisos, perfil.avisos.join("; ")).toEqual([]);
    expect(perfil.resumoGeral).toEqual({
      obrigatorias: expect.objectContaining({ total: 4066, aprovada: 2790, faltante: 1276 }),
      optativas: expect.objectContaining({ total: 90, aprovada: 90, faltante: 0 }),
      eletivas: expect.objectContaining({ total: 240, aprovada: 60, faltante: 180 }),
    });
    expect(perfil.resumoConjuntos.find((resumo) => resumo.conjunto === "932")).toMatchObject({
      chObrigatoria: 90,
      chCursadaAprovada: 90,
      chFaltante: 0,
      chValidada: 90,
    });

    const controle1 = perfil.cursadas.find(
      (disciplina) => disciplina.codigo === "EL76A" && disciplina.situacao === "consignado",
    );
    expect(controle1).toMatchObject({ codigoOriginal: "ELN77A", cht: 60 });

    const faltantes = new Set(perfil.obrigatoriasFaltantes.map((disciplina) => disciplina.codigo));
    const problemas: string[] = [];
    for (const disciplina of matriz.disciplinas) {
      if (disciplina.conjunto !== null || disciplina.codigo.startsWith("ENADE")) continue;
      const concluida = cumpre(disciplina.codigo, perfil, mapa);
      if (concluida === faltantes.has(disciplina.codigo)) {
        problemas.push(
          `${disciplina.codigo}: concluída=${concluida} faltante=${faltantes.has(disciplina.codigo)}`,
        );
      }
    }
    expect(problemas, problemas.join("; ")).toEqual([]);
    expect(montarPainel(perfil, matriz).inconsistencias).toEqual([]);

    await carregarOfertasHistoricasMecatronica();
    const curso = dadosDoCursoPorMatriz(823)!;
    for (const oferta of Object.values(curso.ofertas)) {
      const concluidasOfertadas = listarElegiveis(perfil, matriz, oferta)
        .filter((item) => cumpre(item.disciplina.codigo, perfil, mapa))
        .map((item) => item.disciplina.codigo);
      expect(concluidasOfertadas, `${oferta.semestre}: ${concluidasOfertadas.join(",")}`).toEqual([]);
    }
  });
});
