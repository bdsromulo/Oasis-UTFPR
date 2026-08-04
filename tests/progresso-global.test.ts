import { describe, expect, it } from "vitest";
import matrizJson from "../data/matriz-981.json";
import { progressoGlobalDoCurso } from "../src/domain/motor/situacao";
import type { Matriz, PerfilAluno, ResumoConjunto } from "../src/domain/tipos";

/**
 * Régua única do "quanto do curso já foi feito".
 *
 * Antes desta função, "Minha situação" e o "Simulador de Formatura" respondiam à
 * mesma pergunta com contas diferentes — 48% contra 54% no mesmo histórico. O
 * simulador somava o `exigido` de cada categoria (3280h, o `cargas.soma`) contra
 * as 3220h do `ch_total_ppc`, e ainda somava a extensão como bloco próprio, sendo
 * que essas horas já vêm embutidas no CHEXT das disciplinas contadas em
 * obrigatórias e optativas.
 *
 * Estes testes fixam a régua oficial: o Quadro Resumo do histórico sobre o
 * `ch_total_ppc` da matriz.
 */

const matriz = matrizJson as unknown as Matriz;

function conjunto(cod: string, nome: string, exigido: number, cursado: number): ResumoConjunto {
  return {
    conjunto: cod,
    nome,
    chObrigatoria: exigido,
    chCursadaAprovada: cursado,
    chFaltante: Math.max(0, exigido - cursado),
    chValidada: cursado >= exigido ? exigido : 0,
  };
}

/** Mesmo perfil sintético de `regressao-bsi.test.ts`, onde o desvio foi flagrado. */
function perfilCompleto(): PerfilAluno {
  return {
    nome: "FULANO DE TAL",
    matricula: "0000000",
    curso: "BSI",
    matriz: 981,
    periodo: 6,
    coefAbsoluto: 0.8,
    coefNormalizado: 0.75,
    ingresso: "2023/1",
    cursadas: [],
    aprovadas: new Set<string>(),
    matriculadas: [],
    obrigatoriasFaltantes: [],
    dependencias: [],
    resumoConjuntos: [
      conjunto("1159", "Segundo Estrato", 360, 225),
      conjunto("1161", "Optativas Do Ciclo De Humanidades", 135, 45),
      conjunto("1160", "Terceiro Estrato - Trilhas Em Computação", 345, 225),
    ],
    eletivas: { chCursadaAprovada: 60, chFaltante: 45, chValidada: 60, chTotal: 105 },
    extensao: { chTotal: 330, chCursada: 90, chFaltante: 240 },
    resumoGeral: {
      obrigatorias: { total: 2005, aprovada: 1200, faltante: 805 },
      optativas: { total: 840, aprovada: 285, faltante: 555 },
      eletivas: { total: 105, aprovada: 60, faltante: 45 },
    },
    avisos: [],
  } as unknown as PerfilAluno;
}

describe("progresso global do curso", () => {
  it("usa o Quadro Resumo sobre o ch_total_ppc da matriz", () => {
    const p = progressoGlobalDoCurso(perfilCompleto(), matriz);
    expect(p.cumprido).toBe(1545); // 1200 obrigatórias + 285 optativas + 60 eletivas
    expect(p.total).toBe(3220); // ch_total_ppc, não o cargas.soma de 3280
    expect(p.percentual).toBe(48);
  });

  it("não soma a extensão por fora: essas horas já estão no CHEXT das disciplinas", () => {
    const perfil = perfilCompleto();
    const comExtensao = progressoGlobalDoCurso(perfil, matriz);
    // 1545 + 90h de extensão cursada daria 1635 — é a dupla contagem que o
    // simulador fazia e que esta régua não pode reintroduzir
    expect(comExtensao.cumprido).not.toBe(1635);

    // e mexer só na extensão não pode mover o número
    const semExtensao = progressoGlobalDoCurso(
      { ...perfil, extensao: { chTotal: 330, chCursada: 0, chFaltante: 330 } } as PerfilAluno,
      matriz,
    );
    expect(semExtensao.cumprido).toBe(comExtensao.cumprido);
  });

  it("cai para a soma das cursadas quando o histórico não traz Quadro Resumo", () => {
    const perfil = {
      ...perfilCompleto(),
      resumoGeral: null,
      cursadas: [
        { codigo: "A", situacao: "aprovado", cht: 60 },
        { codigo: "B", situacao: "dispensado", cht: 30 },
        { codigo: "C", situacao: "reprovado", cht: 90 },
      ],
    } as unknown as PerfilAluno;
    const p = progressoGlobalDoCurso(perfil, matriz);
    expect(p.cumprido).toBe(90); // reprovada não conta
  });

  it("nunca passa de 100%", () => {
    const perfil = perfilCompleto();
    perfil.resumoGeral!.obrigatorias.aprovada = 99999;
    const p = progressoGlobalDoCurso(perfil, matriz);
    expect(p.cumprido).toBe(3220);
    expect(p.percentual).toBe(100);
  });

  it("devolve zero sem perfil", () => {
    const p = progressoGlobalDoCurso(null, matriz);
    expect(p.cumprido).toBe(0);
    expect(p.percentual).toBe(0);
    expect(p.total).toBe(3220);
  });
});
