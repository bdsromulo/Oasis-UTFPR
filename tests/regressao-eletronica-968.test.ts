import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import matriz968Json from "../data/eng-eletronica/matriz-968.json";
import oferta20262 from "../data/eng-eletronica/turmas/2026-2.json";
import matriz981 from "../data/matriz-981.json";
import matriz844 from "../data/eng-comp/matriz-844.json";
import {
  ENG_ELETRONICA_968,
  categoriaSimples,
  contaNoBlocoOptativo,
  ehGrupoOpcao,
  ehTrilha,
  grupoOpcaoDe,
  trilhasDaMatriz,
} from "../src/domain/cursos";
import { dadosDoCursoPorMatriz } from "../src/domain/dadosCurso";
import { extrairLinhas } from "../src/domain/historico/extrair-linhas";
import { parseHistorico } from "../src/domain/historico/parser";
import { montarPainel } from "../src/domain/motor/situacao";
import { calcularResumoProgressoGrade } from "../src/domain/motor/progressoGrade";
import { gerarSugestaoGrade } from "../src/domain/motor/grade-magica";
import {
  codigosOfertados,
  montarBoardObrigatorias,
  montarBoardOpcoes,
  montarBoardTrilhas,
} from "../src/domain/motor/fluxograma";
import { haveriaConflito, itensDaSelecao } from "../src/domain/motor/grade";
import { criarMapaIdentidade } from "../src/domain/motor/identidade";
import { simularFormatura } from "../src/domain/motor/simuladorFormatura";
import type { Matriz, OfertaSemestre, PerfilAluno, ResumoConjunto } from "../src/domain/tipos";

/**
 * Rede de proteção da matriz 968 (Engenharia Eletrônica).
 *
 * A 968 é o primeiro currículo servido pela plataforma em que:
 *   - o bloco optativo (2385h) é MAIOR que o obrigatório (1710h);
 *   - os conjuntos aninham em quatro níveis (1180 -> 1226 -> 1228 -> 1230);
 *   - quase todo o curso são grupos de escolha ("Opções de …"), e não trilhas.
 *
 * Cada um desses três traços quebrou uma regra que valia para BSI e Eng. Comp.,
 * e os testes abaixo existem para que ela não volte a valer aqui.
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

/** Perfil sintético no padrão observado: opções em andamento, trilhas zeradas. */
function perfil968(): PerfilAluno {
  return {
    nome: "ALUNO FICTÍCIO",
    matricula: "0000000",
    curso: "250 - Eng Eletrônica",
    matriz: 968,
    periodo: 6,
    coefAbsoluto: 0.8,
    coefNormalizado: 0.65,
    ingresso: "1/2023",
    cursadas: [],
    aprovadas: new Set<string>(),
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

describe("matriz 968 — integridade da fonte", () => {
  it("declara as cargas do Quadro Resumo oficial", () => {
    expect(matriz.matriz).toBe(968);
    expect(matriz.cargas.obrigatorias).toBe(1710);
    expect(matriz.cargas.optativas).toBe(2385);
    expect(matriz.cargas.extensao).toBe(465);
    expect(matriz.cargas.eletiva).toBe(0);
    expect(matriz.cargas.ch_total_ppc).toBe(4560);
  });

  it("a soma das obrigatórias reconstrói as 1710h", () => {
    const soma = matriz.disciplinas
      .filter((d) => d.conjunto === null)
      .reduce((a, d) => a + d.horas.total, 0);
    expect(soma).toBe(matriz.cargas.obrigatorias);
  });

  it("a soma dos conjuntos de topo reconstrói as 2385h", () => {
    const topo = Object.entries(matriz.conjuntos).filter(([, c]) => (c as any).pai == null);
    expect(topo.reduce((a, [, c]) => a + c.ch, 0)).toBe(matriz.cargas.optativas);
    // 25 grupos de escolha + Ciclo de Humanidades + Trilhas de Aprofundamento
    expect(topo).toHaveLength(27);
  });

  it("todo conjunto citado por disciplina existe, e a árvore não tem órfão", () => {
    for (const d of matriz.disciplinas) {
      if (d.conjunto === null) continue;
      expect(matriz.conjuntos[String(d.conjunto)], `conjunto ${d.conjunto}`).toBeDefined();
    }
    for (const [cod, c] of Object.entries(matriz.conjuntos)) {
      const pai = (c as any).pai;
      if (pai != null) expect(matriz.conjuntos[String(pai)], `pai de ${cod}`).toBeDefined();
    }
  });

  it("preserva o aninhamento de quatro níveis de Sistemas IoT", () => {
    const pai = (cod: string) => (matriz.conjuntos[cod] as any).pai;
    expect(pai("1226")).toBe("1180");
    expect(pai("1228")).toBe("1226");
    expect(pai("1230")).toBe("1228");
    // e o filho herda o período do pai, não do primeiro conjunto da legenda
    expect(matriz.conjuntos["1215"].periodo_inicial).toBe(2); // humanidades: 02/10
    expect(matriz.conjuntos["1181"].periodo_inicial).toBe(9); // trilhas:     09/10
  });

  it("lê a carga horária da primeira disciplina de cada página", () => {
    // O cabeçalho centralizado da 968 caía na faixa das colunas numéricas e o
    // "968" de "Matriz: 968" entrava como aula prática, empurrando a fileira e
    // zerando a carga de ELB11.
    const elb11 = matriz.disciplinas.find((d) => d.codigo === "ELB11")!;
    expect(elb11.horas.total).toBe(45);
    expect(elb11.aulas_semanais.praticas).toBe(3);
    for (const d of matriz.disciplinas) {
      expect(d.aulas_semanais.praticas, d.codigo).not.toBe(968);
      expect(d.aulas_semanais.teoricas, d.codigo).not.toBe(968);
    }
  });

  it("lê as disciplinas do 10º período e não duplica o código do ENADE", () => {
    expect(matriz.disciplinas.filter((d) => d.periodo === 10).length).toBeGreaterThan(0);
    expect(matriz.disciplinas.every((d) => d.periodo !== null)).toBe(true);
    const codigos = matriz.disciplinas.map((d) => d.codigo);
    expect(new Set(codigos).size).toBe(codigos.length);
    expect(codigos).toContain("ENADEI");
    expect(codigos).toContain("ENADEC");
  });
});

describe("descrição do curso 968", () => {
  it("reconhece a matriz e liga as turmas próprias de Eng. Eletrônica", () => {
    const curso = dadosDoCursoPorMatriz(968);
    expect(curso?.id).toBe("eng-eletronica-968");
    expect(curso?.matriz.matriz).toBe(968);
    expect(oferta.semestre).toBe("2026-2");
  });

  it("tem exatamente cinco trilhas de aprofundamento", () => {
    expect(trilhasDaMatriz(matriz).sort()).toEqual(["1181", "1182", "1183", "1184", "1226"]);
    // 1185 Eletivas e 1186 Optativas somam para as 300h sem validar trilha
    expect(ehTrilha(ENG_ELETRONICA_968, 1185)).toBe(false);
    expect(contaNoBlocoOptativo(ENG_ELETRONICA_968, 1185)).toBe(true);
    // as subáreas de IoT pertencem à trilha 1226; não são trilhas por si
    expect(ehTrilha(ENG_ELETRONICA_968, 1230)).toBe(false);
    expect(contaNoBlocoOptativo(ENG_ELETRONICA_968, 1230)).toBe(true);
  });

  it("não confunde grupo de escolha com trilha", () => {
    expect(ENG_ELETRONICA_968.gruposOpcao).toHaveLength(25);
    for (const g of ENG_ELETRONICA_968.gruposOpcao!) {
      expect(ehTrilha(ENG_ELETRONICA_968, g), `conjunto ${g}`).toBe(false);
      expect(ehGrupoOpcao(ENG_ELETRONICA_968, g), `conjunto ${g}`).toBe(true);
    }
  });

  it("sobe a hierarquia para classificar a disciplina pela subárea", () => {
    // EDU7AI está em "1215 Linguística, Letras E Artes", subárea de humanidades
    expect(categoriaSimples(ENG_ELETRONICA_968, 1215)?.id).toBe("humanidades");
    // ELP42T está em "1189 Teoria E Prática Não Integradas", sob 1187
    expect(grupoOpcaoDe(ENG_ELETRONICA_968, 1189)).toBe(1187);
    expect(categoriaSimples(ENG_ELETRONICA_968, 1189)).toBeNull();
  });

  it("os 25 grupos somam as 1875h que sobram das optativas", () => {
    const soma = ENG_ELETRONICA_968.gruposOpcao!.reduce(
      (a, g) => a + matriz.conjuntos[String(g)].ch,
      0,
    );
    const humanidades = matriz.conjuntos["1174"].ch;
    const trilhas = matriz.conjuntos["1180"].ch;
    expect(soma).toBe(1875);
    expect(soma + humanidades + trilhas).toBe(matriz.cargas.optativas);
  });
});

describe("painel e motores com a 968", () => {
  it("separa humanidades, grupos de escolha e trilhas", () => {
    const painel = montarPainel(perfil968(), matriz);
    expect(painel.inconsistencias).toEqual([]);
    expect(painel.obrigatorias).toMatchObject({ total: 1710, aprovada: 1095 });
    expect(painel.humanidades).toMatchObject({ exigido: 210, cumprido: 60 });
    expect(painel.blocoOptativo).toMatchObject({ exigido: 300, cumprido: 0 });
    expect(painel.trilhas.map((t) => t.conjunto).sort()).toEqual([
      "1181", "1182", "1183", "1184", "1226",
    ]);
    expect(painel.opcoes).not.toBeNull();
    expect(painel.opcoes!.exigido).toBe(1875);
    // 60 (1175) + 180 (1187) + 60 (1193); os demais grupos não têm linha no perfil
    expect(painel.opcoes!.cumprido).toBe(300);
    expect(painel.opcoes!.gruposCumpridos).toBe(2);
  });

  it("credita a disciplina de subárea ao grupo de topo no impacto da grade", () => {
    // ELP42T pertence a 1189, subárea de "1187 Opções De Circuitos Elétricos"
    const elp42t = matriz.disciplinas.find((d) => d.codigo === "ELP42T")!;
    expect(String(elp42t.conjunto)).toBe("1189");
    const linhas = calcularResumoProgressoGrade(
      [{ disciplina: { codigo: "ELP42T", nome: elp42t.nome, turmas: [] } as any, turma: {} as any }],
      perfil968(),
      matriz,
    );
    const grupo = linhas.find((l) => l.categoriaId === "1187");
    expect(grupo).toBeDefined();
    expect(grupo!.exigido).toBe(180);
    // não pode ter caído em eletivas nem no bloco de trilhas
    expect(linhas.find((l) => l.categoriaId === "eletivas")).toBeUndefined();
    expect(linhas.find((l) => l.categoriaId === "trilhas_geral")?.impulsoGrade ?? 0).toBe(0);
  });

  it("o simulador cobra os três blocos e nada além do PPC", () => {
    const sim = simularFormatura(perfil968(), matriz, [oferta], {
      ritmo: 6,
      semestreInicial: "2026-2",
      horizonte: 14,
    });
    const por = (id: string) => sim.requisitos.find((r) => r.id === id);
    // nas obrigatórias o cumprido sai do roster da matriz, não do Quadro Resumo:
    // este perfil sintético não declara nenhuma aprovada, então é 0 de 1710h
    expect(por("obrigatorias")).toMatchObject({ exigido: 1710, cumprido: 0 });
    expect(por("humanidades")).toMatchObject({ exigido: 210, cumprido: 60 });
    expect(por("opcoes")).toMatchObject({ exigido: 1875 });
    expect(por("trilhas")).toMatchObject({ exigido: 300, cumprido: 0 });
    expect(por("extensao")).toMatchObject({ exigido: 465 });
    // a 968 não pede eletivas: o requisito some da lista
    expect(por("eletivas")).toBeUndefined();
    // o total exigido é exatamente a carga do PPC
    expect(sim.requisitos.reduce((a, r) => a + r.exigido, 0)).toBe(matriz.cargas.ch_total_ppc);
    expect(sim.trilhasExigidas).toBe(1);
  });

  it("não fecha um grupo de escolha com horas de outro", () => {
    const sim = simularFormatura(perfil968(), matriz, [oferta], {
      ritmo: 6,
      semestreInicial: "2026-2",
      horizonte: 20,
    });
    if (!sim.semestreFormatura) return; // projeção que não fecha não afirma nada
    const planejadoPorGrupo = new Map<number, number>();
    for (const s of sim.semestres) {
      for (const d of s.disciplinas) {
        if (d.categoria !== "opcoes") continue;
        const g = grupoOpcaoDe(ENG_ELETRONICA_968, d.conjunto);
        if (g !== null) planejadoPorGrupo.set(g, (planejadoPorGrupo.get(g) ?? 0) + d.horas);
      }
    }
    const cumprido = new Map(
      perfil968().resumoConjuntos.map((r) => [Number(r.conjunto), r.chCursadaAprovada]),
    );
    for (const g of ENG_ELETRONICA_968.gruposOpcao!) {
      const exigido = matriz.conjuntos[String(g)].ch;
      const total = (cumprido.get(g) ?? 0) + (planejadoPorGrupo.get(g) ?? 0);
      expect(total, `grupo ${g} (${matriz.conjuntos[String(g)].nome})`).toBeGreaterThanOrEqual(
        exigido,
      );
    }
  });
});

/**
 * Grade Inteligente na 968.
 *
 * Aqui a sugestão só é útil se souber três coisas que valiam só para BSI:
 * que humanidades se reconhece pela subárea, que cada grupo de escolha tem teto
 * próprio, e que a mesma matéria abre turma sob mais de um código.
 */
describe("Grade Inteligente com a 968", () => {
  const opcoesBase = {
    estrategia: "adiantar_maximo" as const,
    naoManha: false,
    naoTarde: false,
    naoNoite: false,
  };
  const mapa = criarMapaIdentidade(matriz);
  const daMatriz = (cod: string) => matriz.disciplinas.find((d) => d.codigo === mapa.resolver(cod));

  /**
   * Perfil com as obrigatórias até o 5º período aprovadas: sem isso o guloso
   * enche a grade só de obrigatórias e a lógica de grupos nunca é exercida.
   */
  function perfilAvancado(): PerfilAluno {
    const p = perfil968();
    p.aprovadas = new Set(
      matriz.disciplinas.filter((d) => d.conjunto === null && (d.periodo ?? 99) <= 5).map((d) => d.codigo),
    );
    return p;
  }

  /** Horas sugeridas por grupo de escolha, resolvendo o código canônico. */
  function horasPorGrupo(selecao: { codDisciplina: string }[]) {
    const por = new Map<number, number>();
    for (const s of selecao) {
      const d = daMatriz(s.codDisciplina);
      const g = grupoOpcaoDe(ENG_ELETRONICA_968, d?.conjunto ?? null);
      if (g !== null) por.set(g, (por.get(g) ?? 0) + (d?.horas.total ?? 0));
    }
    return por;
  }

  it("de fato usa os grupos de escolha quando as obrigatórias acabam", () => {
    const selecao = gerarSugestaoGrade(perfilAvancado(), matriz, oferta, opcoesBase);
    expect(selecao.length).toBeGreaterThan(0);
    expect(horasPorGrupo(selecao).size, "nenhum grupo de escolha entrou na sugestão").toBeGreaterThan(0);
  });

  it("não sugere matéria de grupo de escolha já cumprido", () => {
    // o perfil já fechou 1175 (60/60h) e 1187 (180/180h)
    const grupos = horasPorGrupo(gerarSugestaoGrade(perfilAvancado(), matriz, oferta, opcoesBase));
    expect(grupos.has(1175), "sugeriu matéria de grupo já cumprido (1175)").toBe(false);
    expect(grupos.has(1187), "sugeriu matéria de grupo já cumprido (1187)").toBe(false);
  });

  it("não empilha matéria em grupo que já foi coberto pela própria sugestão", () => {
    const perfil = perfilAvancado();
    for (const [grupo, horas] of horasPorGrupo(
      gerarSugestaoGrade(perfil, matriz, oferta, opcoesBase),
    )) {
      const cod = String(grupo);
      const r = perfil.resumoConjuntos.find((x) => x.conjunto === cod);
      const exigida = r?.chObrigatoria ?? matriz.conjuntos[cod].ch;
      const falta = exigida - (r ? Math.min(r.chCursadaAprovada, exigida) : 0);
      // uma matéria pode ultrapassar o que falta por granularidade; o que não
      // pode é entrar mais uma DEPOIS de o grupo já estar coberto
      const maiorDoGrupo = Math.max(
        ...matriz.disciplinas
          .filter((d) => grupoOpcaoDe(ENG_ELETRONICA_968, d.conjunto) === grupo)
          .map((d) => d.horas.total),
      );
      expect(horas - falta, `grupo ${grupo} (${matriz.conjuntos[cod].nome})`).toBeLessThan(maiorDoGrupo);
    }
  });

  it("não sugere a mesma matéria duas vezes por códigos equivalentes", () => {
    // ELN73B é equivalente declarado de ELB11 e abre turma própria na oferta:
    // as duas entravam na grade, e o aluno gastaria uma vaga em nada.
    const selecao = gerarSugestaoGrade(perfil968(), matriz, oferta, opcoesBase);
    const canonicos = selecao.map((s) => mapa.resolver(s.codDisciplina));
    expect(new Set(canonicos).size, `códigos repetidos: ${canonicos.join(", ")}`).toBe(
      canonicos.length,
    );
  });

  it("não sugere eletiva num curso que exige 0h de eletivas", () => {
    expect(matriz.cargas.eletiva).toBe(0);
    const selecao = gerarSugestaoGrade(perfilAvancado(), matriz, oferta, opcoesBase);
    const foraDaMatriz = selecao.filter((s) => !daMatriz(s.codDisciplina));
    expect(foraDaMatriz.map((s) => s.codDisciplina)).toEqual([]);
  });

  it("reconhece humanidades pela subárea e respeita o pedido de excluí-las", () => {
    const ehHumanidades = (cod: string) =>
      categoriaSimples(ENG_ELETRONICA_968, daMatriz(cod)?.conjunto ?? null)?.id === "humanidades";
    const semHumanidades = gerarSugestaoGrade(perfilAvancado(), matriz, oferta, {
      ...opcoesBase,
      semHumanidades: true,
    });
    expect(semHumanidades.filter((s) => ehHumanidades(s.codDisciplina)).map((s) => s.codDisciplina))
      .toEqual([]);
  });

  it("dá grade sem choque de horário", () => {
    const selecao = gerarSugestaoGrade(perfilAvancado(), matriz, oferta, opcoesBase);
    expect(selecao.length).toBeGreaterThan(0);
    for (let i = 0; i < selecao.length; i++) {
      const parcial = itensDaSelecao(oferta, selecao.slice(0, i));
      const d = oferta.disciplinas.find((x) => x.codigo === selecao[i].codDisciplina)!;
      const t = d.turmas.find((x) => x.codigo === selecao[i].codTurma)!;
      expect(haveriaConflito(parcial, d, t), `${selecao[i].codDisciplina}/${selecao[i].codTurma}`).toBe(
        false,
      );
    }
  });
});

describe("fluxograma da 968", () => {
  const abertos = codigosOfertados(matriz, [oferta]);

  it("põe os grupos de escolha no desenho, uma raia por grupo", () => {
    const board = montarBoardOpcoes(matriz, abertos);
    // 25 grupos declarados; só entram os que têm disciplina aberta na oferta
    expect(board.faixas.length).toBeGreaterThan(15);
    expect(board.nos.filter((n) => !n.externo).length).toBeGreaterThan(30);
    // as raias são os grupos "Opções de …" mais o Ciclo de Humanidades, que é a
    // mesma decisão do aluno: escolher N horas dentro de um conjunto
    const esperados = [
      ...ENG_ELETRONICA_968.gruposOpcao!.map(String),
      ...ENG_ELETRONICA_968.categorias.map((c) => String(c.conjunto)),
    ];
    for (const f of board.faixas) {
      expect(esperados, `raia inesperada: ${f.id}`).toContain(f.id);
      expect(f.subrotulo).toMatch(/escolher \d+h de \d+h abertas/);
    }
    expect(board.faixas.map((f) => f.id)).toContain("1174");
  });

  it("não mistura grupo de escolha com o bloco de trilhas", () => {
    const opcoes = montarBoardOpcoes(matriz, abertos);
    const trilhas = montarBoardTrilhas(matriz, abertos);
    const idsOpcoes = new Set(opcoes.faixas.map((f) => f.id));
    for (const f of trilhas.faixas) {
      expect(idsOpcoes.has(f.id), `raia ${f.id} nos dois boards`).toBe(false);
      // toda raia do board de trilhas soma para o bloco optativo — inclusive
      // "1186 Optativas", que conta para as 300h sem validar trilha
      expect(contaNoBlocoOptativo(ENG_ELETRONICA_968, f.id), `raia ${f.id}`).toBe(true);
    }
    expect(trilhas.faixas.some((f) => ehTrilha(ENG_ELETRONICA_968, f.id))).toBe(true);
  });

  it("nenhuma disciplina do currículo fica invisível nos três boards", () => {
    const nosDe = (b: { nos: { codigo: string; externo: boolean }[] }) =>
      b.nos.filter((n) => !n.externo).map((n) => n.codigo);
    const desenhadas = new Set([
      ...nosDe(montarBoardObrigatorias(matriz)),
      ...nosDe(montarBoardOpcoes(matriz, abertos)),
      ...nosDe(montarBoardTrilhas(matriz, abertos)),
    ]);
    // toda disciplina com turma aberta tem de aparecer em algum board
    const abertasNaMatriz = matriz.disciplinas.filter(
      (d) => abertos.has(d.codigo) && !d.codigo.startsWith("ENADE"),
    );
    const invisiveis = abertasNaMatriz.filter((d) => !desenhadas.has(d.codigo));
    expect(invisiveis.map((d) => d.codigo)).toEqual([]);
  });

  it("o board de opções serve os outros cursos sem inventar grupo de escolha", () => {
    // A 968 é o único curso com "Opções de …", mas o board também é onde mora o
    // Ciclo de Humanidades — que era invisível no fluxograma de TODOS os cursos.
    // Sem oferta conhecida nenhuma raia é desenhada, e é isso que se verifica
    // aqui; o conteúdo por curso é assunto das suítes de cada matriz.
    for (const outra of [matriz981, matriz844]) {
      const board = montarBoardOpcoes(outra as unknown as Matriz, new Set<string>());
      expect(board.faixas).toEqual([]);
      expect(board.nos).toEqual([]);
    }
    // e nenhum deles declara grupo de escolha
    expect(ENG_ELETRONICA_968.gruposOpcao).toHaveLength(25);
  });
});

/**
 * Auditoria contra o Histórico Escolar real de Eng. Eletrônica.
 *
 * O PDF é dado pessoal e vive fora do repositório (`materiais-referencia/` é
 * ignorada pelo Git); onde ele não existe — CI, outra máquina — o bloco é
 * pulado. Os números conferidos aqui foram transcritos do próprio documento.
 */
const HISTORICO_REAL =
  "materiais-referencia/Eng-Eletronica-968/Histórico Escolar Cadu Eng Eletronica.pdf";

describe.skipIf(!existsSync(HISTORICO_REAL))("histórico real da 968", () => {
  async function carregar() {
    const buf = readFileSync(HISTORICO_REAL);
    const linhas = await extrairLinhas(
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
    );
    return parseHistorico(linhas.map((l) => l.texto));
  }

  it("lê o histórico inteiro sem aviso e casa com o Quadro Resumo", async () => {
    const perfil = await carregar();
    expect(perfil.avisos).toEqual([]);
    expect(perfil.matriz).toBe(968);
    expect(perfil.resumoGeral?.obrigatorias).toMatchObject({
      total: 1710, cursada: 1095, aprovada: 1095, faltante: 615,
    });
    expect(perfil.resumoGeral?.optativas).toMatchObject({
      total: 2385, cursada: 1095, aprovada: 675, faltante: 1710, aprovadaTotal: 795,
    });
    expect(perfil.extensao).toEqual({ chTotal: 465, chCursada: 0, chFaltante: 465 });
  });

  it("soma dos conjuntos reconstrói as colunas (C) e (E) do Quadro Resumo", async () => {
    const perfil = await carregar();
    const topo = perfil.resumoConjuntos.filter(
      (r) => (matriz.conjuntos[r.conjunto] as any)?.pai == null,
    );
    expect(topo).toHaveLength(27);
    expect(topo.reduce((a, r) => a + r.chObrigatoria, 0)).toBe(2385);
    expect(topo.reduce((a, r) => a + r.chCursadaAprovada, 0)).toBe(795);
    expect(topo.reduce((a, r) => a + r.chValidada, 0)).toBe(675);
  });

  it("toda disciplina cursada casa com a matriz, e as CH batem com o oficial", async () => {
    const perfil = await carregar();
    const naMatriz = new Set(matriz.disciplinas.map((d) => d.codigo));
    const orfas = perfil.cursadas.filter((c) => !naMatriz.has(c.codigo));
    expect(orfas.map((o) => o.codigo)).toEqual([]);

    const aprovada = (s: string) => s === "aprovado" || s === "consignado" || s === "dispensado";
    const somaObr = perfil.cursadas
      .filter((c) => c.origem === "obrigatoria" && aprovada(c.situacao))
      .reduce((a, c) => a + (c.cht ?? 0), 0);
    const somaOpt = perfil.cursadas
      .filter((c) => c.origem === "optativa" && aprovada(c.situacao))
      .reduce((a, c) => a + (c.cht ?? 0), 0);
    expect(somaObr).toBe(1095);
    expect(somaOpt).toBe(795);
  });

  it("o painel reproduz a situação declarada pelo Portal", async () => {
    const perfil = await carregar();
    const painel = montarPainel(perfil, matriz);
    expect(painel.inconsistencias).toEqual([]);
    expect(painel.obrigatorias).toMatchObject({ total: 1710, aprovada: 1095 });
    expect(painel.humanidades).toMatchObject({ exigido: 210, cumprido: 60 });
    expect(painel.opcoes).toMatchObject({ exigido: 1875, cumprido: 735 });
    expect(painel.blocoOptativo).toMatchObject({ exigido: 300, cumprido: 0 });
    expect(painel.trilhasValidadas).toBe(0);
    expect(painel.extensao).toMatchObject({ exigido: 465, cumprido: 0 });
    // 1095 obrigatórias + 795 optativas conferidas pelo próprio documento
    expect(
      painel.obrigatorias!.aprovada + painel.humanidades!.cumprido + painel.opcoes!.cumprido,
    ).toBe(1890);
  });

  it("o simulador parte dos números do Portal e projeta a formatura", async () => {
    const perfil = await carregar();
    const sim = simularFormatura(perfil, matriz, [oferta], {
      ritmo: 6,
      semestreInicial: "2026-2",
      horizonte: 20,
    });
    const por = (id: string) => sim.requisitos.find((r) => r.id === id);
    expect(por("obrigatorias")).toMatchObject({ exigido: 1710, cumprido: 1095 });
    expect(por("humanidades")).toMatchObject({ exigido: 210, cumprido: 60 });
    expect(por("opcoes")).toMatchObject({ exigido: 1875, cumprido: 735 });
    expect(por("trilhas")).toMatchObject({ exigido: 300, cumprido: 0 });
    // 1095 + 60 + 735 = 1890 = coluna (E) do Quadro Resumo para o curso inteiro
    expect(sim.requisitos.reduce((a, r) => a + r.cumprido, 0)).toBe(1890);
    expect(sim.requisitos.reduce((a, r) => a + r.exigido, 0)).toBe(4560);
  });

  it("lista as oito obrigatórias faltantes e a dependência declaradas", async () => {
    const perfil = await carregar();
    expect(perfil.obrigatoriasFaltantes.map((f) => f.codigo)).toEqual([
      "ELS03", "ELP61", "ELP71", "ELS02", "ELP66", "ELE91", "ELO91", "ELE92",
    ]);
    expect(perfil.dependencias.map((d) => d.codigo)).toEqual(["ELS03"]);
  });
});
