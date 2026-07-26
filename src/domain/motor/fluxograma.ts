import type { DisciplinaMatriz, Matriz } from "../tipos";
import {
  categoriaSimples,
  contaNoBlocoOptativo,
  descricaoDoCurso,
  ehTrilha,
  grupoOpcaoDe,
} from "../cursos";
import { criarMapaIdentidade } from "./identidade";

/**
 * Monta os dois boards do fluxograma de progressão do curso, já com as posições
 * calculadas — a tela só desenha o que sai daqui.
 *
 * Board "obrigatorias": roster oficial da matriz. As obrigatórias ocupam uma
 * coluna por período. Quando a matriz declara um segundo estrato, ele vai para
 * uma faixa própria abaixo para não distorcer a leitura do fluxo.
 *
 * Board "opcoes": uma raia por conjunto de escolha — os grupos "Opções de …" da
 * 968 e o Ciclo de Humanidades. É a metade do currículo que não cabe em
 * "obrigatorias" e não é trilha; sem este board a 968 mostrava 27 das 201
 * disciplinas, e o Ciclo de Humanidades era invisível em todos os cursos.
 *
 * Board "trilhas": uma raia por conjunto do bloco de aprofundamento, contendo
 * apenas disciplinas que efetivamente abriram em algum semestre conhecido.
 * Pré-requisitos que moram fora da raia (obrigatórias, 2º estrato) entram como
 * nós fantasma na coluna 0, para que a árvore não comece no ar.
 */

export const LARGURA_NO = 190;
export const ALTURA_NO = 74;
const GAP_X = 78;
const GAP_Y = 22;
const PADDING = 40;
const ALTURA_CABECALHO_FAIXA = 84;

export type GrupoCor =
  | "basica"
  | "profissional"
  | "humanistica"
  | "estagio"
  | "conclusao"
  | "atividades"
  | "segundoEstrato"
  | "trilha"
  // grupo de escolha da 968 ("Opções de …"): não é trilha nem obrigatória
  | "opcao"
  | "externo";

export interface NoFluxo {
  /** único no board (trilhas duplicam fantasmas por raia, daí o prefixo) */
  id: string;
  codigo: string;
  nome: string;
  periodo: number;
  horas: number;
  grupo: GrupoCor;
  /** pré-requisito que vive fora deste board/raia, desenhado esmaecido */
  externo: boolean;
  /** exigência de período ("Período:4") que não vira aresta */
  exigePeriodo: number | null;
  x: number;
  y: number;
}

export interface ArestaFluxo {
  id: string;
  de: string;
  para: string;
}

export interface FaixaFluxo {
  id: string;
  rotulo: string;
  subrotulo?: string;
  y: number;
  altura: number;
}

export interface ColunaFluxo {
  rotulo: string;
  x: number;
}

export interface Board {
  nos: NoFluxo[];
  arestas: ArestaFluxo[];
  faixas: FaixaFluxo[];
  colunas: ColunaFluxo[];
  largura: number;
  altura: number;
}

function grupoDe(d: DisciplinaMatriz, matriz: Matriz): GrupoCor {
  const curso = descricaoDoCurso(matriz);
  if (categoriaSimples(curso, d.conjunto)?.id === "segundoEstrato") return "segundoEstrato";
  if (ehTrilha(curso, d.conjunto)) return "trilha";
  const m = (d.modelo || "").toLowerCase();
  if (m.includes("básica") || m.includes("basica") || m.includes("cient")) return "basica";
  if (m.includes("human")) return "humanistica";
  if (m.includes("estágio") || m.includes("estagio")) return "estagio";
  if (m.includes("conclus")) return "conclusao";
  if (m.includes("ativid")) return "atividades";
  return "profissional";
}

/** "Período:4" -> 4; código de disciplina -> null */
function periodoExigido(prereq: string): number | null {
  const m = /^Per[ií]odo:(\d+)$/i.exec(prereq.trim());
  return m ? parseInt(m[1], 10) : null;
}

function xDaColuna(col: number): number {
  return PADDING + col * (LARGURA_NO + GAP_X);
}

/**
 * Reordena as linhas de cada coluna pela média das linhas dos pré-requisitos
 * (heurística barycenter). Duas passadas já reduzem bem o cruzamento de arestas
 * sem custo perceptível para o tamanho destes grafos.
 */
function ordenarPorBaricentro(
  colunas: Map<number, string[]>,
  prereqsPorNo: Map<string, string[]>,
  passadas = 2,
): void {
  const linhaDe = new Map<string, number>();
  for (const ids of colunas.values()) ids.forEach((id, i) => linhaDe.set(id, i));

  const indices = [...colunas.keys()].sort((a, b) => a - b);
  for (let p = 0; p < passadas; p++) {
    for (const col of indices) {
      const ids = colunas.get(col)!;
      const peso = new Map<string, number>();
      ids.forEach((id, i) => {
        const pais = (prereqsPorNo.get(id) ?? [])
          .map((pid) => linhaDe.get(pid))
          .filter((v): v is number => v !== undefined);
        peso.set(id, pais.length ? pais.reduce((a, b) => a + b, 0) / pais.length : i);
      });
      ids.sort((a, b) => (peso.get(a) ?? 0) - (peso.get(b) ?? 0));
      ids.forEach((id, i) => linhaDe.set(id, i));
    }
  }
}

function noDe(
  d: DisciplinaMatriz,
  matriz: Matriz,
  opts: { id?: string; externo?: boolean; grupo?: GrupoCor } = {},
): NoFluxo {
  const exig = d.prerequisitos.map(periodoExigido).find((v): v is number => v !== null) ?? null;
  return {
    id: opts.id ?? d.codigo,
    codigo: d.codigo,
    nome: d.nome,
    periodo: d.periodo,
    horas: d.horas.total,
    grupo: opts.grupo ?? grupoDe(d, matriz),
    externo: opts.externo ?? false,
    exigePeriodo: exig,
    x: 0,
    y: 0,
  };
}

/** Board das obrigatórias + 2º estrato, em colunas por período. */
export function montarBoardObrigatorias(matriz: Matriz): Board {
  // O Enade não é disciplina cursável (0h) e só polui o fluxo.
  const ehEnade = (c: string) => c.startsWith("ENADE");

  const obrigatorias = matriz.disciplinas.filter((d) => d.conjunto === null && !ehEnade(d.codigo));
  const curso = descricaoDoCurso(matriz);
  const conjSegundoEstrato = curso.categorias.find((c) => c.id === "segundoEstrato")?.conjunto ?? null;
  const segundoEstrato = conjSegundoEstrato === null
    ? []
    : matriz.disciplinas.filter((d) => d.conjunto === conjSegundoEstrato);
  const renderizadas = [...obrigatorias, ...segundoEstrato];
  const porCodigo = new Map(renderizadas.map((d) => [d.codigo, d]));

  const nos: NoFluxo[] = renderizadas.map((d) => noDe(d, matriz));
  const nosPorId = new Map(nos.map((n) => [n.id, n]));

  const prereqsPorNo = new Map<string, string[]>();
  const arestas: ArestaFluxo[] = [];
  for (const d of renderizadas) {
    const pais = d.prerequisitos.filter((p) => periodoExigido(p) === null && porCodigo.has(p));
    prereqsPorNo.set(d.codigo, pais);
    for (const p of pais) arestas.push({ id: `${p}->${d.codigo}`, de: p, para: d.codigo });
  }

  // --- faixa 1: obrigatórias, coluna = período ---
  const periodos = [...new Set(obrigatorias.map((d) => d.periodo))].sort((a, b) => a - b);
  const colunasObr = new Map<number, string[]>();
  for (const [indice, per] of periodos.entries()) {
    colunasObr.set(
      indice,
      obrigatorias
        .filter((d) => d.periodo === per)
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
        .map((d) => d.codigo),
    );
  }
  ordenarPorBaricentro(colunasObr, prereqsPorNo);

  // A matriz 844 tem alguns pré-requisitos cuja coluna declarada é posterior à
  // da dependente. A posição precisa respeitar a cadeia, não só o período bruto.
  const colunaDe = new Map<string, number>();
  for (const [col, ids] of colunasObr) for (const id of ids) colunaDe.set(id, col);
  for (let passada = 0; passada < obrigatorias.length; passada++) {
    let mudou = false;
    for (const [codigo, pais] of prereqsPorNo) {
      if (!colunaDe.has(codigo)) continue;
      const maiorPai = Math.max(-1, ...pais.map((p) => colunaDe.get(p) ?? -1));
      const atual = colunaDe.get(codigo)!;
      if (maiorPai >= atual) {
        colunaDe.set(codigo, maiorPai + 1);
        mudou = true;
      }
    }
    if (!mudou) break;
  }

  const colunasReais = new Map<number, string[]>();
  for (const d of obrigatorias) {
    const col = colunaDe.get(d.codigo) ?? 0;
    if (!colunasReais.has(col)) colunasReais.set(col, []);
    colunasReais.get(col)!.push(d.codigo);
  }
  for (const ids of colunasReais.values()) {
    ids.sort((a, b) => nosPorId.get(a)!.nome.localeCompare(nosPorId.get(b)!.nome, "pt-BR"));
  }
  ordenarPorBaricentro(colunasReais, prereqsPorNo);

  let maxLinhasObr = 0;
  for (const [col, ids] of colunasReais) {
    maxLinhasObr = Math.max(maxLinhasObr, ids.length);
    ids.forEach((id, i) => {
      const n = nosPorId.get(id)!;
      n.x = xDaColuna(col);
      n.y = PADDING + ALTURA_CABECALHO_FAIXA + i * (ALTURA_NO + GAP_Y);
    });
  }

  const alturaFaixaObr =
    ALTURA_CABECALHO_FAIXA + maxLinhasObr * (ALTURA_NO + GAP_Y) + PADDING / 2;

  // --- faixa 2 (quando houver): 2º estrato, coluna = profundidade após os pré-requisitos ---
  // A coluna é a do período do pré-requisito mais tardio, para a aresta continuar
  // sempre da esquerda para a direita.
  const colunasEst2 = new Map<number, string[]>();
  for (const d of segundoEstrato) {
    const colsPais = (prereqsPorNo.get(d.codigo) ?? [])
      .map((p) => colunaDe.get(p))
      .filter((v): v is number => v !== undefined);
    const col = colsPais.length ? Math.max(...colsPais) + 1 : 2;
    colunaDe.set(d.codigo, col);
    if (!colunasEst2.has(col)) colunasEst2.set(col, []);
    colunasEst2.get(col)!.push(d.codigo);
  }
  for (const ids of colunasEst2.values()) {
    ids.sort((a, b) => nosPorId.get(a)!.nome.localeCompare(nosPorId.get(b)!.nome, "pt-BR"));
  }
  ordenarPorBaricentro(colunasEst2, prereqsPorNo);

  const yFaixaEst2 = PADDING + alturaFaixaObr + 32;
  let maxLinhasEst2 = 0;
  for (const [col, ids] of colunasEst2) {
    maxLinhasEst2 = Math.max(maxLinhasEst2, ids.length);
    ids.forEach((id, i) => {
      const n = nosPorId.get(id)!;
      n.x = xDaColuna(col);
      n.y = yFaixaEst2 + ALTURA_CABECALHO_FAIXA + i * (ALTURA_NO + GAP_Y);
    });
  }
  const alturaFaixaEst2 =
    ALTURA_CABECALHO_FAIXA + maxLinhasEst2 * (ALTURA_NO + GAP_Y) + PADDING / 2;

  const totalColunas = Math.max(
    ...[...colunasReais.keys()].map((c) => c + 1),
    ...[...colunasEst2.keys()].map((c) => c + 1),
    1,
  );

  const faixas: FaixaFluxo[] = [
    {
      id: "obrigatorias",
      rotulo: curso.matriz === 981 ? "Obrigatórias — 1º Estrato" : "Obrigatórias",
      subrotulo: "Uma coluna por período previsto na matriz",
      y: PADDING,
      altura: alturaFaixaObr,
    },
  ];
  if (segundoEstrato.length > 0) {
    faixas.push({
      id: "segundoEstrato",
      rotulo: "2º Estrato",
      subrotulo: "Cursáveis após seus pré-requisitos",
      y: yFaixaEst2,
      altura: alturaFaixaEst2,
    });
  }

  return {
    nos,
    arestas,
    faixas,
    colunas: Array.from({ length: totalColunas }, (_, i) => ({
      rotulo: periodos[i] ? `${periodos[i]}º período` : "Etapa adicional",
      x: xDaColuna(i),
    })),
    largura: xDaColuna(totalColunas - 1) + LARGURA_NO + PADDING,
    altura: segundoEstrato.length > 0 ? yFaixaEst2 + alturaFaixaEst2 + PADDING : PADDING + alturaFaixaObr + PADDING,
  };
}

/** Uma raia do board: o conjunto que a nomeia e as disciplinas que caem nela. */
interface Raia {
  id: number;
  nome: string;
  /** carga que o conjunto exige, para o subrótulo */
  ch: number;
  /** disciplinas da raia, já filtradas por oferta conhecida */
  disciplinas: DisciplinaMatriz[];
}

/**
 * Board de raias: uma faixa por conjunto, com a árvore de pré-requisitos dentro.
 *
 * Serve tanto às trilhas quanto aos grupos de escolha da 968 — a diferença
 * entre eles é curricular, não visual: nos dois casos o aluno escolhe dentro de
 * um conjunto que tem carga própria a cumprir.
 */
function montarBoardRaias(
  matriz: Matriz,
  raias: Raia[],
  grupoCor: GrupoCor,
  rotuloCarga: (r: Raia) => string,
): Board {
  const porCodigo = new Map(matriz.disciplinas.map((d) => [d.codigo, d]));

  const nos: NoFluxo[] = [];
  const arestas: ArestaFluxo[] = [];
  const faixas: FaixaFluxo[] = [];
  let yAtual = PADDING;
  let maxColunas = 1;

  for (const trilha of raias) {
    const daTrilha = trilha.disciplinas;
    if (daTrilha.length === 0) continue; // conjunto sem oferta conhecida não vira raia

    const internos = new Set(daTrilha.map((d) => d.codigo));
    const idNo = (codigo: string) => `${trilha.id}:${codigo}`;

    // fantasmas: pré-requisitos que não pertencem à raia
    const fantasmas = new Set<string>();
    const prereqsPorNo = new Map<string, string[]>();
    for (const d of daTrilha) {
      const pais: string[] = [];
      for (const p of d.prerequisitos) {
        if (periodoExigido(p) !== null) continue;
        if (!porCodigo.has(p)) continue;
        if (!internos.has(p)) fantasmas.add(p);
        pais.push(idNo(p));
      }
      prereqsPorNo.set(idNo(d.codigo), pais);
    }

    for (const codigo of fantasmas) {
      const d = porCodigo.get(codigo)!;
      nos.push(noDe(d, matriz, { id: idNo(codigo), externo: true, grupo: "externo" }));
      prereqsPorNo.set(idNo(codigo), []);
    }
    for (const d of daTrilha) nos.push(noDe(d, matriz, { id: idNo(d.codigo), grupo: grupoCor }));

    for (const [para, pais] of prereqsPorNo) {
      for (const de of pais) arestas.push({ id: `${de}->${para}`, de, para });
    }

    // profundidade dentro da raia: fantasma na coluna 0, o resto após seus pais
    const profundidade = new Map<string, number>();
    const calcular = (id: string, visitando = new Set<string>()): number => {
      if (profundidade.has(id)) return profundidade.get(id)!;
      if (visitando.has(id)) return 0; // ciclo defensivo
      visitando.add(id);
      const pais = prereqsPorNo.get(id) ?? [];
      const d = pais.length ? Math.max(...pais.map((p) => calcular(p, visitando))) + 1 : 0;
      visitando.delete(id);
      profundidade.set(id, d);
      return d;
    };
    for (const id of prereqsPorNo.keys()) calcular(id);

    const colunas = new Map<number, string[]>();
    for (const [id, col] of profundidade) {
      if (!colunas.has(col)) colunas.set(col, []);
      colunas.get(col)!.push(id);
    }
    const nomeDe = new Map(nos.map((n) => [n.id, n.nome]));
    for (const ids of colunas.values()) {
      ids.sort((a, b) => (nomeDe.get(a) ?? "").localeCompare(nomeDe.get(b) ?? "", "pt-BR"));
    }
    ordenarPorBaricentro(colunas, prereqsPorNo);

    let maxLinhas = 0;
    const nosPorId = new Map(nos.map((n) => [n.id, n]));
    for (const [col, ids] of colunas) {
      maxColunas = Math.max(maxColunas, col + 1);
      maxLinhas = Math.max(maxLinhas, ids.length);
      ids.forEach((id, i) => {
        const n = nosPorId.get(id)!;
        n.x = xDaColuna(col);
        n.y = yAtual + ALTURA_CABECALHO_FAIXA + i * (ALTURA_NO + GAP_Y);
      });
    }

    const alturaFaixa = ALTURA_CABECALHO_FAIXA + maxLinhas * (ALTURA_NO + GAP_Y) + PADDING / 2;
    faixas.push({
      id: String(trilha.id),
      rotulo: trilha.nome,
      subrotulo: rotuloCarga(trilha),
      y: yAtual,
      altura: alturaFaixa,
    });
    yAtual += alturaFaixa + 32;
  }

  return {
    nos,
    arestas,
    faixas,
    colunas: [],
    largura: xDaColuna(maxColunas - 1) + LARGURA_NO + PADDING,
    altura: yAtual + PADDING,
  };
}

/**
 * Board das trilhas do curso, restrito às disciplinas efetivamente abertas.
 * @param codigosAbertos códigos que apareceram na oferta de algum semestre conhecido
 */
export function montarBoardTrilhas(matriz: Matriz, codigosAbertos: Set<string>): Board {
  const curso = descricaoDoCurso(matriz);
  // Entra tudo que soma para o bloco optativo, e não só o que valida trilha:
  // "973 Optativas Isoladas" na 844 e "1186 Optativas" na 968 contam para a
  // carga do bloco e ficavam fora do desenho.
  const raias: Raia[] = Object.entries(matriz.conjuntos)
    .filter(([id]) => contaNoBlocoOptativo(curso, id) && !conjuntoTemFilho(matriz, id))
    .map(([id, c]) => ({
      id: Number(id),
      nome: c.nome,
      ch: c.ch,
      // a disciplina pode estar numa subárea da trilha: em Sistemas IoT (1226)
      // ela mora em 1227..1233, três níveis abaixo do agregador
      disciplinas: matriz.disciplinas.filter(
        (d) =>
          codigosAbertos.has(d.codigo) &&
          (d.conjunto === Number(id) || conjuntoAncestral(curso, d.conjunto, Number(id))),
      ),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return montarBoardRaias(
    matriz,
    raias,
    "trilha",
    (r) =>
      `${r.disciplinas.length} ${r.disciplinas.length === 1 ? "disciplina aberta" : "disciplinas abertas"} · ${r.ch}h exigidas`,
  );
}

/**
 * Board dos grupos de escolha ("Opções de …"), uma raia por grupo.
 *
 * É o board que faltava para a matriz 968: são 25 grupos somando 1875h, quase
 * metade do curso. Sem ele o fluxograma mostrava 27 das 201 disciplinas e dava
 * a impressão de que o currículo cabia nas obrigatórias.
 *
 * O subrótulo diz o que o aluno de fato decide ali: quantas horas escolher de
 * quantas ofertadas.
 */
export function montarBoardOpcoes(matriz: Matriz, codigosAbertos: Set<string>): Board {
  const curso = descricaoDoCurso(matriz);
  // Grupos "Opções de …" mais as categorias de escolha do curso — Ciclo de
  // Humanidades, Opção de Expressão Gráfica. São a mesma decisão do ponto de
  // vista do aluno: escolher N horas dentro de um conjunto. A pool de eletivas
  // fica fora porque é disciplina de fora da matriz, sem lista a desenhar.
  const conjuntos = [
    ...(curso.gruposOpcao ?? []),
    ...curso.categorias.filter((c) => c.id !== "eletivas" && c.id !== "segundoEstrato").map((c) => c.conjunto),
  ];
  const raias: Raia[] = conjuntos
    .map((g) => {
      const conj = matriz.conjuntos[String(g)];
      return {
        id: g,
        nome: conj?.nome ?? String(g),
        ch: conj?.ch ?? 0,
        disciplinas: matriz.disciplinas.filter(
          (d) =>
            codigosAbertos.has(d.codigo) &&
            (grupoOpcaoDe(curso, d.conjunto) === g ||
              d.conjunto === g ||
              conjuntoAncestral(curso, d.conjunto, g)),
        ),
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return montarBoardRaias(matriz, raias, "opcao", (r) => {
    const ofertadas = r.disciplinas.reduce((a, d) => a + (d.horas.total || d.horas.chead), 0);
    return `escolher ${r.ch}h de ${ofertadas}h abertas · ${r.disciplinas.length} ${
      r.disciplinas.length === 1 ? "disciplina" : "disciplinas"
    }`;
  });
}

/** true quando o conjunto tem subárea: quem vira raia é a folha, não o agregador. */
function conjuntoTemFilho(matriz: Matriz, id: string): boolean {
  return Object.values(matriz.conjuntos).some((c) => String((c as { pai?: unknown }).pai) === id);
}

/** true quando `alvo` é ancestral do conjunto na árvore da matriz. */
function conjuntoAncestral(
  curso: ReturnType<typeof descricaoDoCurso>,
  conjunto: number | null,
  alvo: number,
): boolean {
  if (conjunto === null) return false;
  let atual: number | undefined = conjunto;
  for (let i = 0; i < 8 && atual !== undefined; i++) {
    if (atual === alvo) return true;
    atual = curso.hierarquia?.[atual];
  }
  return false;
}

/** Códigos que apareceram na oferta de qualquer um dos semestres informados, normalizados para a matriz atual. */
export function codigosOfertados(matriz: Matriz, ofertas: { disciplinas: { codigo: string; nome: string }[] }[]): Set<string> {
  const map = criarMapaIdentidade(matriz);
  const s = new Set<string>();
  for (const o of ofertas) {
    for (const d of o.disciplinas) {
      s.add(map.resolver(d.codigo));
      const porNome = map.resolverPorNome(d.nome);
      if (porNome) s.add(porNome);
    }
  }
  return s;
}
