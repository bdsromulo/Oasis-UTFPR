// Camada de avaliações da comunidade (Estrategia.md §6). Nenhum dado pessoal:
// os docentes fictícios vêm de ofertas montadas no próprio teste, e o acervo real
// (data/reviews.json) só é conferido quanto ao formato.
import { describe, it, expect } from "vitest";
import { construirRoster, docentesDaTurma, slugProfessor } from "../src/domain/reviews/professores";
import { agregar, criarConsulta, publicaveis, LIMIAR_ESTATISTICA } from "../src/domain/reviews/acervo";
import { TAGS, DESCRICAO_TAG, type Review } from "../src/domain/reviews/tipos";
import { criarMapaIdentidade } from "../src/domain/motor/identidade";
import { BSI, ENG_COMP, CURSOS } from "../src/domain/dadosCurso";
import type { DadosCurso } from "../src/domain/dadosCurso";
import type { Matriz, Turma } from "../src/domain/tipos";
import acervoJson from "../data/reviews.json";

function turma(parcial: Partial<Turma>): Turma {
  return {
    codigo: "S71",
    enquadramento: "Presencial",
    vagas_total: 30,
    vagas_calouros: 0,
    reserva: "Aberta",
    prioridade_cursos: [],
    horarios: [],
    professores_raw: "",
    optativa_matrizes: [],
    optativa: false,
    ...parcial,
  };
}

function cursoFicticio(id: string, disciplinas: { codigo: string; turmas: Turma[] }[]): DadosCurso {
  return {
    id,
    rotulo: id,
    rotuloCurto: id,
    matriz: { matriz: 0, disciplinas: [] } as unknown as Matriz,
    ofertas: {
      "2026-1": {
        curso: id,
        semestre: "2026-1",
        fonte: "teste",
        disciplinas: disciplinas.map((d) => ({
          codigo: d.codigo,
          nome: d.codigo,
          aulas_semanais_presenciais: 4,
          aulas_semanais_assincronas: 0,
          horas_semestrais_extensionistas: 0,
          turmas: d.turmas,
        })),
      },
    },
    semestrePadrao: "2026-1",
    semestresPreMatricula: [],
  } satisfies DadosCurso;
}

function review(parcial: Partial<Review>): Review {
  return {
    id: Math.random().toString(36).slice(2),
    professorId: "fulano-de-tal",
    codigo: "ICSD20",
    semestre: "2025/2",
    situacao: "aprovado",
    autor: "Alguem Ficticio",
    geral: 4,
    didatica: 4,
    dificuldade: 3,
    cargaTrabalho: 3,
    avaliacao: "provas",
    tags: [],
    comentario: "",
    ...parcial,
  };
}

describe("docentes da turma", () => {
  it("lê professores_raw, que é o campo completo da fonte", () => {
    expect(docentesDaTurma(turma({ professores_raw: "Fulano De Tal" }))).toEqual(["Fulano De Tal"]);
  });

  it("separa múltiplos docentes por vírgula", () => {
    const t = turma({ professores_raw: "Fulano De Tal, Sicrano Da Silva" });
    expect(docentesDaTurma(t)).toEqual(["Fulano De Tal", "Sicrano Da Silva"]);
  });

  it("cai para o array `professores` só quando raw está vazio", () => {
    const t = turma({ professores_raw: "", professores: ["Beltrano Souza"] });
    expect(docentesDaTurma(t)).toEqual(["Beltrano Souza"]);
  });

  it("turma sem docente algum não quebra", () => {
    expect(docentesDaTurma(turma({}))).toEqual([]);
  });
});

describe("slug de professor", () => {
  it("normaliza acento, caixa e pontuação", () => {
    expect(slugProfessor("José Antônio D'Ávila")).toBe("jose-antonio-d-avila");
  });

  it("une grafias que diferem só por acento ou caixa", () => {
    expect(slugProfessor("MARIA DA CONCEIÇÃO")).toBe(slugProfessor("Maria da Conceicao"));
  });
});

describe("roster global entre cursos", () => {
  // o mesmo docente dá a mesma disciplina em dois cursos: precisa ser UMA entrada
  const cursoA = cursoFicticio("curso-a", [
    { codigo: "ICSD20", turmas: [turma({ professores_raw: "Fulano De Tal" })] },
  ]);
  const cursoB = cursoFicticio("curso-b", [
    { codigo: "ICSD20", turmas: [turma({ codigo: "S99", professores_raw: "Fulano De Tal, Sicrano Da Silva" })] },
    { codigo: "CSF13", turmas: [turma({ professores_raw: "Beltrano Souza" })] },
  ]);
  const roster = construirRoster([cursoA, cursoB]);

  it("o docente compartilhado aparece uma única vez", () => {
    expect(roster.docentes.filter((d) => d.id === "fulano-de-tal").length).toBe(1);
  });

  it("o elenco da disciplina une os docentes dos dois cursos", () => {
    expect(roster.elencoDaDisciplina("ICSD20").map((d) => d.id).sort()).toEqual([
      "fulano-de-tal",
      "sicrano-da-silva",
    ]);
  });

  it("registra todas as disciplinas em que o docente aparece", () => {
    expect(roster.porId("fulano-de-tal")?.disciplinas).toEqual(["ICSD20"]);
    expect(roster.porId("beltrano-souza")?.disciplinas).toEqual(["CSF13"]);
  });

  it("disciplina sem elenco devolve lista vazia, não quebra", () => {
    expect(roster.elencoDaDisciplina("NAOEXISTE")).toEqual([]);
  });
});

describe("roster sobre as ofertas reais", () => {
  const rosterBSI = construirRoster([BSI]);
  const rosterGlobal = construirRoster(CURSOS);

  it("o elenco global é maior que o de um curso só", () => {
    // é o que derruba a falha de seleção de 17% para 11% (§6.4)
    expect(rosterGlobal.docentes.length).toBeGreaterThan(rosterBSI.docentes.length);
  });

  it("docentes reais têm nome e slug não vazios", () => {
    for (const d of rosterGlobal.docentes) {
      expect(d.nome.trim(), `docente sem nome: ${d.id}`).not.toBe("");
      expect(d.id, `docente sem slug: ${d.nome}`).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("disciplina compartilhada entre cursos tem elenco em ambos", () => {
    // ICSHX0 é ofertada com prioridade para Sist. de Informação e Eng. de Computação
    expect(rosterGlobal.elencoDaDisciplina("ICSHX0").length).toBeGreaterThan(0);
    expect(construirRoster([ENG_COMP]).docentes.length).toBeGreaterThan(0);
  });
});

describe("agregação", () => {
  it("abaixo do limiar, comentários aparecem mas médias não", () => {
    const ag = agregar([review({ geral: 5 })]);
    expect(ag.n).toBe(1);
    expect(ag.estatisticaExibivel).toBe(false);
    expect(ag.geral).toBeNull();
    expect(ag.reviews.length).toBe(1); // o comentário continua acessível
  });

  it("a partir do limiar, calcula as médias", () => {
    const rs = Array.from({ length: LIMIAR_ESTATISTICA }, () => review({ geral: 4, didatica: 5 }));
    const ag = agregar(rs);
    expect(ag.estatisticaExibivel).toBe(true);
    expect(ag.geral).toBe(4);
    expect(ag.didatica).toBe(5);
  });

  it("conta tags por frequência, sem contar repetição dentro do mesmo registro", () => {
    const ag = agregar([
      review({ tags: ["corrige-rapido", "corrige-rapido", "acessivel"] }),
      review({ tags: ["corrige-rapido"] }),
    ]);
    expect(ag.tags[0]).toEqual({ tag: "corrige-rapido", n: 2 });
    expect(ag.tags.find((t) => t.tag === "acessivel")?.n).toBe(1);
  });

  it("ordena as avaliações da mais recente para a mais antiga", () => {
    const ag = agregar([
      review({ semestre: "2024/1" }),
      review({ semestre: "2026/1" }),
      review({ semestre: "2025/2" }),
    ]);
    expect(ag.reviews.map((r) => r.semestre)).toEqual(["2026/1", "2025/2", "2024/1"]);
  });

  it("conjunto vazio não quebra", () => {
    const ag = agregar([]);
    expect(ag.n).toBe(0);
    expect(ag.geral).toBeNull();
    expect(ag.tags).toEqual([]);
  });
});

describe("consulta e visibilidade", () => {
  const mapa = criarMapaIdentidade(BSI.matriz);

  it("avaliação pendente de roster não é publicável", () => {
    const pendente = review({ professorId: undefined, professorTexto: "Docente Fora Do Elenco" });
    expect(publicaveis([pendente, review({})]).length).toBe(1);
    expect(criarConsulta([pendente], mapa).daDisciplina("ICSD20")).toEqual([]);
  });

  it("filtra por disciplina e por par professor + disciplina", () => {
    const reviews = [
      review({ codigo: "ICSD20", professorId: "fulano-de-tal" }),
      review({ codigo: "ICSD20", professorId: "sicrano-da-silva" }),
      review({ codigo: "ICSF13", professorId: "fulano-de-tal" }),
    ];
    const c = criarConsulta(reviews, mapa);
    expect(c.daDisciplina("ICSD20").length).toBe(2);
    expect(c.doProfessor("fulano-de-tal").length).toBe(2);
    expect(c.doParProfessorDisciplina("fulano-de-tal", "ICSD20").length).toBe(1);
    expect(c.professoresAvaliados("ICSD20").sort()).toEqual(["fulano-de-tal", "sicrano-da-silva"]);
  });

  it("uma avaliação submetida sob código equivalente aparece para o código canônico", () => {
    // o acervo é único: quem lê resolve pela identidade do PRÓPRIO curso (§6.10)
    const comEquivalente = BSI.matriz.disciplinas.find((d) => d.equivalentes.length > 0);
    expect(comEquivalente, "a matriz precisa ter ao menos uma equivalência").toBeDefined();
    const canonico = comEquivalente!.codigo;
    const equivalente = comEquivalente!.equivalentes[0].codigo;

    const c = criarConsulta([review({ codigo: equivalente })], mapa);
    expect(c.daDisciplina(canonico).length).toBe(1);
    expect(c.daDisciplina(equivalente).length).toBe(1);
  });
});

describe("vocabulário de tags", () => {
  it("toda tag tem rótulo e comportamento observável declarado", () => {
    for (const t of TAGS) {
      expect(DESCRICAO_TAG[t]?.rotulo, `tag sem rótulo: ${t}`).toBeTruthy();
      expect(DESCRICAO_TAG[t]?.comportamento, `tag sem comportamento: ${t}`).toBeTruthy();
    }
    expect(Object.keys(DESCRICAO_TAG).sort()).toEqual([...TAGS].sort());
  });
});

describe("acervo publicado", () => {
  it("data/reviews.json tem o formato esperado e nasce vazio", () => {
    expect(Array.isArray(acervoJson.reviews)).toBe(true);
    expect(acervoJson.reviews).toEqual([]);
    expect(acervoJson.fonte).toBeTruthy();
  });
});
