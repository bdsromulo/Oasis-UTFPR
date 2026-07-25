import { describe, expect, it } from "vitest";
import matriz962Json from "../data/eng-comp/matriz-962.json";
import oferta20262 from "../data/eng-comp/turmas/2026-2.json";
import { ENG_COMP_962, cargaAprovadaBlocoOptativo } from "../src/domain/cursos";
import { montarPainel } from "../src/domain/motor/situacao";
import { calcularResumoProgressoGrade } from "../src/domain/motor/progressoGrade";
import { simularFormatura } from "../src/domain/motor/simuladorFormatura";
import type { Matriz, OfertaSemestre, PerfilAluno, ResumoConjunto } from "../src/domain/tipos";

/**
 * Rede de proteção da matriz 962, escrita a partir da auditoria de dois
 * históricos reais (não versionados: são dado pessoal).
 *
 * A 962 tem TRÊS blocos optativos independentes — Ciclo de Humanidades (1080,
 * 120h), Opção de Expressão Gráfica (1079, 30h) e Optativas Profissionalizantes
 * (1081, 270h) — somando as 420h que o Quadro Resumo declara na linha única
 * "Optativas". Os dois desvios que estes testes fixam apareceram exatamente aí:
 *   1. as horas de humanidades e de expressão gráfica eram creditadas ao bloco
 *      de 270h das profissionalizantes;
 *   2. o curso ganhava uma exigência de 120h de eletivas que o PPC não pede
 *      (a matriz declara `cargas.eletiva: 0`).
 *
 * O perfil abaixo é sintético, mas reproduz o padrão observado nos dois
 * históricos: humanidades 90/120, expressão gráfica 30/30 e nada nas trilhas.
 */

const matriz = matriz962Json as unknown as Matriz;
const oferta = oferta20262 as unknown as OfertaSemestre;

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

function perfil962(): PerfilAluno {
  return {
    nome: "ALUNO FICTÍCIO",
    matricula: "0000000",
    curso: "ENG DE COMPUTAÇÃO",
    matriz: 962,
    periodo: 6,
    coefAbsoluto: 0.82,
    coefNormalizado: 0.58,
    ingresso: "2023/1",
    cursadas: [],
    aprovadas: new Set<string>(),
    matriculadas: [],
    obrigatoriasFaltantes: [],
    dependencias: [],
    resumoConjuntos: [
      conjunto("1080", "Optativas Do Ciclo De Humanidades", 120, 90),
      conjunto("1079", "Opção De Expressão Gráfica", 30, 30),
      conjunto("1081", "Optativas Profissionalizantes", 270, 0),
      conjunto("1096", "Optativas Isoladas", 90, 0),
      conjunto("1082", "Trilha Em Algoritmos E Complexidade", 90, 0),
    ],
    eletivas: null,
    extensao: { chTotal: 420, chCursada: 0, chFaltante: 420 },
    resumoGeral: {
      // a linha única "Optativas" soma os três blocos: 120 + 30 + 270
      obrigatorias: { total: 3255, cursada: 1860, aprovada: 1800, faltante: 1455, aprovadaTotal: 1800 },
      optativas: { total: 420, cursada: 120, aprovada: 30, faltante: 390, aprovadaTotal: 120 },
      eletivas: { total: 0, aprovada: 0, faltante: 0 },
    },
    avisos: [],
  };
}

describe("regressão Eng. Comp. 962 — três blocos optativos independentes", () => {
  it("não credita humanidades nem expressão gráfica ao bloco profissionalizante", () => {
    // a fonte declara 1081 com 0h cumpridas; as 120h aprovadas são dos outros
    // dois blocos e não podem migrar para cá
    expect(cargaAprovadaBlocoOptativo(perfil962(), ENG_COMP_962)).toBe(0);

    const painel = montarPainel(perfil962(), matriz);
    expect(painel.blocoOptativo).toEqual({ exigido: 270, cumprido: 0 });
  });

  it("mantém cada bloco optativo com o seu próprio exigido", () => {
    const linhas = calcularResumoProgressoGrade([], perfil962(), matriz);
    const por = (id: string) => linhas.find((l) => l.categoriaId === id);

    expect(por("1080")).toMatchObject({ exigido: 120, cumpridoBase: 90 });
    expect(por("1079")).toMatchObject({ exigido: 30, cumpridoBase: 30 });
    expect(por("trilhas_geral")).toMatchObject({ exigido: 270, cumpridoBase: 0 });

    // os três blocos reconstroem exatamente as 420h do Quadro Resumo
    const somaOptativas =
      por("1080")!.exigido + por("1079")!.exigido + por("trilhas_geral")!.exigido;
    expect(somaOptativas).toBe(perfil962().resumoGeral!.optativas.total);
  });

  it("não inventa exigência de eletivas: a matriz 962 declara zero", () => {
    expect(matriz.cargas.eletiva).toBe(0);
    const linhas = calcularResumoProgressoGrade([], perfil962(), matriz);
    expect(linhas.find((l) => l.categoriaId === "eletivas")).toBeUndefined();
  });

  it("cobra a Opção de Expressão Gráfica no simulador quando ela está pendente", () => {
    const pendente = perfil962();
    pendente.resumoConjuntos = pendente.resumoConjuntos.map((c) =>
      c.conjunto === "1079" ? conjunto("1079", c.nome, 30, 0) : c,
    );
    const sim = simularFormatura(pendente, matriz, [oferta], {
      ritmo: 5,
      semestreInicial: "2026-2",
      horizonte: 10,
    });
    expect(sim.requisitos.find((r) => r.id === "expressaoGrafica")).toMatchObject({
      exigido: 30,
      cumprido: 0,
      faltante: 30,
    });
  });

  it("dá a Expressão Gráfica por cumprida quando o histórico já a fechou", () => {
    const sim = simularFormatura(perfil962(), matriz, [oferta], {
      ritmo: 5,
      semestreInicial: "2026-2",
      horizonte: 10,
    });
    expect(sim.requisitos.find((r) => r.id === "expressaoGrafica")).toMatchObject({
      exigido: 30,
      faltante: 0,
    });
    expect(sim.trilhasExigidas).toBe(2);
  });

  it("a oferta de 2026-2 casa disciplinas da 962 pelos códigos do Portal", () => {
    const linhas = calcularResumoProgressoGrade([], perfil962(), matriz);
    expect(linhas.find((l) => l.categoriaId === "obrigatorias")).toMatchObject({
      exigido: 3255,
    });
    expect(oferta.curso).toBe("ENG DE COMPUTAÇÃO");
    expect(oferta.semestre).toBe("2026-2");
  });
});
