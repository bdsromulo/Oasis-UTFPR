import { describe, expect, it } from "vitest";
import matrizJson from "../data/eng-comp/matriz-844.json";
import ofertaJson from "../data/eng-comp/turmas/2026-1.json";
import ofertaEng20262 from "../data/eng-comp/turmas/2026-2.json";
import ofertaBsi20262 from "../data/turmas/2026-2.json";
import { ENG_COMP_844, contaNoBlocoOptativo, ehTrilha } from "../src/domain/cursos";
import { dadosDoCursoPorMatriz } from "../src/domain/dadosCurso";
import { listarElegiveis } from "../src/domain/motor/elegiveis";
import { calcularResumoProgressoGrade } from "../src/domain/motor/progressoGrade";
import { simularFormatura } from "../src/domain/motor/simuladorFormatura";
import { montarPainel } from "../src/domain/motor/situacao";
import type {
  Matriz,
  OfertaSemestre,
  PerfilAluno,
  ResumoConjunto,
} from "../src/domain/tipos";

const matriz = matrizJson as unknown as Matriz;
const oferta = ofertaJson as unknown as OfertaSemestre;

function conjunto(
  codigo: string,
  nome: string,
  exigido: number,
  cumprido: number,
): ResumoConjunto {
  return {
    conjunto: codigo,
    nome,
    chObrigatoria: exigido,
    chCursadaAprovada: cumprido,
    chFaltante: Math.max(0, exigido - cumprido),
    chValidada: cumprido >= exigido ? exigido : 0,
  };
}

function perfilEngComp(): PerfilAluno {
  return {
    nome: "ALUNO FICTÍCIO",
    matricula: "0000000",
    curso: "ENGENHARIA DE COMPUTAÇÃO",
    matriz: 844,
    periodo: 8,
    coefAbsoluto: 0.8,
    coefNormalizado: 0.75,
    ingresso: "2022/1",
    cursadas: [],
    aprovadas: new Set<string>(),
    matriculadas: [],
    obrigatoriasFaltantes: [],
    dependencias: [],
    resumoConjuntos: [
      conjunto("959", "Optativas", 270, 225),
      conjunto("960", "Trilha Em Controle", 90, 90),
      conjunto("961", "Trilha Em Processamento Gráfico", 90, 90),
      conjunto("973", "Optativas Isoladas", 90, 45),
    ],
    eletivas: {
      chCursadaAprovada: 30,
      chFaltante: 60,
      chValidada: 30,
      chTotal: 90,
    },
    extensao: null,
    resumoGeral: {
      obrigatorias: { total: 3460, aprovada: 3000, faltante: 460 },
      optativas: { total: 270, aprovada: 225, faltante: 45 },
      eletivas: { total: 90, aprovada: 30, faltante: 60 },
    },
    avisos: [],
  };
}

describe("regressão Eng. Comp. — oferta e progressão optativa", () => {
  it("trata a oferta externa pela ligação com a matriz, não pelo curso da oferta", () => {
    const elegiveis = listarElegiveis(null, matriz, oferta);
    const isolada = elegiveis.find((e) => e.disciplina.codigo === "CSG42");

    expect(isolada?.oferta?.codigo).toBe("ICSG42");
    expect(isolada?.categoria).toContain("Optativas Isoladas");
    expect(contaNoBlocoOptativo(ENG_COMP_844, isolada?.disciplina.conjunto ?? null)).toBe(true);
    expect(ehTrilha(ENG_COMP_844, isolada?.disciplina.conjunto ?? null)).toBe(false);
  });

  it("soma isoladas nas 270h sem transformá-las em terceira trilha", () => {
    const painel = montarPainel(perfilEngComp(), matriz);

    expect(painel.blocoOptativo).toEqual({ exigido: 270, cumprido: 225 });
    expect(painel.trilhasValidadas).toBe(2);
    expect(painel.trilhas.some((t) => t.conjunto === "973")).toBe(false);
  });

  it("separa horas aprovadas de horas validadas enquanto falta a segunda trilha", () => {
    const perfil = perfilEngComp();
    perfil.resumoConjuntos = [
      conjunto("959", "Optativas", 270, 180),
      conjunto("961", "Trilha Em Processamento Gráfico", 90, 60),
      conjunto("963", "Trilha Em Algoritmos E Complexidade", 90, 120),
    ];
    perfil.resumoGeral!.optativas = {
      total: 270,
      cursada: 180,
      aprovada: 90,
      faltante: 180,
      aprovadaTotal: 180,
    };

    const painel = montarPainel(perfil, matriz);
    expect(painel.blocoOptativo).toEqual({
      exigido: 270,
      cumprido: 180,
      validado: 90,
    });
    expect(painel.trilhasValidadas).toBe(1);

    const progresso = calcularResumoProgressoGrade([], perfil, matriz);
    expect(progresso.find((item) => item.categoriaId === "trilhas_geral")).toMatchObject({
      exigido: 270,
      cumpridoBase: 180,
    });

    const simulacao = simularFormatura(perfil, matriz, [oferta], {
      ritmo: 5,
      semestreInicial: "2026-1",
      horizonte: 1,
    });
    expect(simulacao.requisitos.find((item) => item.id === "trilhas")).toMatchObject({
      exigido: 270,
      cumprido: 180,
      faltante: 90,
    });
  });

  it("atribui uma isolada ao bloco optativo no impacto da grade", () => {
    const isolada = matriz.disciplinas.find((d) => d.codigo === "CSG42")!;
    const resumos = calcularResumoProgressoGrade(
      [{ disciplina: isolada } as never],
      perfilEngComp(),
      matriz,
    );

    expect(resumos.find((r) => r.categoriaId === "trilhas_geral")).toMatchObject({
      exigido: 270,
      cumpridoBase: 225,
      impulsoGrade: isolada.horas.total,
    });
    expect(resumos.find((r) => r.categoriaId === "973")?.categoriaNome).toContain(
      "Optativas Isoladas",
    );
    expect(resumos.find((r) => r.categoriaId === "eletivas")?.impulsoGrade).toBe(0);
  });

  it("parametriza o simulador para duas trilhas e remove estratos inexistentes", () => {
    const resultado = simularFormatura(perfilEngComp(), matriz, [oferta], {
      ritmo: 5,
      semestreInicial: "2026-1",
      horizonte: 1,
    });

    expect(resultado.trilhasExigidas).toBe(2);
    expect(resultado.requisitos.map((r) => r.id)).toEqual([
      "obrigatorias",
      "trilhas",
      "eletivas",
    ]);
  });

  it("seleciona o curso automaticamente pela matriz do histórico", () => {
    expect(dadosDoCursoPorMatriz(844)?.id).toBe("eng-comp");
    expect(dadosDoCursoPorMatriz(981)?.id).toBe("bsi-981");
  });

  it("a oferta 2026-2 de Eng. Comp. é de Eng. Comp. — não se apoia no material de BSI", () => {
    const eng = ofertaEng20262 as unknown as OfertaSemestre;
    const bsi = ofertaBsi20262 as unknown as OfertaSemestre;

    // rótulo e semestre corretos, sem herdar o de BSI
    expect(eng.curso).toBe("ENG DE COMPUTAÇÃO");
    expect(eng.semestre).toBe("2026-2");
    expect(bsi.curso).toBe("SIST DE INFORMAÇÃO");

    // é um documento distinto do de BSI: traz disciplinas próprias de
    // Engenharia (elétrica/eletrônica/física) que não existem na oferta de BSI
    const codsBsi = new Set(bsi.disciplinas.map((d) => d.codigo));
    const exclusivasEng = eng.disciplinas.filter((d) => !codsBsi.has(d.codigo));
    expect(exclusivasEng.length).toBeGreaterThan(50);
    for (const cod of ["ELEB30", "ELEW30", "ELEQ30", "FIS7F1"]) {
      expect(eng.disciplinas.some((d) => d.codigo === cod), `${cod} ausente na oferta Eng. Comp.`).toBe(true);
      expect(codsBsi.has(cod), `${cod} não deveria estar na oferta BSI`).toBe(false);
    }

    // e casa a matriz 844 pelos equivalentes característicos de Eng. Comp.
    const elegiveis = listarElegiveis(null, matriz, eng);
    for (const [codigoMatriz, codigoOferta] of [
      ["CSW30", "ELEW30"],
      ["EEB31", "ELEB30"],
    ] as const) {
      const e = elegiveis.find((x) => x.disciplina.codigo === codigoMatriz);
      expect(e?.oferta?.codigo, `${codigoMatriz} deveria puxar ${codigoOferta} em 2026-2`).toBe(codigoOferta);
    }
  });
});
