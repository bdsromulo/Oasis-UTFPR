// TASK-45 — pré-requisito liberado por reprovação com média >= 4,0.
//
// A regra da UTFPR libera a disciplina subsequente para quem reprovou na
// pré-requisito POR NOTA com média 4,0 ou acima. Reprovação por frequência não
// libera, por alta que tenha sido a média.
import { describe, expect, it } from "vitest";
import { criarMapaIdentidade } from "../src/domain/motor/identidade";
import { cumpre, listarElegiveis } from "../src/domain/motor/elegiveis";
import { liberadoPorDesempenho } from "../src/domain/motor/prerequisitos";
import type {
  DisciplinaCursada,
  Matriz,
  OfertaSemestre,
  PerfilAluno,
} from "../src/domain/tipos";

const matriz: Matriz = {
  matriz: 981,
  curso: "Sistemas de Informação",
  campus: "Curitiba",
  cargas: {
    obrigatorias: 180,
    optativas: 0,
    extensao: 0,
    eletiva: 0,
    soma: 180,
    soma_sem_ext: 180,
    chext_disc_obrigatorias: 0,
    chext_disc_optativas: 0,
    ch_total_ppc: 180,
  },
  conjuntos: {},
  eletiva: { ch: 0, periodo_inicial: 1, periodo_final: 8, prereq_periodo: 1 },
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
      // equivalente declarado: a liberação tem de valer por equivalência, como
      // todo o resto do domínio
      equivalentes: [{ codigo: "CSF61", cht: 60, grupo: null }],
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
      prerequisitos: ["IF62C", "Período:3"],
      equivalentes: [],
    },
  ],
};

const mapa = criarMapaIdentidade(matriz);

function cursada(over: Partial<DisciplinaCursada> = {}): DisciplinaCursada {
  return {
    codigo: "IF61C",
    nome: "Fundamentos de Programação 1",
    situacao: "reprovado",
    origem: "obrigatoria",
    media: 5,
    frequencia: 85,
    cht: 60,
    ano: 2025,
    semestre: 1,
    ...over,
  };
}

/** Perfil sintético: nada de dado pessoal real entra no repositório. */
function perfil(cursadas: DisciplinaCursada[], periodo = 3): PerfilAluno {
  return {
    nome: "FULANO DE TAL",
    matricula: "0000000",
    curso: "Sistemas de Informação",
    matriz: 981,
    periodo,
    coefAbsoluto: 0.6,
    coefNormalizado: 0.5,
    ingresso: "2024/1",
    cursadas,
    aprovadas: new Set(
      cursadas.filter((c) => c.situacao === "aprovado").map((c) => c.codigo),
    ),
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

describe("liberadoPorDesempenho — a regra em si", () => {
  it("libera com média 5,0 e frequência suficiente", () => {
    const p = perfil([cursada({ media: 5, frequencia: 85 })]);
    expect(liberadoPorDesempenho("IF61C", p, mapa)).toBe(true);
  });

  it("libera com média exatamente 4,0 — o limiar é inclusivo", () => {
    const p = perfil([cursada({ media: 4, frequencia: 80 })]);
    expect(liberadoPorDesempenho("IF61C", p, mapa)).toBe(true);
  });

  it("não libera com média 3,9", () => {
    const p = perfil([cursada({ media: 3.9, frequencia: 90 })]);
    expect(liberadoPorDesempenho("IF61C", p, mapa)).toBe(false);
  });

  it("não libera reprovação por frequência, ainda que a média seja alta", () => {
    const p = perfil([cursada({ media: 8.5, frequencia: 40 })]);
    expect(liberadoPorDesempenho("IF61C", p, mapa)).toBe(false);
  });

  it("libera quando a frequência é nula e a média basta", () => {
    // Sem o campo não há como separar reprovação por nota de reprovação por
    // falta; a assunção declarada na spec é tratar como reprovação por nota.
    const p = perfil([cursada({ media: 6, frequencia: null })]);
    expect(liberadoPorDesempenho("IF61C", p, mapa)).toBe(true);
  });

  it("não libera sem média registrada", () => {
    const p = perfil([cursada({ media: null, frequencia: 90 })]);
    expect(liberadoPorDesempenho("IF61C", p, mapa)).toBe(false);
  });

  it("ignora situação que não seja reprovação", () => {
    for (const situacao of ["cursando", "cancelado"] as const) {
      const p = perfil([cursada({ situacao, media: 6, frequencia: 90 })]);
      expect(liberadoPorDesempenho("IF61C", p, mapa)).toBe(false);
    }
  });

  it("libera pelo código equivalente declarado na matriz", () => {
    const p = perfil([cursada({ codigo: "CSF61", media: 5.5, frequencia: 90 })]);
    expect(liberadoPorDesempenho("IF61C", p, mapa)).toBe(true);
  });

  it("é falsa sem perfil (modo livre)", () => {
    expect(liberadoPorDesempenho("IF61C", null, mapa)).toBe(false);
  });
});

describe("a regra não credita carga horária", () => {
  it("reprovada com média 5,0 continua não cumprindo a disciplina", () => {
    const p = perfil([cursada({ media: 5, frequencia: 85 })]);
    // esta é a fronteira que protege situacao.ts, progressoGrade.ts e o cálculo
    // de carga do simulador: destravar a seguinte não integraliza a reprovada
    expect(cumpre("IF61C", p, mapa)).toBe(false);
  });
});

const oferta: OfertaSemestre = {
  curso: "Sistemas de Informação",
  semestre: "2026-2",
  fonte: "teste",
  disciplinas: [
    {
      codigo: "IF62C",
      nome: "Fundamentos de Programação 2",
      aulas_semanais_presenciais: 4,
      aulas_semanais_assincronas: 0,
      horas_semestrais_extensionistas: 0,
      turmas: [
        {
          codigo: "S71",
          enquadramento: "Presencial",
          vagas_total: 40,
          vagas_calouros: 0,
          reserva: "",
          prioridade_cursos: [],
          horarios: [
            { dia: 2, turno: "T", aula: 1, sala: "A-101", sede: "Centro" },
            { dia: 2, turno: "T", aula: 2, sala: "A-101", sede: "Centro" },
          ],
          professores_raw: "PROFESSOR DE TESTE",
          optativa_matrizes: [],
          optativa: false,
        },
      ],
    },
  ],
};

describe("integração com listarElegiveis", () => {
  const de = (p: PerfilAluno) =>
    listarElegiveis(p, matriz, oferta).find((e) => e.disciplina.codigo === "IF62C")!;

  it("a dependente deixa de acusar pré-requisito pendente", () => {
    const e = de(perfil([cursada({ media: 5, frequencia: 85 })]));
    expect(e.motivoBloqueio).toBeNull();
  });

  it("segue pendente quando a reprovação foi por frequência", () => {
    const e = de(perfil([cursada({ media: 8.5, frequencia: 40 })]));
    expect(e.motivoBloqueio).toContain("IF61C");
  });

  it("segue pendente quando a média não alcança 4,0", () => {
    const e = de(perfil([cursada({ media: 2, frequencia: 90 })]));
    expect(e.motivoBloqueio).toContain("IF61C");
  });

  it("a exigência de período continua valendo por conta própria", () => {
    // IF63C pede IF62C e Período:3 — a regra do 4 não tem nada a dizer sobre a
    // segunda exigência, e ela precisa continuar bloqueando sozinha
    const p = perfil([cursada({ codigo: "IF62C", media: 5, frequencia: 85 })], 1);
    const e = listarElegiveis(p, matriz, oferta).find(
      (x) => x.disciplina.codigo === "IF63C",
    )!;
    expect(e.motivoBloqueio).toContain("3º período");
    expect(e.motivoBloqueio).not.toContain("IF62C");
  });
});
