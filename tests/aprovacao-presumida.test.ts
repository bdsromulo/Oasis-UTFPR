import { describe, expect, it } from "vitest";
import matrizJson from "../data/matriz-981.json";
import turmas20261 from "../data/turmas/2026-1.json";
import turmas20262 from "../data/turmas/2026-2.json";
import { matriculadasPresumiveis, perfilComPresuncao } from "../src/domain/motor/presuncao";
import { cumpre, listarElegiveis } from "../src/domain/motor/elegiveis";
import { criarMapaIdentidade } from "../src/domain/motor/identidade";
import { simularFormatura } from "../src/domain/motor/simuladorFormatura";
import { progressoGlobalDoCurso } from "../src/domain/motor/situacao";
import { SEMESTRE_CORRENTE } from "../src/domain/semestres";
import type { Matriz, OfertaSemestre, PerfilAluno } from "../src/domain/tipos";

/**
 * Aprovação presumida: a matéria que o aluno está cursando conta como aprovada
 * no planejamento do próximo semestre.
 *
 * As duas invariantes que sustentam tudo: a presunção acende o pré-requisito
 * (senão o planejamento fica travado no que já vai estar cumprido) E move a
 * carga horária (senão o simulador para de planejar a matéria mas continua
 * cobrando as horas dela — "você forma em 2028.2, e eis 0 disciplinas a cursar").
 */

const matriz = matrizJson as unknown as Matriz;
const oferta20262 = turmas20262 as unknown as OfertaSemestre;
const ofertas = [turmas20262, turmas20261] as unknown as OfertaSemestre[];

/** ICSE30 Engenharia de Software é pré-requisito de ICSE40 na 981. */
const EM_CURSO = "ICSE30";
const SUBSEQUENTE = "ICSE40";

function perfilFake(over: Partial<PerfilAluno> = {}): PerfilAluno {
  return {
    nome: "FULANO DE TAL",
    matricula: "0000000",
    curso: "BSI",
    matriz: 981,
    periodo: 5,
    coefAbsoluto: 0.8,
    coefNormalizado: 0.75,
    ingresso: "2023/1",
    cursadas: [],
    aprovadas: new Set<string>(),
    matriculadas: [
      {
        codigo: EM_CURSO,
        nome: "Engenharia De Software",
        turma: "S73",
        situacao: "Cursando",
        semestre: SEMESTRE_CORRENTE,
      },
    ],
    obrigatoriasFaltantes: [],
    dependencias: [],
    resumoConjuntos: [],
    eletivas: { chCursadaAprovada: 105, chFaltante: 0, chValidada: 105, chTotal: 105 },
    extensao: { chTotal: 330, chCursada: 0, chFaltante: 330 },
    resumoGeral: {
      obrigatorias: { total: 2005, aprovada: 0, faltante: 2005, cursada: 0, aprovadaTotal: 0 },
      optativas: { total: 840, aprovada: 0, faltante: 840 },
      eletivas: { total: 105, aprovada: 105, faltante: 0 },
    },
    avisos: [],
    ...over,
  };
}

const horasDe = (codigo: string) =>
  matriz.disciplinas.find((d) => d.codigo === codigo)!.horas.total;

describe("quais matérias podem ser presumidas", () => {
  it("lista as em curso e ignora a que o próprio PDF já deu por aprovada", () => {
    const perfil = perfilFake({ aprovadas: new Set([EM_CURSO]) });

    expect(matriculadasPresumiveis(perfil)).toEqual([]);
    expect(matriculadasPresumiveis(perfilFake()).map((m) => m.codigo)).toEqual([EM_CURSO]);
  });
});

describe("efeito da presunção sobre pré-requisito e elegibilidade", () => {
  const perfil = perfilFake();
  const presumido = perfilComPresuncao(perfil, [EM_CURSO], matriz)!;

  const mapa = criarMapaIdentidade(matriz);

  it("acende o pré-requisito da subsequente", () => {
    expect(cumpre(EM_CURSO, perfil, mapa)).toBe(false);
    expect(cumpre(EM_CURSO, presumido, mapa)).toBe(true);
  });

  it("libera a disciplina que dependia dela", () => {
    const dependente = matriz.disciplinas.find((d) => d.codigo === SUBSEQUENTE)!;
    expect(dependente.prerequisitos).toContain(EM_CURSO);

    const motivo = (p: PerfilAluno) =>
      listarElegiveis(p, matriz, oferta20262).find((e) => e.disciplina.codigo === SUBSEQUENTE)
        ?.motivoBloqueio ?? null;

    expect(motivo(perfil)).toContain("Engenharia De Software");
    expect(motivo(presumido)).toBeNull();
  });

  it("some da lista de elegíveis: já foi cursada", () => {
    const antes = listarElegiveis(perfil, matriz, oferta20262);
    const depois = listarElegiveis(presumido, matriz, oferta20262);

    expect(antes.some((e) => e.disciplina.codigo === EM_CURSO)).toBe(true);
    expect(depois.some((e) => e.disciplina.codigo === EM_CURSO)).toBe(false);
  });

  it("não muda o período do aluno: isso é estado de matrícula do Portal", () => {
    expect(presumido.periodo).toBe(perfil.periodo);
  });
});

describe("efeito da presunção sobre a carga horária", () => {
  const perfil = perfilFake();
  const presumido = perfilComPresuncao(perfil, [EM_CURSO], matriz)!;
  const horas = horasDe(EM_CURSO);

  it("soma exatamente a carga da disciplina no bloco de obrigatórias", () => {
    expect(presumido.resumoGeral!.obrigatorias.aprovada).toBe(
      perfil.resumoGeral!.obrigatorias.aprovada + horas,
    );
    expect(presumido.resumoGeral!.obrigatorias.faltante).toBe(
      perfil.resumoGeral!.obrigatorias.faltante - horas,
    );
  });

  it("move o progresso global na mesma medida", () => {
    expect(progressoGlobalDoCurso(presumido, matriz).cumprido).toBe(
      progressoGlobalDoCurso(perfil, matriz).cumprido + horas,
    );
  });

  it("anexa uma cursada sintética marcada como presumida", () => {
    const c = presumido.cursadas.find((x) => x.codigo === EM_CURSO)!;

    expect(c.situacao).toBe("aprovado");
    expect(c.presumida).toBe(true);
    expect(c.cht).toBe(horas);
  });
});

describe("reversibilidade e ausência de efeito colateral", () => {
  it("não muta o perfil original", () => {
    const perfil = perfilFake();
    const aprovadasAntes = perfil.aprovadas.size;
    const cursadasAntes = perfil.cursadas.length;
    const obrigatoriasAntes = perfil.resumoGeral!.obrigatorias.aprovada;

    perfilComPresuncao(perfil, [EM_CURSO], matriz);

    expect(perfil.aprovadas.size).toBe(aprovadasAntes);
    expect(perfil.cursadas.length).toBe(cursadasAntes);
    expect(perfil.resumoGeral!.obrigatorias.aprovada).toBe(obrigatoriasAntes);
  });

  it("desmarcar devolve a pendência", () => {
    const perfil = perfilFake();
    expect(perfilComPresuncao(perfil, [], matriz)).toBe(perfil);
  });

  it("preserva a lista de matriculadas, que é a fonte do painel", () => {
    const presumido = perfilComPresuncao(perfilFake(), [EM_CURSO], matriz)!;
    expect(presumido.matriculadas.map((m) => m.codigo)).toEqual([EM_CURSO]);
  });

  it("não conta duas vezes o que o próprio PDF já aprovou", () => {
    // o parser promove a matriculada com situação "Aprovado" para `aprovadas`
    const perfil = perfilFake({ aprovadas: new Set([EM_CURSO]) });
    const presumido = perfilComPresuncao(perfil, [EM_CURSO], matriz)!;

    expect(presumido).toBe(perfil);
    expect(presumido.resumoGeral!.obrigatorias.aprovada).toBe(0);
  });
});

describe("a projeção de formatura enxerga a presunção", () => {
  const perfil = perfilFake();
  const presumido = perfilComPresuncao(perfil, [EM_CURSO], matriz)!;

  const projetar = (p: PerfilAluno) =>
    simularFormatura(p, matriz, ofertas, { ritmo: 5, semestreInicial: "2027-1" });

  it("a matéria presumida sai do plano", () => {
    const codigosNoPlano = (p: PerfilAluno) =>
      projetar(p)
        .semestres.flatMap((s) => s.disciplinas)
        .map((d) => d.codigo);

    expect(codigosNoPlano(perfil)).toContain(EM_CURSO);
    expect(codigosNoPlano(presumido)).not.toContain(EM_CURSO);
  });

  it("as horas dela deixam de ser cobradas", () => {
    // é aqui que a incoerência apareceria: parar de planejar a matéria sem
    // mover a carga deixaria a projeção pedindo horas de algo que ela mesma
    // já deu por feito
    expect(projetar(presumido).horasRestantes).toBe(
      projetar(perfil).horasRestantes - horasDe(EM_CURSO),
    );
  });
});

describe("extensão embutida na disciplina presumida", () => {
  it("abate a CHEXT da conta de projeto próprio", () => {
    const extensionista = matriz.disciplinas.find((d) => d.horas.chext > 0)!;
    const perfil = perfilFake({
      matriculadas: [
        {
          codigo: extensionista.codigo,
          nome: extensionista.nome,
          turma: "S73",
          situacao: "Cursando",
          semestre: SEMESTRE_CORRENTE,
        },
      ],
    });
    const presumido = perfilComPresuncao(perfil, [extensionista.codigo], matriz)!;

    expect(presumido.extensao!.chCursada).toBe(
      perfil.extensao!.chCursada + extensionista.horas.chext,
    );
    expect(presumido.extensao!.chFaltante).toBe(
      perfil.extensao!.chFaltante - extensionista.horas.chext,
    );
  });
});
