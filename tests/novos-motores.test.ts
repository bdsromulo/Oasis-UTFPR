import { describe, expect, test } from "vitest";
import type { Matriz, OfertaSemestre } from "../src/domain/tipos";
import { obterSazonalidade, rotuloSazonalidade, verificarDisponibilidadeNoSemestre } from "../src/domain/motor/sazonalidade";
import { formatarSemestreEstendido, proximoSemestre, simularTrajetoria } from "../src/domain/motor/simuladorFormatura";
import { codificarGradeParaShare, decodificarGradeDeShare } from "../src/domain/social/compartilhamento";
import { calcularMatchSocial } from "../src/domain/social/comparador";

const matrizMock: Matriz = {
  matriz: 981,
  curso: "Sistemas de Informação",
  campus: "Curitiba",
  cargas: {
    obrigatorias: 2400,
    optativas: 240,
    extensao: 300,
    eletiva: 120,
    soma: 3060,
    soma_sem_ext: 2760,
    chext_disc_obrigatorias: 0,
    chext_disc_optativas: 0,
    ch_total_ppc: 3060,
  },
  conjuntos: {},
  eletiva: { ch: 120, periodo_inicial: 1, periodo_final: 8, prereq_periodo: 1 },
  disciplinas: [
    {
      codigo: "IF61C",
      nome: "Fundamentos de Programação 1",
      periodo: 1,
      conjunto: null,
      modelo: "Padrão",
      aulas_semanais: { teoricas: 2, praticas: 2, total: 4, aps: 0, apcc: 0 },
      horas: { ad: 60, chext: 0, chead: 0, total: 60 },
      prerequisitos: [],
      equivalentes: [],
    },
    {
      codigo: "IF62C",
      nome: "Fundamentos de Programação 2",
      periodo: 2,
      conjunto: null,
      modelo: "Padrão",
      aulas_semanais: { teoricas: 2, praticas: 2, total: 4, aps: 0, apcc: 0 },
      horas: { ad: 60, chext: 0, chead: 0, total: 60 },
      prerequisitos: ["IF61C"],
      equivalentes: [],
    },
    {
      codigo: "IF63C",
      nome: "Estrutura de Dados 1",
      periodo: 3,
      conjunto: null,
      modelo: "Padrão",
      aulas_semanais: { teoricas: 2, praticas: 2, total: 4, aps: 0, apcc: 0 },
      horas: { ad: 60, chext: 0, chead: 0, total: 60 },
      prerequisitos: ["IF62C"],
      equivalentes: [],
    },
    {
      codigo: "IF64C",
      nome: "Estrutura de Dados 2",
      periodo: 4,
      conjunto: null,
      modelo: "Padrão",
      aulas_semanais: { teoricas: 2, praticas: 2, total: 4, aps: 0, apcc: 0 },
      horas: { ad: 60, chext: 0, chead: 0, total: 60 },
      prerequisitos: ["IF63C"],
      equivalentes: [],
    },
    {
      codigo: "ICSH41",
      nome: "Avaliação em IHC (Especial)",
      periodo: 5,
      conjunto: null,
      modelo: "Padrão",
      aulas_semanais: { teoricas: 2, praticas: 2, total: 4, aps: 0, apcc: 0 },
      horas: { ad: 60, chext: 0, chead: 0, total: 60 },
      prerequisitos: [],
      equivalentes: [],
    },
  ],
};

const ofertaMock: OfertaSemestre = {
  curso: "Sistemas de Informação",
  semestre: "2026-1",
  fonte: "Mock",
  disciplinas: [
    {
      codigo: "IF63C",
      nome: "Estrutura de Dados 1",
      aulas_semanais_presenciais: 4,
      aulas_semanais_assincronas: 0,
      horas_semestrais_extensionistas: 0,
      turmas: [
        {
          codigo: "S11",
          enquadramento: "Regular",
          vagas_total: 40,
          vagas_calouros: 0,
          reserva: "",
          prioridade_cursos: [],
          horarios: [{ dia: 2, turno: "N", aula: 1, sala: "E101", sede: "Neoville" }],
          professores_raw: "Prof A",
          optativa_matrizes: [],
          optativa: false,
        },
        {
          codigo: "S12",
          enquadramento: "Regular",
          vagas_total: 40,
          vagas_calouros: 0,
          reserva: "",
          prioridade_cursos: [],
          horarios: [{ dia: 3, turno: "N", aula: 1, sala: "E102", sede: "Neoville" }],
          professores_raw: "Prof B",
          optativa_matrizes: [],
          optativa: false,
        },
      ],
    },
  ],
};

describe("Módulo de Sazonalidade", () => {
  test("identifica disciplinas de oferta contínua como AMBOS", () => {
    const disc = matrizMock.disciplinas[0]!;
    expect(obterSazonalidade(disc)).toBe("AMBOS");
    expect(verificarDisponibilidadeNoSemestre(disc, "2026-1")).toBe(true);
    expect(verificarDisponibilidadeNoSemestre(disc, "2026-2")).toBe(true);
  });

  test("formata rótulo de sazonalidade corretamente", () => {
    expect(rotuloSazonalidade("AMBOS")).toContain("Todo Semestre");
    expect(rotuloSazonalidade("IMPAR")).toContain(".1");
  });
});

describe("Simulador de Formatura", () => {
  test("avança corretamente os semestres", () => {
    expect(proximoSemestre("2026-1")).toBe("2026-2");
    expect(proximoSemestre("2026-2")).toBe("2027-1");
  });

  test("formata nome estendido do semestre", () => {
    expect(formatarSemestreEstendido("2028-2")).toContain("2º Semestre de 2028");
  });

  test("simula trajetória respeitando pré-requisitos em cadeia", () => {
    const resultado = simularTrajetoria(null, matrizMock, 180, "2026-1");
    expect(resultado.semestresProjetados.length).toBeGreaterThan(0);
    expect(resultado.totalSemestresRestantes).toBeGreaterThan(0);
    expect(resultado.dataEstimadaFormatura).toBeTypeOf("string");
  });
});

describe("Compartilhamento e Comparador Social (Oásis Match)", () => {
  test("codifica e decodifica grade em hash Oásis", () => {
    const selecao = [{ codDisciplina: "IF63C", codTurma: "S11" }];
    const hash = codificarGradeParaShare(null, selecao, "Rômulo");
    expect(hash).toBeTruthy();

    const decodificado = decodificarGradeDeShare(hash);
    expect(decodificado?.nome).toBe("Rômulo");
    expect(decodificado?.selecao[0]?.d).toBe("IF63C");
    expect(decodificado?.selecao[0]?.t).toBe("S11");
  });

  test("identifica Match Perfeito quando turmas são idênticas", () => {
    const selecaoA = [{ codDisciplina: "IF63C", codTurma: "S11" }];
    const amigoB = {
      v: 1,
      nome: "Amigo",
      curso: "Sistemas de Informação",
      aprovadas: [],
      selecao: [{ d: "IF63C", t: "S11" }],
    };

    const comp = calcularMatchSocial(null, selecaoA, amigoB, ofertaMock, matrizMock);
    expect(comp.matchPerfeito.length).toBe(1);
    expect(comp.matchPerfeito[0]?.disciplina.codigo).toBe("IF63C");
  });

  test("identifica Oportunidade de Ouro quando registram a mesma matéria na prévia com turmas diferentes", () => {
    const selecaoA = [{ codDisciplina: "IF63C", codTurma: "S11" }];
    // Amigo B selecionou S12 para a mesma disciplina
    const amigoB = {
      v: 1,
      nome: "Amigo",
      curso: "Sistemas de Informação",
      aprovadas: [],
      selecao: [{ d: "IF63C", t: "S12" }],
    };

    const comp = calcularMatchSocial(null, selecaoA, amigoB, ofertaMock, matrizMock);
    expect(comp.oportunidadesDeOuro.length).toBe(1);
    expect(comp.oportunidadesDeOuro[0]?.disciplina.codigo).toBe("IF63C");
    expect(comp.oportunidadesDeOuro[0]?.turmaAtualA).toBe("S11");
    expect(comp.oportunidadesDeOuro[0]?.turmaAtualB).toBe("S12");
    expect(comp.oportunidadesDeOuro[0]?.turmasSugeridasLivreParaAmbos.length).toBeGreaterThan(0);
  });
});
