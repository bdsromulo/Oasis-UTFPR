import { describe, expect, it } from "vitest";
import matrizJson from "../data/matriz-981.json";
import turmas20252 from "../data/turmas/2025-2.json";
import turmas20261 from "../data/turmas/2026-1.json";
import turmas20262 from "../data/turmas/2026-2.json";
import {
  gradeFixadaDaSelecao,
  inferirSazonalidade,
  ofertaReferenciaDoSemestre,
  proximoSemestre,
  simularFormatura,
} from "../src/domain/motor/simuladorFormatura";
import { criarMapaIdentidade } from "../src/domain/motor/identidade";
import { detectarConflitos, itensDaSelecao } from "../src/domain/motor/grade";
import { BSI, ENG_COMP, ENG_COMP_962, ENG_ELETRONICA } from "../src/domain/dadosCurso";
import { descricaoDoCurso, ehTrilha, TETO_CH_SEMESTRE } from "../src/domain/cursos";
import type {
  Matriz,
  OfertaSemestre,
  PerfilAluno,
  ResumoConjunto,
  SelecaoTurma,
} from "../src/domain/tipos";

const matriz = matrizJson as unknown as Matriz;
const ofertas = [turmas20252, turmas20261] as unknown as OfertaSemestre[];
/** o que a aplicação de fato entrega ao motor hoje */
const ofertasReais = [
  turmas20262,
  turmas20261,
  turmas20252,
] as unknown as OfertaSemestre[];

/** Perfil sintético: nada de dado pessoal real entra no repositório. */
function perfilFake(over: Partial<PerfilAluno> = {}): PerfilAluno {
  const aprovadas = over.aprovadas ?? new Set<string>();
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
    aprovadas,
    matriculadas: [],
    obrigatoriasFaltantes: [],
    dependencias: [],
    resumoConjuntos: [],
    eletivas: { chCursadaAprovada: 105, chFaltante: 0, chValidada: 105, chTotal: 105 },
    extensao: { chTotal: 330, chCursada: 330, chFaltante: 0 },
    resumoGeral: {
      obrigatorias: { total: 2005, aprovada: 0, faltante: 2005 },
      optativas: { total: 840, aprovada: 0, faltante: 840 },
      eletivas: { total: 105, aprovada: 105, faltante: 0 },
    },
    avisos: [],
    ...over,
  };
}

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

describe("sazonalidade empírica", () => {
  const mapa = criarMapaIdentidade(matriz);
  const saz = inferirSazonalidade(ofertas, mapa);

  it("classifica pelo que a oferta real mostra, não pela paridade do período", () => {
    // todas as obrigatórias de sala de aula da 981 abriram nos dois semestres
    const obrigatorias = matriz.disciplinas.filter(
      (d) => d.conjunto === null && !d.codigo.startsWith("ENADE") && !/^ICSX5/.test(d.codigo),
    );
    for (const d of obrigatorias) {
      expect(saz.de(d.codigo), `${d.codigo} deveria abrir nos dois semestres`).toBe("ambos");
    }
  });

  it("marca como exclusiva de um semestre quem só apareceu num deles", () => {
    // GEE7G1 (2º estrato) só consta na oferta de 2026.1
    expect(saz.de("GEE7G1")).toBe("primeiro");
    // FCH7GA (humanidades) só consta na oferta de 2025.2
    expect(saz.de("FCH7GA")).toBe("segundo");
  });

  it("marca como sem oferta quem não apareceu em semestre nenhum", () => {
    expect(saz.de("ICSW22")).toBe("sem_oferta");
  });

  it("não afirma exclusividade quando só um semestre foi observado", () => {
    const mapa = criarMapaIdentidade(matriz);
    const soUm = inferirSazonalidade([turmas20252 as unknown as OfertaSemestre], mapa);
    expect(soUm.de("FCH7GA")).toBe("ambos");
  });
});

describe("avanço de semestre", () => {
  it("alterna 1 e 2 virando o ano", () => {
    expect(proximoSemestre("2026-1")).toBe("2026-2");
    expect(proximoSemestre("2026-2")).toBe("2027-1");
    expect(proximoSemestre("2027-2")).toBe("2028-1");
  });
});

describe("simulação de formatura", () => {
  /** Aluno em fim de curso: espelha a estrutura de um 6º período adiantado. */
  function perfilFimDeCurso() {
    const aprovadas = new Set<string>(
      matriz.disciplinas
        .filter((d) => d.conjunto === null && !d.codigo.startsWith("ENADE"))
        .filter((d) => !["ICSX30", "ICSX40", "ICSX41", "ICSS30"].includes(d.codigo))
        .map((d) => d.codigo),
    );
    return perfilFake({
      aprovadas,
      resumoConjuntos: [
        conjunto("1159", "Segundo Estrato", 360, 225),
        conjunto("1161", "Optativas Do Ciclo De Humanidades", 135, 45),
        conjunto("1164", "Desenvolvimento Baseado Em Plataformas", 90, 60),
        conjunto("1165", "Banco De Dados", 90, 120),
        conjunto("1171", "Sistemas Embarcados E Robótica", 90, 45),
      ],
      resumoGeral: {
        obrigatorias: { total: 2005, aprovada: 1840, faltante: 165 },
        optativas: { total: 840, aprovada: 90, faltante: 750 },
        eletivas: { total: 105, aprovada: 105, faltante: 0 },
      },
    });
  }

  it("fecha todas as categorias no mínimo exigido", () => {
    const r = simularFormatura(perfilFimDeCurso(), matriz, ofertas, {
      ritmo: 5,
      semestreInicial: "2026-2",
    });
    expect(r.semestreFormatura).not.toBeNull();
    for (const q of r.requisitos) {
      expect(q.atendido, `${q.nome} não fechou`).toBe(true);
    }
  });

  it("respeita a cadeia TI2 → TC1 → TC2, um por semestre", () => {
    const r = simularFormatura(perfilFimDeCurso(), matriz, ofertas, {
      ritmo: 6,
      semestreInicial: "2026-2",
    });
    const semestreDe = (cod: string) =>
      r.semestres.findIndex((s) => s.disciplinas.some((d) => d.codigo === cod));

    const ti2 = semestreDe("ICSX30");
    const tc1 = semestreDe("ICSX40");
    const tc2 = semestreDe("ICSX41");
    expect(ti2).toBeGreaterThanOrEqual(0);
    expect(tc1).toBeGreaterThan(ti2);
    expect(tc2).toBeGreaterThan(tc1);
  });

  it("nunca agenda uma disciplina antes dos seus pré-requisitos", () => {
    const r = simularFormatura(perfilFimDeCurso(), matriz, ofertas, {
      ritmo: 6,
      semestreInicial: "2026-2",
    });
    const cursadasAte = new Set(perfilFimDeCurso().aprovadas);
    for (const s of r.semestres) {
      for (const d of s.disciplinas) {
        const dm = matriz.disciplinas.find((x) => x.codigo === d.codigo);
        if (!dm) continue; // eletiva genérica
        for (const p of dm.prerequisitos) {
          if (/^Per[ií]odo:/i.test(p)) continue;
          expect(cursadasAte.has(p), `${d.codigo} agendada sem ${p}`).toBe(true);
        }
      }
      for (const d of s.disciplinas) cursadasAte.add(d.codigo);
    }
  });

  it("respeita a sazonalidade observada de cada disciplina", () => {
    const mapa = criarMapaIdentidade(matriz);
    const saz = inferirSazonalidade(ofertas, mapa);
    const r = simularFormatura(perfilFimDeCurso(), matriz, ofertas, {
      ritmo: 6,
      semestreInicial: "2026-2",
    });
    for (const s of r.semestres) {
      const ehPar = s.semestre.endsWith("-2");
      for (const d of s.disciplinas) {
        if (d.codigo === "ELETIVA") continue;
        const e = saz.de(d.codigo);
        if (e === "primeiro") expect(ehPar, `${d.codigo} em semestre par`).toBe(false);
        if (e === "segundo") expect(ehPar, `${d.codigo} em semestre ímpar`).toBe(true);
      }
    }
  });

  it("conta TODAS as horas de trilha para as 345h, sem teto por trilha", () => {
    // O 3º estrato não tem teto de contagem por trilha: quem cursa 120h numa
    // trilha de 90h leva as 120h para as 345h. As 90h são o limiar para VALIDAR
    // a trilha, coisa diferente — PPC p.101 ("270h em três trilhas + 75h", que
    // podem cair em trilha já completa ou espalhadas). O próprio histórico
    // confirma: o agregado do conjunto 1160 soma as horas cruas.
    const perfil = perfilFake({
      resumoConjuntos: [
        conjunto("1160", "Terceiro Estrato", 345, 225),
        conjunto("1164", "Desenvolvimento Baseado Em Plataformas", 90, 60),
        conjunto("1165", "Banco De Dados", 90, 120),
        conjunto("1171", "Sistemas Embarcados E Robótica", 90, 45),
      ],
    });
    const r = simularFormatura(perfil, matriz, ofertas, { ritmo: 5, semestreInicial: "2026-2" });
    const trilhas = r.requisitos.find((q) => q.id === "trilhas")!;
    // 60 + 120 + 45 = 225, e não 60 + 90 + 45 = 195 que um teto por trilha daria
    expect(trilhas.cumprido).toBe(225);
  });

  it("exige 3 trilhas validadas além do total de horas", () => {
    // As duas condições são independentes: 3 trilhas validadas somam 270h (menos
    // que 345), e dá para ter 345h espalhadas sem validar trilha nenhuma.
    const perfil = perfilFimDeCurso();
    for (const ritmo of [4, 5, 6]) {
      const r = simularFormatura(perfil, matriz, ofertas, { ritmo, semestreInicial: "2026-2" });
      expect(r.semestreFormatura, `ritmo ${ritmo} não fechou`).not.toBeNull();

      const horasPorTrilha = new Map<number, number>();
      for (const c of perfil.resumoConjuntos) {
        const n = Number(c.conjunto);
        if (n >= 1162 && n <= 1173) horasPorTrilha.set(n, c.chCursadaAprovada);
      }
      for (const s of r.semestres) {
        for (const d of s.disciplinas) {
          if (d.categoria !== "trilhas" || d.conjunto === null) continue;
          horasPorTrilha.set(d.conjunto, (horasPorTrilha.get(d.conjunto) ?? 0) + d.horas);
        }
      }
      const validadas = [...horasPorTrilha.entries()].filter(
        ([conj, horas]) => horas >= (matriz.conjuntos[String(conj)]?.ch ?? 90),
      ).length;
      expect(validadas, `ritmo ${ritmo}: só ${validadas} trilhas validadas`).toBeGreaterThanOrEqual(
        r.trilhasExigidas,
      );

      const trilhas = r.requisitos.find((q) => q.id === "trilhas")!;
      expect(trilhas.cumprido + trilhas.planejado).toBeGreaterThanOrEqual(trilhas.exigido);
    }
  });

  it("concentra o esforço no número de trilhas exigido, sem espalhar", () => {
    // Regressão: perseguindo as 3 trilhas validadas, o guloso espalhava
    // disciplina por trilha nova e nenhuma fechava as 90h — chegou a planejar
    // 615h para uma exigência de 345h. As trilhas-alvo são escolhidas antes de
    // montar os semestres, então o plano não toca em mais trilhas que o preciso.
    const perfil = perfilFimDeCurso();
    for (const ritmo of [4, 5, 6]) {
      const r = simularFormatura(perfil, matriz, ofertas, { ritmo, semestreInicial: "2026-2" });
      const tocadas = new Set(
        r.semestres.flatMap((s) =>
          s.disciplinas.filter((d) => d.categoria === "trilhas").map((d) => d.conjunto),
        ),
      );
      expect(tocadas.size, `ritmo ${ritmo} espalhou por ${tocadas.size} trilhas`).toBeLessThanOrEqual(
        r.trilhasExigidas,
      );
    }
  });

  it("não ocupa vaga de aula com estágio nem atividades complementares", () => {
    const aprovadas = new Set<string>(
      matriz.disciplinas
        .filter((d) => d.conjunto === null && !d.codigo.startsWith("ENADE"))
        .filter((d) => !["ICSX50", "ICSX51", "ICSX52"].includes(d.codigo))
        .map((d) => d.codigo),
    );
    const r = simularFormatura(
      perfilFake({
        aprovadas,
        resumoGeral: {
          obrigatorias: { total: 2005, aprovada: 1600, faltante: 405 },
          optativas: { total: 840, aprovada: 840, faltante: 0 },
          eletivas: { total: 105, aprovada: 105, faltante: 0 },
        },
        resumoConjuntos: [
          conjunto("1159", "Segundo Estrato", 360, 360),
          conjunto("1161", "Humanidades", 135, 135),
          conjunto("1165", "Banco De Dados", 90, 90),
          conjunto("1166", "Inteligência Artificial", 90, 90),
          conjunto("1168", "Algoritmos E Complexidade", 90, 90),
          conjunto("1170", "Redes De Computadores", 90, 90),
        ],
      }),
      matriz,
      ofertas,
      { ritmo: 1, semestreInicial: "2026-2" },
    );
    // com ritmo 1, estágio e atividades ainda assim cabem no mesmo semestre
    const primeiro = r.semestres[0];
    // o ritmo limita a disputa por vaga de aula, não a lista do semestre
    expect(primeiro.vagasOcupadas).toBeLessThanOrEqual(1);
    expect(primeiro.disciplinas.length).toBeGreaterThan(1);
    // e o que a tela mostra segue a lista, podendo passar do ritmo
    expect(primeiro.materias).toBeGreaterThan(primeiro.vagasOcupadas);
  });

  it("nunca contabiliza mais horas do que a categoria exige", () => {
    // perfil incoerente de propósito: Quadro Resumo diz 1200h de obrigatórias,
    // mas nenhuma disciplina consta como aprovada. O cumprido de obrigatórias
    // vem do roster, então cumprido + planejado tem de fechar exatamente no piso.
    const r = simularFormatura(
      perfilFake({
        aprovadas: new Set<string>(),
        resumoGeral: {
          obrigatorias: { total: 2005, aprovada: 1200, faltante: 805 },
          optativas: { total: 840, aprovada: 0, faltante: 840 },
          eletivas: { total: 105, aprovada: 0, faltante: 105 },
        },
      }),
      matriz,
      ofertas,
      { ritmo: 6, semestreInicial: "2026-2" },
    );
    const obr = r.requisitos.find((q) => q.id === "obrigatorias")!;
    expect(obr.cumprido).toBe(0);
    expect(obr.cumprido + obr.planejado).toBe(2005);
  });

  it("soma do roster obrigatório bate com a carga declarada na matriz", () => {
    const soma = matriz.disciplinas
      .filter((d) => d.conjunto === null && !d.codigo.startsWith("ENADE"))
      .reduce((a, d) => a + d.horas.total, 0);
    expect(soma).toBe(matriz.cargas.obrigatorias);
  });

  it("um ritmo maior nunca atrasa a formatura", () => {
    const semestres = [4, 5, 6, 7].map(
      (ritmo) =>
        simularFormatura(perfilFimDeCurso(), matriz, ofertas, {
          ritmo,
          semestreInicial: "2026-2",
        }).semestres.length,
    );
    for (let i = 1; i < semestres.length; i++) {
      expect(semestres[i]).toBeLessThanOrEqual(semestres[i - 1]);
    }
  });

  it("sem histórico, projeta o curso inteiro a partir do zero", () => {
    const r = simularFormatura(null, matriz, ofertas, { ritmo: 6, semestreInicial: "2026-2" });
    expect(r.semestres.length).toBeGreaterThan(4);
    expect(r.requisitos.find((q) => q.id === "obrigatorias")!.faltante).toBe(2005);
  });
});

/**
 * O simulador projeta uma grade, e uma grade que colide consigo mesma não é
 * grade. Cada semestre futuro espelha a oferta real de mesma paridade e o motor
 * só agenda uma disciplina se sobrar turma sem choque — do contrário ela fica
 * para o semestre seguinte.
 */
describe("oferta-espelho e grade sem choque interno", () => {
  /** Aluno de fim de curso, com pendências espalhadas por várias categorias. */
  function perfilComPendencias(): PerfilAluno {
    const aprovadas = new Set<string>(
      matriz.disciplinas
        .filter((d) => d.conjunto === null && !d.codigo.startsWith("ENADE"))
        .filter((d) => !["ICSX30", "ICSX40", "ICSX41", "ICSS30"].includes(d.codigo))
        .map((d) => d.codigo),
    );
    return perfilFake({
      aprovadas,
      resumoConjuntos: [
        conjunto("1159", "Segundo Estrato", 360, 225),
        conjunto("1161", "Optativas Do Ciclo De Humanidades", 135, 45),
        conjunto("1164", "Desenvolvimento Baseado Em Plataformas", 90, 60),
        conjunto("1165", "Banco De Dados", 90, 120),
      ],
      resumoGeral: {
        obrigatorias: { total: 2005, aprovada: 1840, faltante: 165 },
        optativas: { total: 840, aprovada: 90, faltante: 750 },
        eletivas: { total: 105, aprovada: 105, faltante: 0 },
      },
    });
  }

  it("usa a própria oferta quando o semestre é conhecido", () => {
    expect(ofertaReferenciaDoSemestre("2026-2", ofertasReais)?.semestre).toBe("2026-2");
    expect(ofertaReferenciaDoSemestre("2026-1", ofertasReais)?.semestre).toBe("2026-1");
  });

  it("herda a oferta mais recente de mesma paridade nos semestres futuros", () => {
    // 27.1 usa 26.1, 27.2 usa 26.2, 28.1 volta à 26.1 — esse é o padrão
    expect(ofertaReferenciaDoSemestre("2027-1", ofertasReais)?.semestre).toBe("2026-1");
    expect(ofertaReferenciaDoSemestre("2027-2", ofertasReais)?.semestre).toBe("2026-2");
    expect(ofertaReferenciaDoSemestre("2028-1", ofertasReais)?.semestre).toBe("2026-1");
    expect(ofertaReferenciaDoSemestre("2028-2", ofertasReais)?.semestre).toBe("2026-2");
  });

  it("registra em cada semestre projetado qual oferta o espelhou", () => {
    const r = simularFormatura(perfilComPendencias(), matriz, ofertasReais, {
      ritmo: 6,
      semestreInicial: "2026-2",
    });
    for (const s of r.semestres) {
      const esperado = s.semestre.endsWith("-2") ? "2026-2" : "2026-1";
      expect(s.semestreReferencia, `${s.semestre} espelhou oferta errada`).toBe(esperado);
    }
  });

  it("nunca monta um semestre que entra em conflito consigo mesmo", () => {
    // Regressão: a grade projetada de 2026.2 chegava ao Planejamento de
    // Matrícula acusando choque entre disciplinas que o próprio motor havia
    // colocado no mesmo semestre.
    const perfis: [string, PerfilAluno | null][] = [
      ["fim de curso", perfilComPendencias()],
      // curso inteiro do zero: é onde o guloso mais empilhava matéria no mesmo
      // horário, porque há muita obrigatória elegível ao mesmo tempo
      ["do zero", null],
    ];
    for (const [rotulo, p] of perfis)
    for (const ritmo of [4, 5, 6, 7, 8]) {
      const r = simularFormatura(p, matriz, ofertasReais, {
        ritmo,
        semestreInicial: "2026-2",
      });
      for (const s of r.semestres) {
        const referencia = ofertaReferenciaDoSemestre(s.semestre, ofertasReais)!;
        const selecao: SelecaoTurma[] = s.disciplinas
          .filter((d) => d.codigoOferta && d.turma)
          .map((d) => ({ codDisciplina: d.codigoOferta!, codTurma: d.turma! }));
        const conflitos = detectarConflitos(itensDaSelecao(referencia, selecao));
        expect(
          conflitos.map((c) => `${c.a.disciplina.codigo}×${c.b.disciplina.codigo} (${c.detalhe})`),
          `${rotulo}, ritmo ${ritmo}, semestre ${s.semestre}`,
        ).toEqual([]);
      }
    }
  });

  it("reserva turma real para toda disciplina que ocupa vaga e tem oferta", () => {
    const r = simularFormatura(perfilComPendencias(), matriz, ofertasReais, {
      ritmo: 5,
      semestreInicial: "2026-2",
    });
    const primeiro = r.semestres[0];
    const comTurma = primeiro.disciplinas.filter((d) => d.ocupaVaga && d.turma);
    expect(comTurma.length).toBeGreaterThan(0);
    for (const d of comTurma) {
      const oferta = turmas20262 as unknown as OfertaSemestre;
      const disc = oferta.disciplinas.find((x) => x.codigo === d.codigoOferta);
      expect(disc, `${d.codigo} apontou oferta inexistente`).toBeDefined();
      expect(disc!.turmas.some((t) => t.codigo === d.turma)).toBe(true);
    }
  });
});

/**
 * Caminho de volta da importação: a grade que o aluno montou no Planejamento de
 * Matrícula entra na projeção como fato consumado, e os semestres seguintes são
 * calculados a partir dela.
 */
describe("grade do Planejamento como semestre de partida", () => {
  const oferta20262 = turmas20262 as unknown as OfertaSemestre;

  function perfilBase(): PerfilAluno {
    const aprovadas = new Set<string>(
      matriz.disciplinas
        .filter((d) => d.conjunto === null && !d.codigo.startsWith("ENADE"))
        .filter((d) => !["ICSX30", "ICSX40", "ICSX41", "ICSS30"].includes(d.codigo))
        .map((d) => d.codigo),
    );
    return perfilFake({
      aprovadas,
      resumoConjuntos: [
        conjunto("1159", "Segundo Estrato", 360, 225),
        conjunto("1161", "Optativas Do Ciclo De Humanidades", 135, 45),
        conjunto("1164", "Desenvolvimento Baseado Em Plataformas", 90, 60),
        conjunto("1165", "Banco De Dados", 90, 120),
      ],
      resumoGeral: {
        obrigatorias: { total: 2005, aprovada: 1840, faltante: 165 },
        optativas: { total: 840, aprovada: 90, faltante: 750 },
        eletivas: { total: 105, aprovada: 105, faltante: 0 },
      },
    });
  }

  /** Grade de 2026.2 tal como o Planejamento a guarda: pares disciplina+turma. */
  function selecaoDoPlanejamento(): SelecaoTurma[] {
    const r = simularFormatura(perfilBase(), matriz, ofertasReais, {
      ritmo: 3,
      semestreInicial: "2026-2",
    });
    return r.semestres[0].disciplinas
      .filter((d) => d.codigoOferta && d.turma)
      .map((d) => ({ codDisciplina: d.codigoOferta!, codTurma: d.turma! }));
  }

  it("resolve cada turma da seleção para o código canônico da matriz", () => {
    const fixada = gradeFixadaDaSelecao(
      "2026-2",
      oferta20262,
      selecaoDoPlanejamento(),
      matriz,
      "Grade A",
    );
    expect(fixada.itens.length).toBeGreaterThan(0);
    for (const item of fixada.itens) {
      expect(item.codigoMatriz, `${item.codigoOferta} não casou com a matriz`).not.toBeNull();
      expect(item.horas).toBeGreaterThan(0);
    }
  });

  it("mantém o semestre importado exatamente como foi montado", () => {
    const selecao = selecaoDoPlanejamento();
    const fixada = gradeFixadaDaSelecao("2026-2", oferta20262, selecao, matriz, "Grade A");
    const r = simularFormatura(perfilBase(), matriz, ofertasReais, {
      // ritmo alto de propósito: o semestre importado não pode ganhar matérias
      ritmo: 8,
      semestreInicial: "2026-2",
      gradeFixada: fixada,
    });
    const primeiro = r.semestres[0];
    expect(primeiro.semestre).toBe("2026-2");
    expect(primeiro.fixadoPeloPlanejamento).toBe(true);
    expect(primeiro.disciplinas.filter((d) => d.ocupaVaga).map((d) => d.turma).sort()).toEqual(
      selecao.map((s) => s.codTurma).sort(),
    );
  });

  it("projeta os semestres seguintes a partir da grade importada", () => {
    const selecao = selecaoDoPlanejamento();
    const fixada = gradeFixadaDaSelecao("2026-2", oferta20262, selecao, matriz, "Grade A");
    const r = simularFormatura(perfilBase(), matriz, ofertasReais, {
      ritmo: 6,
      semestreInicial: "2026-2",
      gradeFixada: fixada,
    });
    expect(r.semestres.length).toBeGreaterThan(1);
    // nada do que foi importado reaparece adiante
    const importadas = new Set(fixada.itens.map((i) => i.codigoMatriz));
    for (const s of r.semestres.slice(1)) {
      for (const d of s.disciplinas) {
        expect(importadas.has(d.codigo), `${d.codigo} foi planejada duas vezes`).toBe(false);
      }
    }
    // e a projeção continua fechando todas as categorias
    for (const q of r.requisitos) {
      expect(q.atendido, `${q.nome} não fechou`).toBe(true);
    }
  });

  it("continua sem choque interno nos semestres que ele mesmo projeta", () => {
    const selecao = selecaoDoPlanejamento();
    const fixada = gradeFixadaDaSelecao("2026-2", oferta20262, selecao, matriz, "Grade A");
    const r = simularFormatura(perfilBase(), matriz, ofertasReais, {
      ritmo: 6,
      semestreInicial: "2026-2",
      gradeFixada: fixada,
    });
    for (const s of r.semestres) {
      const referencia = ofertaReferenciaDoSemestre(s.semestre, ofertasReais)!;
      const sel: SelecaoTurma[] = s.disciplinas
        .filter((d) => d.codigoOferta && d.turma)
        .map((d) => ({ codDisciplina: d.codigoOferta!, codTurma: d.turma! }));
      expect(detectarConflitos(itensDaSelecao(referencia, sel)), s.semestre).toEqual([]);
    }
  });
});

/**
 * As correções do motor valem para todo curso coberto, não só para a BSI: o que
 * muda por curso é a matriz e a oferta, não a regra. A Eng. Comp. é o caso
 * difícil, porque a oferta abre a turma sob código de equivalente e a lista de
 * equivalentes é histórica e larga.
 */
describe("motor em todos os cursos cobertos", () => {
  const cursos = [BSI, ENG_COMP, ENG_COMP_962, ENG_ELETRONICA];
  const ofertasDo = (curso: (typeof cursos)[number]) =>
    Object.keys(curso.ofertas)
      .sort()
      .reverse()
      .map((s) => curso.ofertas[s]);

  for (const curso of cursos) {
    describe(curso.rotuloCurto, () => {
      const ofertasCurso = ofertasDo(curso);

      it("espelha a oferta de mesma paridade em qualquer semestre futuro", () => {
        // Nem todo curso tem as duas paridades importadas — Eng. Eletrônica só
        // tem 2026-2 —, então a expectativa sai da própria lista de ofertas: a
        // mais recente de mesma paridade, ou nada quando não existe nenhuma.
        const maisRecenteDaParidade = (final: string) =>
          Object.keys(curso.ofertas)
            .filter((s) => s.endsWith(final))
            .sort()
            .reverse()[0];

        for (const futuro of ["2027-1", "2027-2", "2028-1", "2028-2"]) {
          const esperado = maisRecenteDaParidade(futuro.slice(-1));
          expect(
            ofertaReferenciaDoSemestre(futuro, ofertasCurso)?.semestre,
            `${curso.rotuloCurto} em ${futuro}`,
          ).toBe(esperado);
        }
      });

      it("não monta semestre em conflito nem repete a mesma turma", () => {
        for (const ritmo of [3, 4, 5, 6, 7, 8]) {
          const r = simularFormatura(null, curso.matriz, ofertasCurso, {
            ritmo,
            semestreInicial: "2026-2",
          });
          for (const s of r.semestres) {
            const referencia = ofertaReferenciaDoSemestre(s.semestre, ofertasCurso)!;
            const sel: SelecaoTurma[] = s.disciplinas
              .filter((d) => d.codigoOferta && d.turma)
              .map((d) => ({ codDisciplina: d.codigoOferta!, codTurma: d.turma! }));

            // Regressão da 844: MA70G e MA70H resolviam para MAT7ED/S01, e
            // `haveriaConflito` lê o par idêntico como "já está na grade" —
            // a grade saía com a mesma turma duas vezes, batendo consigo mesma.
            const chaves = sel.map((x) => `${x.codDisciplina}|${x.codTurma}`);
            expect(new Set(chaves).size, `${curso.rotuloCurto} ritmo ${ritmo} ${s.semestre}`).toBe(
              chaves.length,
            );

            expect(
              detectarConflitos(itensDaSelecao(referencia, sel)).map(
                (c) => `${c.a.disciplina.codigo}×${c.b.disciplina.codigo}`,
              ),
              `${curso.rotuloCurto} ritmo ${ritmo} ${s.semestre}`,
            ).toEqual([]);
          }
        }
      });

      it("valida o número de trilhas exigido sempre que a projeção fecha", () => {
        for (const ritmo of [4, 5, 6, 7, 8]) {
          const r = simularFormatura(null, curso.matriz, ofertasCurso, {
            ritmo,
            semestreInicial: "2026-2",
          });
          if (!r.semestreFormatura) continue; // horizonte estourado: já avisa na tela
          expect(
            r.trilhasFechadas.length,
            `${curso.rotuloCurto} ritmo ${ritmo}: ${r.trilhasFechadas.length} trilhas`,
          ).toBeGreaterThanOrEqual(r.trilhasExigidas);
        }
      });

      it("o total de matérias do cabeçalho bate com a lista do semestre", () => {
        // Regressão: o cabeçalho contava só quem disputa vaga de aula, então um
        // semestre com TCC e duas trilhas anunciava "2 matérias" e listava 3.
        for (const ritmo of [3, 4, 5, 6, 7, 8]) {
          const r = simularFormatura(null, curso.matriz, ofertasCurso, {
            ritmo,
            semestreInicial: "2026-2",
          });
          for (const s of r.semestres) {
            const listadas = s.disciplinas.filter((d) => d.codigo !== "EXTENSAO");
            expect(
              s.materias,
              `${curso.rotuloCurto} ritmo ${ritmo} ${s.semestre}: diz ${s.materias}, lista ${listadas.length}`,
            ).toBe(listadas.length);
            // a atividade extensionista não é matéria e fica fora da conta
            expect(s.materias).toBeLessThanOrEqual(s.disciplinas.length);
            // e o que disputa vaga de aula continua respeitando o ritmo
            expect(s.vagasOcupadas).toBeLessThanOrEqual(ritmo);
          }
        }
      });

      it("nenhum semestre passa do teto de carga horária de matrícula", () => {
        // Regressão: o ritmo limitava a QUANTIDADE de matérias, não o peso delas.
        // Com ritmo 8 a projeção da BSI chegava a 635h num semestre — 7 matérias
        // de sala somando 510h que a UTFPR não deixa matricular.
        //
        // O teto vale só para o que disputa vaga de aula: estágio, atividades
        // complementares, TCC e a atividade extensionista acontecem em paralelo
        // às aulas e não consomem o limite.
        for (const ritmo of [3, 4, 5, 6, 7, 8]) {
          const r = simularFormatura(null, curso.matriz, ofertasCurso, {
            ritmo,
            semestreInicial: "2026-2",
          });
          for (const s of r.semestres) {
            const chSala = s.disciplinas
              .filter((d) => d.ocupaVaga)
              .reduce((a, d) => a + d.horas, 0);
            expect(
              chSala,
              `${curso.rotuloCurto} ritmo ${ritmo} ${s.semestre}: ${chSala}h de sala`,
            ).toBeLessThanOrEqual(TETO_CH_SEMESTRE);
          }
        }
      });

      it("não planeja trilha muito além do piso do bloco optativo", () => {
        // Algum excesso é inevitável por granularidade: fechar uma trilha de 90h
        // com optativas de 60h custa 120h, e em Eng. Eletrônica o piso de uma
        // trilha é 270h montada em pedaços de 45h e 60h.
        //
        // O que NÃO pode acontecer é pagamento duplo — o motor despejar o saldo
        // do bloco numa trilha já validada e depois pagar de novo as validações
        // pendentes. Isso levava uma trilha de piso 90h a 180h na 962. Por isso
        // a checagem forte é POR TRILHA: nenhuma pode passar do próprio piso por
        // mais de uma disciplina dela, que é o arredondamento máximo possível.
        for (const ritmo of [4, 5, 6, 7, 8]) {
          const r = simularFormatura(null, curso.matriz, ofertasCurso, {
            ritmo,
            semestreInicial: "2026-2",
          });
          if (!r.semestreFormatura) continue;

          const horasPorConjunto = new Map<number, number>();
          for (const s of r.semestres) {
            for (const d of s.disciplinas) {
              if (d.categoria !== "trilhas" || d.conjunto == null) continue;
              horasPorConjunto.set(d.conjunto, (horasPorConjunto.get(d.conjunto) ?? 0) + d.horas);
            }
          }
          for (const [conj, horas] of horasPorConjunto) {
            const piso = curso.matriz.conjuntos[String(conj)]?.ch ?? 90;
            const maiorDaTrilha = Math.max(
              ...curso.matriz.disciplinas
                .filter((d) => d.conjunto === conj)
                .map((d) => d.horas.total),
              0,
            );
            expect(
              horas,
              `${curso.rotuloCurto} ritmo ${ritmo}: conjunto ${conj} com ${horas}h para piso ${piso}h`,
            ).toBeLessThanOrEqual(piso + maiorDaTrilha);
          }

          const bloco = r.requisitos.find((q) => q.id === "trilhas")!;
          const excesso = bloco.cumprido + bloco.planejado - bloco.exigido;
          expect(excesso, `${curso.rotuloCurto} ritmo ${ritmo}: +${excesso}h`).toBeLessThanOrEqual(
            60,
          );
        }
      });
    });
  }
});

/**
 * Filtros de exclusão: o aluno diz o que não quer cursar, e o motor obedece —
 * até o ponto em que obedecer impediria a formatura. Aí ele desobedece, mantém
 * o item no plano e explica, em vez de devolver uma projeção que não fecha.
 */
describe("exclusões de matéria, professor e trilha", () => {
  const cursos = [BSI, ENG_COMP, ENG_COMP_962, ENG_ELETRONICA];
  const ofertasDo = (curso: (typeof cursos)[number]) =>
    Object.keys(curso.ofertas)
      .sort()
      .reverse()
      .map((s) => curso.ofertas[s]);

  for (const curso of cursos) {
    describe(curso.rotuloCurto, () => {
      const ofertasCurso = ofertasDo(curso);
      const desc = descricaoDoCurso(curso.matriz);
      const base = () =>
        simularFormatura(null, curso.matriz, ofertasCurso, { ritmo: 6, semestreInicial: "2026-2" });

      const obrigatoria = curso.matriz.disciplinas.find(
        (d) => d.conjunto === null && d.aulas_semanais.total > 0 && !d.codigo.startsWith("ENADE"),
      )!;
      const trilhas = Object.keys(curso.matriz.conjuntos).filter((c) => ehTrilha(desc, c));

      it("sem exclusão nenhuma, não inventa impossibilidade", () => {
        expect(base().exclusoesImpossiveis).toEqual([]);
      });

      it("acusa impossibilidade e mantém a obrigatória excluída no plano", () => {
        const r = simularFormatura(null, curso.matriz, ofertasCurso, {
          ritmo: 6,
          semestreInicial: "2026-2",
          exclusoes: { disciplinas: [{ codigo: obrigatoria.codigo, nome: obrigatoria.nome }] },
        });

        const impossivel = r.exclusoesImpossiveis.find(
          (x) => x.tipo === "disciplina" && x.alvo === obrigatoria.codigo,
        );
        expect(impossivel, "obrigatória excluída não foi acusada").toBeDefined();
        expect(impossivel!.disciplinas).toContain(obrigatoria.codigo);

        // e o principal: ela continua no plano, marcada
        const planejada = r.semestres
          .flatMap((s) => s.disciplinas)
          .find((d) => d.codigo === obrigatoria.codigo);
        expect(planejada, "obrigatória sumiu do plano").toBeDefined();
        expect(planejada!.exclusaoIgnorada?.tipo).toBe("disciplina");
        // a projeção continua fechando
        expect(r.semestreFormatura).toBe(base().semestreFormatura);
      });

      it("excluir todas as trilhas acusa e usa as trilhas mesmo assim", () => {
        const r = simularFormatura(null, curso.matriz, ofertasCurso, {
          ritmo: 6,
          semestreInicial: "2026-2",
          exclusoes: { trilhas },
        });

        // uma impossibilidade por trilha que precisou voltar, nem mais nem menos
        const porTrilha = r.exclusoesImpossiveis.filter((x) => x.tipo === "trilha");
        expect(porTrilha.length).toBe(r.trilhasExigidas);
        expect(r.trilhasFechadas.length).toBeGreaterThanOrEqual(r.trilhasExigidas);

        const marcadas = r.semestres
          .flatMap((s) => s.disciplinas)
          .filter((d) => d.exclusaoIgnorada?.tipo === "trilha");
        expect(marcadas.length, "nenhuma disciplina de trilha foi marcada").toBeGreaterThan(0);
      });

      it("excluir uma única trilha é respeitado em silêncio", () => {
        const r = simularFormatura(null, curso.matriz, ofertasCurso, {
          ritmo: 6,
          semestreInicial: "2026-2",
          exclusoes: { trilhas: [trilhas[0]] },
        });
        expect(r.exclusoesImpossiveis).toEqual([]);
        for (const s of r.semestres) {
          for (const d of s.disciplinas) {
            if (d.categoria !== "trilhas" || d.conjunto === null) continue;
            expect(String(d.conjunto), "usou a trilha excluída").not.toBe(trilhas[0]);
          }
        }
      });

      it("professor sem turma na oferta não muda nada", () => {
        const r = simularFormatura(null, curso.matriz, ofertasCurso, {
          ritmo: 6,
          semestreInicial: "2026-2",
          exclusoes: { professores: ["DOCENTE QUE NAO EXISTE"] },
        });
        expect(r.exclusoesImpossiveis).toEqual([]);
        expect(r.semestres.length).toBe(base().semestres.length);
      });

      it("evita o docente excluído quando há turma alternativa", () => {
        // docente de uma disciplina que tem mais de uma turma: dá para desviar
        const oferta = curso.ofertas["2026-2"];
        const docentesDe = (t: { professores?: string[]; professores_raw?: string }) => {
          const out = new Set<string>(t.professores ?? []);
          for (const p of (t.professores_raw ?? "").split(/[,;/]+/)) {
            if (p.trim()) out.add(p.trim());
          }
          return out;
        };
        const comVariasTurmas = oferta.disciplinas.find(
          (d) => d.turmas.filter((t) => t.horarios?.length).length > 2,
        );
        if (!comVariasTurmas) return;
        const alvo = [...docentesDe(comVariasTurmas.turmas[0])][0];
        if (!alvo) return;

        const r = simularFormatura(null, curso.matriz, ofertasCurso, {
          ritmo: 6,
          semestreInicial: "2026-2",
          exclusoes: { professores: [alvo] },
        });

        // toda turma reservada ou não é do docente, ou está acusada como inevitável
        for (const s of r.semestres) {
          for (const d of s.disciplinas) {
            if (!d.turma || !d.codigoOferta) continue;
            const ref = ofertaReferenciaDoSemestre(s.semestre, ofertasCurso)!;
            const turma = ref.disciplinas
              .find((x) => x.codigo === d.codigoOferta)
              ?.turmas.find((t) => t.codigo === d.turma);
            if (!turma) continue;
            if (docentesDe(turma).has(alvo)) {
              expect(
                d.exclusaoIgnorada?.tipo,
                `${d.codigo} ficou com o docente excluído sem acusar`,
              ).toBe("professor");
            }
          }
        }
      });
    });
  }
});

/**
 * A extensão curricular não era modelada pelo simulador: a projeção fechava
 * ignorando 330h na BSI e 420h na 962, com o aluno reprovando na integralização
 * por um requisito que a tela dizia estar em dia.
 *
 * Ela não vem de um conjunto da matriz. Chega como CHEXT embutido em disciplinas
 * que já contam noutro bloco, e o saldo é cumprido em atividades que o aluno
 * escolhe — daí o placeholder, no mesmo espírito da eletiva livre.
 */
describe("extensão curricular na projeção", () => {
  it("cobra as horas de extensão que o curso exige", () => {
    const perfil = perfilFake({
      extensao: { chTotal: 330, chCursada: 60, chFaltante: 270 },
    });
    const r = simularFormatura(perfil, matriz, ofertas, {
      ritmo: 5,
      semestreInicial: "2026-1",
      horizonte: 12,
    });
    const ext = r.requisitos.find((x) => x.id === "extensao");
    expect(ext).toBeDefined();
    expect(ext).toMatchObject({ exigido: 330, cumprido: 60 });
  });

  it("planeja atividades extensionistas até cobrir o que falta", () => {
    const perfil = perfilFake({
      extensao: { chTotal: 330, chCursada: 0, chFaltante: 330 },
    });
    const r = simularFormatura(perfil, matriz, ofertas, {
      ritmo: 5,
      semestreInicial: "2026-1",
      horizonte: 12,
    });
    const ext = r.requisitos.find((x) => x.id === "extensao")!;
    expect(ext.cumprido + ext.planejado).toBeGreaterThanOrEqual(ext.exigido);

    const atividades = r.semestres
      .flatMap((s) => s.disciplinas)
      .filter((d) => d.categoria === "extensao");
    expect(atividades.length).toBeGreaterThan(0);
    for (const a of atividades) {
      expect(a.codigo).toBe("EXTENSAO");
      expect(a.horas).toBeLessThanOrEqual(90);
      // atividade extensionista não é turma: não disputa vaga com as disciplinas
      expect(a.ocupaVaga).toBe(false);
    }
    // no máximo uma atividade por semestre, para a carga acumular aos poucos
    for (const s of r.semestres) {
      expect(s.disciplinas.filter((d) => d.categoria === "extensao").length).toBeLessThanOrEqual(1);
    }
  });

  it("avisa que o aluno precisa buscar as atividades por conta própria", () => {
    const perfil = perfilFake({
      extensao: { chTotal: 330, chCursada: 0, chFaltante: 330 },
    });
    const r = simularFormatura(perfil, matriz, ofertas, {
      ritmo: 5,
      semestreInicial: "2026-1",
      horizonte: 12,
    });
    const aviso = r.avisos.find((a) => /extensionistas/.test(a));
    expect(aviso, "sem aviso, a tela sugere que basta cursar o que está listado").toBeDefined();
    expect(aviso).toContain("buscar matérias ou projetos extensionistas");
    // o aviso informa quantas horas ainda não têm disciplina para apontar
    expect(aviso).toMatch(/\d+h de extensão/);
  });

  it("não avisa quando nenhuma hora genérica foi necessária", () => {
    const perfil = perfilFake({
      extensao: { chTotal: 330, chCursada: 330, chFaltante: 0 },
    });
    const r = simularFormatura(perfil, matriz, ofertas, {
      ritmo: 5,
      semestreInicial: "2026-1",
      horizonte: 12,
    });
    expect(r.avisos.find((a) => /extensionistas/.test(a))).toBeUndefined();
  });

  it("não cobra extensão de quem já cumpriu tudo", () => {
    const perfil = perfilFake({
      extensao: { chTotal: 330, chCursada: 330, chFaltante: 0 },
    });
    const r = simularFormatura(perfil, matriz, ofertas, {
      ritmo: 5,
      semestreInicial: "2026-1",
      horizonte: 12,
    });
    expect(r.requisitos.find((x) => x.id === "extensao")).toMatchObject({
      faltante: 0,
      atendido: true,
    });
    const atividades = r.semestres
      .flatMap((s) => s.disciplinas)
      .filter((d) => d.categoria === "extensao");
    expect(atividades).toHaveLength(0);
  });

  it("some da lista no curso que não exige extensão", () => {
    // a 844 declara cargas.extensao = 0
    const semExtensao = { ...matriz, cargas: { ...matriz.cargas, extensao: 0 } } as Matriz;
    const r = simularFormatura(perfilFake(), semExtensao, ofertas, {
      ritmo: 5,
      semestreInicial: "2026-1",
      horizonte: 12,
    });
    expect(r.requisitos.find((x) => x.id === "extensao")).toBeUndefined();
  });
});
