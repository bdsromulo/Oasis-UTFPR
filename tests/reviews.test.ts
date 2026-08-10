// Camada de avaliações da comunidade (Estrategia.md §6). Nenhum dado pessoal:
// os docentes fictícios vêm de ofertas montadas no próprio teste, e o acervo real
// (data/reviews.json) só é conferido quanto ao formato.
import { describe, it, expect } from "vitest";
import {
  construirRoster,
  docentesDaTurma,
  idDaUnidade,
  slugProfessor,
  unidadeInclui,
} from "../src/domain/reviews/professores";
import {
  agregar,
  criarConsulta,
  publicaveis,
  codigosJaAvaliadosPor,
  LIMIAR_ESTATISTICA,
} from "../src/domain/reviews/acervo";
import { LIMITE_COMENTARIO, type Review } from "../src/domain/reviews/tipos";
import { criarMapaIdentidade } from "../src/domain/motor/identidade";
import {
  BSI,
  ENG_COMP,
  CURSOS,
  carregarOfertasHistoricasMecatronica,
} from "../src/domain/dadosCurso";
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
    personalidade: 4,
    didatica: 4,
    dificuldade: 3,
    cargaTrabalho: 3,
    avaliacao: "provas",
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

describe("unidade docente: quem divide a turma é avaliado junto", () => {
  const curso = cursoFicticio("curso-dupla", [
    { codigo: "ICSD20", turmas: [turma({ professores_raw: "Fulano De Tal, Sicrano Da Silva" })] },
  ]);
  const roster = construirRoster([curso]);

  it("a dupla vira UMA opção, não duas", () => {
    const elenco = roster.elencoDaDisciplina("ICSD20");
    expect(elenco.length).toBe(1);
    expect(elenco[0].nomes).toEqual(["Fulano De Tal", "Sicrano Da Silva"]);
  });

  it("é exibida como \"X / Y\"", () => {
    expect(roster.elencoDaDisciplina("ICSD20")[0].nome).toBe("Fulano De Tal / Sicrano Da Silva");
  });

  it("o id junta os slugs em ordem estável", () => {
    expect(idDaUnidade(["Fulano De Tal", "Sicrano Da Silva"])).toBe("fulano-de-tal+sicrano-da-silva");
    // a fonte lista os nomes na ordem que quiser: sem ordenar, a mesma dupla
    // geraria ids diferentes por semestre e fatiaria o acervo da turma em dois
    expect(idDaUnidade(["Sicrano Da Silva", "Fulano De Tal"])).toBe(idDaUnidade(["Fulano De Tal", "Sicrano Da Silva"]));
  });

  it("nome repetido na fonte não duplica o id", () => {
    expect(idDaUnidade(["Fulano De Tal", "FULANO DE TAL"])).toBe("fulano-de-tal");
  });

  it("a unidade é localizável por qualquer um dos docentes", () => {
    const id = "fulano-de-tal+sicrano-da-silva";
    expect(unidadeInclui(id, "fulano-de-tal")).toBe(true);
    expect(unidadeInclui(id, "sicrano-da-silva")).toBe(true);
    expect(unidadeInclui(id, "beltrano-souza")).toBe(false);
    expect(roster.unidadesCom("sicrano-da-silva").map((u) => u.id)).toEqual([id]);
  });

  it("turmas distintas da mesma disciplina, com docentes distintos, são unidades distintas", () => {
    // é o outro lado da regra: juntos na MESMA turma viram um; em turmas
    // separadas, com horários próprios, são avaliados separadamente
    const c = cursoFicticio("curso-turmas", [
      {
        codigo: "ICSD20",
        turmas: [
          turma({ codigo: "S71", professores_raw: "Fulano De Tal" }),
          turma({ codigo: "S73", professores_raw: "Sicrano Da Silva" }),
        ],
      },
    ]);
    const elenco = construirRoster([c]).elencoDaDisciplina("ICSD20");
    expect(elenco.map((u) => u.id).sort()).toEqual(["fulano-de-tal", "sicrano-da-silva"]);
    expect(elenco.every((u) => u.nomes.length === 1)).toBe(true);
  });

  it("solo e dupla do mesmo docente são unidades distintas", () => {
    // a experiência de aula é outra: não podem cair na mesma média
    const c = cursoFicticio("curso-misto", [
      { codigo: "ICSD20", turmas: [turma({ professores_raw: "Fulano De Tal" })] },
      { codigo: "ICSF13", turmas: [turma({ professores_raw: "Fulano De Tal, Sicrano Da Silva" })] },
    ]);
    const r = construirRoster([c]);
    expect(r.unidadesCom("fulano-de-tal").map((u) => u.id).sort()).toEqual([
      "fulano-de-tal",
      "fulano-de-tal+sicrano-da-silva",
    ]);
  });
});

describe("roster global entre cursos", () => {
  // a mesma unidade dá a mesma disciplina em dois cursos: precisa ser UMA entrada
  const cursoA = cursoFicticio("curso-a", [
    { codigo: "ICSD20", turmas: [turma({ professores_raw: "Fulano De Tal" })] },
  ]);
  const cursoB = cursoFicticio("curso-b", [
    { codigo: "ICSD20", turmas: [turma({ codigo: "S99", professores_raw: "Fulano De Tal" })] },
    { codigo: "CSF13", turmas: [turma({ professores_raw: "Beltrano Souza" })] },
  ]);
  const roster = construirRoster([cursoA, cursoB]);

  it("a unidade compartilhada aparece uma única vez", () => {
    expect(roster.unidades.filter((u) => u.id === "fulano-de-tal").length).toBe(1);
  });

  it("registra todas as disciplinas em que a unidade aparece", () => {
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
    expect(rosterGlobal.unidades.length).toBeGreaterThan(rosterBSI.unidades.length);
  });

  it("unidades reais têm nome e id bem formados", () => {
    for (const u of rosterGlobal.unidades) {
      expect(u.nome.trim(), `unidade sem nome: ${u.id}`).not.toBe("");
      expect(u.id, `id malformado: ${u.nome}`).toMatch(/^[a-z0-9-]+(\+[a-z0-9-]+)*$/);
      expect(u.nomes.length, `id e nomes divergem: ${u.id}`).toBe(u.id.split("+").length);
    }
  });

  it("as ofertas reais têm turmas divididas entre docentes", () => {
    // se isto zerar, a regra da dupla deixou de ter caso real e vale reavaliar
    expect(rosterGlobal.unidades.filter((u) => u.nomes.length > 1).length).toBeGreaterThan(0);
  });

  it("dupla que a fonte grava sem vírgula não vira uma segunda unidade", () => {
    // ICSR30 sai como "A, B" em 2025/2 e como "A B" em 2026/1 e 2026/2. Sem o
    // passe de vocabulário, isso partia o acervo da mesma turma em dois.
    // Detecta o resíduo pelo próprio critério do parser: um nome individual que
    // começa com o nome inteiro de OUTRO docente conhecido ainda é concatenação.
    const solo = rosterGlobal.unidades.filter((u) => u.nomes.length === 1).map((u) => u.nomes[0]);
    const naoPartidas = solo.filter((n) =>
      solo.some((o) => o !== n && n.startsWith(o + " ") && n.slice(o.length + 1).split(/\s+/).length >= 2),
    );
    expect(naoPartidas, "concatenação não partida sobrando no roster").toEqual([]);
  });

  it("nenhuma dupla é registrada em duas grafias", () => {
    const duplas = rosterGlobal.unidades.filter((u) => u.nomes.length > 1);
    const chaves = duplas.map((u) => [...u.nomes].sort().join("|"));
    expect(new Set(chaves).size, "mesma dupla registrada duas vezes").toBe(chaves.length);
  });

  it("nome de docente não carrega hífen solto da extração do PDF", () => {
    // `data/turmas/2026-1.json` traz dezenas de entradas como "- Fulano"
    for (const u of rosterGlobal.unidades) {
      for (const n of u.nomes) {
        expect(n, `nome com hífen na ponta: ${JSON.stringify(n)}`).toMatch(/^[A-Za-zÀ-ÿ].*[A-Za-zÀ-ÿ.]$/);
      }
    }
  });

  it("disciplina compartilhada entre cursos tem elenco em ambos", () => {
    // ICSHX0 é ofertada com prioridade para Sist. de Informação e Eng. de Computação
    expect(rosterGlobal.elencoDaDisciplina("ICSHX0").length).toBeGreaterThan(0);
    expect(construirRoster([ENG_COMP]).unidades.length).toBeGreaterThan(0);
  });
});

describe("agregação", () => {
  it("abaixo do limiar, comentários aparecem mas médias não", () => {
    const ag = agregar([review({ personalidade: 5 })]);
    expect(ag.n).toBe(1);
    expect(ag.estatisticaExibivel).toBe(false);
    expect(ag.personalidade).toBeNull();
    expect(ag.reviews.length).toBe(1); // o comentário continua acessível
  });

  it("a partir do limiar, calcula as médias", () => {
    const rs = Array.from({ length: LIMIAR_ESTATISTICA }, () => review({ personalidade: 4, didatica: 5 }));
    const ag = agregar(rs);
    expect(ag.estatisticaExibivel).toBe(true);
    expect(ag.personalidade).toBe(4);
    expect(ag.didatica).toBe(5);
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
    expect(ag.personalidade).toBeNull();
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

describe("acervo publicado", () => {
  it("data/reviews.json tem o formato esperado e nasce vazio", () => {
    expect(Array.isArray(acervoJson.reviews)).toBe(true);
    expect(acervoJson.fonte).toBeTruthy();
  });

  // Este bloco roda no Action DEPOIS da ingestão semanal: é a última barreira
  // antes de um acervo malformado ser commitado. Por isso valida o conteúdo real
  // do arquivo, e não que ele esteja vazio — afirmar vazio quebraria o workflow
  // na primeira ingestão bem-sucedida.
  //
  // O carregamento das ofertas de Mecatrônica precisa ser aguardado aqui pelo
  // mesmo motivo que na ingestão: sem ele, `CURSOS` traz o placeholder vazio do
  // curso, e esta barreira acusaria "unidade fora do roster" para avaliações
  // legítimas de Mecatrônica — reprovando o acervo correto que a ingestão
  // acabou de gerar.
  it("toda avaliação publicada é bem formada", async () => {
    await carregarOfertasHistoricasMecatronica();
    const roster = construirRoster(CURSOS);
    const codigos = new Set<string>();
    for (const c of CURSOS) {
      for (const d of c.matriz.disciplinas) codigos.add(d.codigo);
      for (const o of Object.values(c.ofertas)) for (const d of o.disciplinas) codigos.add(d.codigo);
    }

    const problemas: string[] = [];
    const ids = new Set<string>();
    for (const r of acervoJson.reviews as Review[]) {
      const onde = `${r.id ?? "(sem id)"}`;
      if (!r.id) problemas.push("avaliação sem id");
      if (ids.has(r.id)) problemas.push(`${onde}: id duplicado`);
      ids.add(r.id);

      // publicado sem professorId significa que uma linha pendente de roster vazou
      if (!r.professorId) problemas.push(`${onde}: sem professorId`);
      else if (!roster.porId(r.professorId)) problemas.push(`${onde}: unidade "${r.professorId}" fora do roster`);

      if (!codigos.has(r.codigo)) problemas.push(`${onde}: código "${r.codigo}" desconhecido`);
      if (!/^20\d{2}\/[12]$/.test(r.semestre)) problemas.push(`${onde}: semestre "${r.semestre}" malformado`);
      if (r.situacao && !["aprovado", "reprovado"].includes(r.situacao)) {
        problemas.push(`${onde}: situação inválida`);
      }
      if (!r.autor?.trim()) problemas.push(`${onde}: autor vazio`);

      for (const campo of ["personalidade", "didatica", "dificuldade", "cargaTrabalho"] as const) {
        const v = r[campo];
        if (!Number.isInteger(v) || v < 1 || v > 5) problemas.push(`${onde}: ${campo} fora de 1–5`);
      }
      if ((r.comentario ?? "").length > LIMITE_COMENTARIO) problemas.push(`${onde}: comentário longo demais`);
      // o RA nunca é publicado; se aparecer no texto livre, vazou
      if (/\b\d{7}\b|[\w.+-]+@[\w-]+\.[\w.]+/.test(r.comentario ?? "")) {
        problemas.push(`${onde}: dado pessoal no comentário`);
      }
    }
    expect(problemas, problemas.join("; ")).toEqual([]);
  });
});

describe("avaliações já feitas por quem está lendo", () => {
  const mapa = criarMapaIdentidade(BSI.matriz);
  const codigo = BSI.matriz.disciplinas[0].codigo;

  it("casa o nome do histórico com o do acervo, ignorando acento e caixa", () => {
    const rs = [review({ autor: "ROMULO BARBOSA DA SILVA", codigo })];
    const feitas = codigosJaAvaliadosPor(rs, "Rômulo Barbosa da Silva", mapa);
    expect(feitas.has(codigo)).toBe(true);
  });

  it("não casa nomes de pessoas diferentes", () => {
    const rs = [review({ autor: "Outra Pessoa", codigo })];
    expect(codigosJaAvaliadosPor(rs, "Rômulo Barbosa da Silva", mapa).size).toBe(0);
  });

  it("nome vazio não casa com ninguém", () => {
    const rs = [review({ autor: "Alguem", codigo })];
    expect(codigosJaAvaliadosPor(rs, "", mapa).size).toBe(0);
  });

  it("ignora avaliação ainda pendente de roster", () => {
    const rs = [review({ autor: "Fulano", codigo, professorId: undefined })];
    expect(codigosJaAvaliadosPor(rs, "Fulano", mapa).size).toBe(0);
  });
});
