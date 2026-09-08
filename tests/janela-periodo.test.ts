import { describe, expect, it } from "vitest";
import matriz968Json from "../data/eng-eletronica/matriz-968.json";
import oferta20262 from "../data/eng-eletronica/turmas/2026-2.json";
import { ADIANTAMENTO_MAXIMO_PERIODOS, foraDaJanelaDePeriodo } from "../src/domain/cursos";
import { CURSOS } from "../src/domain/dadosCurso";
import { listarElegiveis } from "../src/domain/motor/elegiveis";
import { gerarSugestaoGrade } from "../src/domain/motor/grade-magica";
import { simularFormatura } from "../src/domain/motor/simuladorFormatura";
import type { Matriz, OfertaSemestre, PerfilAluno, ResumoConjunto } from "../src/domain/tipos";

/**
 * Janela de período (TASK-48).
 *
 * A UTFPR recusa matrícula em disciplina adiantada demais: vale até 2 períodos
 * à frente do período do aluno. O motor sabia o período de cada disciplina —
 * as 1.290 das oito matrizes o têm preenchido — e nunca o comparava com o do
 * aluno, então um aluno do 6º período de Eng. Eletrônica recebia Trabalho de
 * Conclusão de Curso 1 (9º período) em segundo lugar na Sugestão de Grade.
 */

const matriz = matriz968Json as unknown as Matriz;
const oferta = oferta20262 as unknown as OfertaSemestre;

function conjunto(codigo: string, nome: string, exigido: number, cumprido: number): ResumoConjunto {
  return {
    conjunto: codigo,
    nome,
    chObrigatoria: exigido,
    chCursadaAprovada: cumprido,
    chFaltante: Math.max(0, exigido - cumprido),
    chValidada: cumprido >= exigido ? exigido : 0,
  };
}

/**
 * Perfil da 968 no 6º período, com as obrigatórias até o 5º aprovadas. É o
 * recorte do caso real que originou a task: sem as aprovações o guloso nem
 * chega às disciplinas de fim de curso.
 */
function perfil968(periodo: number | null = 6): PerfilAluno {
  const aprovadas = new Set<string>(
    matriz.disciplinas
      .filter((d) => d.conjunto === null && (d.periodo ?? 99) <= 5)
      .map((d) => d.codigo),
  );
  return {
    nome: "ALUNO FICTÍCIO",
    matricula: "0000000",
    curso: "250 - Eng Eletrônica",
    matriz: 968,
    periodo,
    coefAbsoluto: 0.8,
    coefNormalizado: 0.65,
    ingresso: "1/2023",
    cursadas: Array.from(aprovadas).map((codigo) => {
      const d = matriz.disciplinas.find((x) => x.codigo === codigo)!;
      return {
        codigo,
        nome: d.nome,
        situacao: "aprovado" as const,
        origem: "obrigatoria" as const,
        media: 8,
        frequencia: 100,
        cht: d.horas.total,
        ano: null,
        semestre: null,
      };
    }),
    aprovadas,
    matriculadas: [],
    obrigatoriasFaltantes: [],
    dependencias: [],
    resumoConjuntos: [
      conjunto("1174", "Ciclo De Humanidades", 210, 60),
      conjunto("1175", "Opções De Programação De Computador", 60, 60),
      conjunto("1187", "Opções De Circuitos Elétricos", 180, 180),
      conjunto("1193", "Opções De Física Aplicada", 210, 60),
      conjunto("1177", "Opções De Adm, Empreend E Economia", 90, 0),
      conjunto("1180", "Trilhas De Aprofundamento", 300, 0),
      conjunto("1226", "Sistemas Iot", 270, 0),
    ],
    eletivas: null,
    extensao: { chTotal: 465, chCursada: 0, chFaltante: 465 },
    resumoGeral: {
      obrigatorias: { total: 1710, cursada: 1095, aprovada: 1095, faltante: 615, aprovadaTotal: 1095 },
      optativas: { total: 2385, cursada: 1095, aprovada: 675, faltante: 1710, aprovadaTotal: 795 },
      eletivas: { total: 0, aprovada: 0, faltante: 0 },
    },
    avisos: [],
  };
}

describe("a fronteira da janela", () => {
  it("permite até dois períodos à frente e barra o terceiro", () => {
    expect(ADIANTAMENTO_MAXIMO_PERIODOS).toBe(2);
    // aluno no 7º alcança o TCC do 9º; no 6º, não
    expect(foraDaJanelaDePeriodo(9, 7)).toBe(false);
    expect(foraDaJanelaDePeriodo(9, 6)).toBe(true);
    expect(foraDaJanelaDePeriodo(8, 6)).toBe(false);
  });

  it("nunca trava o aluno atrasado", () => {
    // dependência do 3º período para quem já está no 6º continua à mão
    expect(foraDaJanelaDePeriodo(3, 6)).toBe(false);
    expect(foraDaJanelaDePeriodo(1, 10)).toBe(false);
  });

  it("falha aberto quando não há período de que medir distância", () => {
    // histórico sem período: travar tudo seria pior que não travar nada
    expect(foraDaJanelaDePeriodo(9, null)).toBe(false);
    expect(foraDaJanelaDePeriodo(9, 0)).toBe(false);
    // disciplina que só existe na oferta chega com periodo 0
    expect(foraDaJanelaDePeriodo(0, 6)).toBe(false);
  });
});

describe("Sugestão de Grade na 968", () => {
  const opcoes = {
    estrategia: "adiantar_maximo" as const,
    naoManha: false,
    naoTarde: false,
    naoNoite: false,
  };

  it("bloqueia o TCC com motivo legível para quem está no 6º período", () => {
    const elegiveis = listarElegiveis(perfil968(6), matriz, oferta);
    const tcc = elegiveis.find((e) => e.disciplina.codigo === "ELE91")!;
    expect(tcc.motivoBloqueio).toBe("abre a partir do 7º período");
  });

  it("libera o TCC quando o aluno chega ao 7º período", () => {
    const elegiveis = listarElegiveis(perfil968(7), matriz, oferta);
    const tcc = elegiveis.find((e) => e.disciplina.codigo === "ELE91")!;
    expect(tcc.motivoBloqueio).toBeNull();
  });

  it("não sugere TCC1 nem TCC2 para o aluno do 6º período", () => {
    for (const estrategia of ["adiantar_maximo", "balanceado"] as const) {
      const selecao = gerarSugestaoGrade(perfil968(6), matriz, oferta, { ...opcoes, estrategia });
      const codigos = selecao.map((s) => s.codDisciplina);
      expect(codigos, estrategia).not.toContain("ELE91");
      expect(codigos, estrategia).not.toContain("ELE92");
    }
  });

  it("continua sugerindo uma grade cheia sem o TCC", () => {
    const selecao = gerarSugestaoGrade(perfil968(6), matriz, oferta, opcoes);
    expect(selecao.length).toBeGreaterThanOrEqual(4);
  });

  it("não sugere nada acima da janela, seja qual for a categoria", () => {
    const selecao = gerarSugestaoGrade(perfil968(6), matriz, oferta, opcoes);
    for (const s of selecao) {
      const d = matriz.disciplinas.find((x) => x.codigo === s.codDisciplina);
      if (!d) continue; // disciplina só da oferta: sem período conhecido
      expect(d.periodo, `${d.codigo} ${d.nome}`).toBeLessThanOrEqual(8);
    }
  });
});

/**
 * O gate corta o que está longe demais; a pontuação ordena o que sobrou. Sem
 * esta metade, o TCC volta ao topo assim que o aluno chega ao 7º período —
 * dentro da janela, mas ainda dois períodos à frente do que ele deveria cursar.
 */
describe("distância do período na pontuação", () => {
  const opcoes = {
    estrategia: "adiantar_maximo" as const,
    naoManha: false,
    naoTarde: false,
    naoNoite: false,
  };

  it("não põe disciplina adiantada na frente de uma que já está no período", () => {
    const selecao = gerarSugestaoGrade(perfil968(7), matriz, oferta, opcoes);
    const periodos = selecao
      .map((s) => matriz.disciplinas.find((x) => x.codigo === s.codDisciplina))
      .filter((d) => !!d && d.periodo > 0)
      .map((d) => d!.periodo);

    let viuAdiantada = false;
    for (const p of periodos) {
      if (p > 7) {
        viuAdiantada = true;
        continue;
      }
      expect(viuAdiantada, `disciplina do ${p}º período sugerida depois de uma adiantada`).toBe(
        false,
      );
    }
  });

  it("prioriza a atrasada sobre a adiantada", () => {
    // ELE91 (9º) contra as do 6º e 7º que o mesmo semestre oferece
    const selecao = gerarSugestaoGrade(perfil968(7), matriz, oferta, opcoes);
    const codigos = selecao.map((s) => s.codDisciplina);
    const posTcc = codigos.indexOf("ELE91");
    const posOficina = codigos.indexOf("ELE64"); // 7º período
    if (posTcc >= 0 && posOficina >= 0) {
      expect(posTcc).toBeGreaterThan(posOficina);
    }
  });
});

/**
 * A regra é do domínio, não de um curso: `foraDaJanelaDePeriodo` só olha dois
 * números, e os dois motores que decidem o que o aluno cursa a consultam. Este
 * bloco prova isso nos oito currículos servidos, em vez de confiar em que a
 * função ser genérica basta.
 */
describe("a janela vale em todo curso servido", () => {
  const PERIODO = 5;
  const TETO = PERIODO + ADIANTAMENTO_MAXIMO_PERIODOS;

  /** Perfil mínimo do curso, com as obrigatórias até o 4º período feitas. */
  function perfilGenerico(m: Matriz, periodo: number = PERIODO): PerfilAluno {
    const aprovadas = new Set<string>(
      m.disciplinas.filter((d) => d.conjunto === null && d.periodo > 0 && d.periodo <= 4).map((d) => d.codigo),
    );
    return {
      nome: "ALUNO FICTÍCIO",
      matricula: "0000000",
      curso: String(m.curso),
      matriz: m.matriz,
      periodo,
      coefAbsoluto: 0.8,
      coefNormalizado: 0.65,
      ingresso: "1/2023",
      cursadas: Array.from(aprovadas).map((codigo) => {
        const d = m.disciplinas.find((x) => x.codigo === codigo)!;
        return {
          codigo,
          nome: d.nome,
          situacao: "aprovado" as const,
          origem: "obrigatoria" as const,
          media: 8,
          frequencia: 100,
          cht: d.horas.total,
          ano: null,
          semestre: null,
        };
      }),
      aprovadas,
      matriculadas: [],
      obrigatoriasFaltantes: [],
      dependencias: [],
      resumoConjuntos: [],
      eletivas: null,
      extensao: null,
      resumoGeral: null,
      avisos: [],
    };
  }

  for (const curso of CURSOS) {
    describe(curso.rotuloCurto, () => {
      const m = curso.matriz;
      const of = curso.ofertas[curso.semestrePadrao];
      const perfil = perfilGenerico(m);

      it("a Sugestão de Grade não passa da janela", () => {
        for (const estrategia of ["adiantar_maximo", "balanceado"] as const) {
          const selecao = gerarSugestaoGrade(perfil, m, of, {
            estrategia,
            naoManha: false,
            naoTarde: false,
            naoNoite: false,
          });
          for (const s of selecao) {
            const d = m.disciplinas.find((x) => x.codigo === s.codDisciplina);
            if (!d || d.periodo <= 0) continue; // só na oferta: sem período conhecido
            expect(d.periodo, `${estrategia}: ${d.codigo} ${d.nome}`).toBeLessThanOrEqual(TETO);
          }
        }
      });

      it("o Simulador não passa da janela no primeiro semestre projetado", () => {
        const sim = simularFormatura(perfil, m, [of], {
          ritmo: 6,
          semestreInicial: curso.semestrePadrao,
          horizonte: 20,
        });
        for (const d of sim.semestres[0].disciplinas) {
          const dm = m.disciplinas.find((x) => x.codigo === d.codigo);
          if (!dm || dm.periodo <= 0) continue;
          expect(dm.periodo, `${dm.codigo} ${dm.nome}`).toBeLessThanOrEqual(TETO);
        }
      });

      it("a janela não impede a formatura que o curso alcançaria sem ela", () => {
        const opts = { ritmo: 6, semestreInicial: curso.semestrePadrao, horizonte: 20 };
        // período altíssimo: nada fica a mais de 2 períodos de distância, então
        // o gate existe e não morde. É a linha de base contra a qual medir.
        const semJanela = simularFormatura(perfilGenerico(m, 99), m, [of], opts);
        const comJanela = simularFormatura(perfil, m, [of], opts);

        // Eng. Mecatrônica não fecha nem com o gate inerte — lacuna anterior a
        // esta task (a suíte do Simulador nunca cobriu esse curso), e não algo
        // que a janela tenha causado. Aqui só não se afirma nada sobre ela.
        if (!semJanela.semestreFormatura) return;
        expect(comJanela.semestreFormatura).toBeTruthy();
      });
    });
  }
});

describe("Simulador de Formatura na 968", () => {
  it("não põe o TCC no primeiro semestre projetado de quem está no 6º", () => {
    const sim = simularFormatura(perfil968(6), matriz, [oferta], {
      ritmo: 6,
      semestreInicial: "2026-2",
      horizonte: 20,
    });
    const primeiro = sim.semestres[0].disciplinas.map((d) => d.codigo);
    expect(primeiro).not.toContain("ELE91");
    expect(primeiro).not.toContain("ELE92");
  });

  it("ainda projeta o TCC mais adiante, e não o perde", () => {
    const sim = simularFormatura(perfil968(6), matriz, [oferta], {
      ritmo: 6,
      semestreInicial: "2026-2",
      horizonte: 20,
    });
    const todas = sim.semestres.flatMap((s) => s.disciplinas.map((d) => d.codigo));
    expect(todas).toContain("ELE91");
    expect(todas).toContain("ELE92");
  });
});
