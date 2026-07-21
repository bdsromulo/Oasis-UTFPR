import type { DisciplinaMatriz, Matriz } from "../tipos";
import { descricaoDoCurso, ehTrilha, categoriaSimples } from "../cursos";

/**
 * Monta os dois boards do fluxograma de progressão do curso, já com as posições
 * calculadas — a tela só desenha o que sai daqui.
 *
 * Board "obrigatorias": roster oficial da matriz. As obrigatórias ocupam uma
 * coluna por período; o 2º estrato vai para uma faixa própria abaixo, porque na
 * matriz todas figuram no 3º período mas são cursáveis do 3º ao 6º — empilhá-las
 * na coluna 3 distorceria a leitura do fluxo.
 *
 * Board "trilhas": uma raia por trilha do 3º estrato, contendo apenas disciplinas
 * que efetivamente abriram em algum semestre conhecido. Pré-requisitos que moram
 * fora da raia (obrigatórias, 2º estrato) entram como nós fantasma na coluna 0,
 * para que a árvore não comece no ar.
 */

export const LARGURA_NO = 190;
export const ALTURA_NO = 74;
const GAP_X = 78;
const GAP_Y = 22;
const PADDING = 40;
const ALTURA_CABECALHO_FAIXA = 44;

export type GrupoCor =
  | "basica"
  | "profissional"
  | "humanistica"
  | "estagio"
  | "conclusao"
  | "atividades"
  | "segundoEstrato"
  | "trilha"
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

function grupoDe(d: DisciplinaMatriz): GrupoCor {
  const curso = descricaoDoCurso(981);
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
  opts: { id?: string; externo?: boolean; grupo?: GrupoCor } = {},
): NoFluxo {
  const exig = d.prerequisitos.map(periodoExigido).find((v): v is number => v !== null) ?? null;
  return {
    id: opts.id ?? d.codigo,
    codigo: d.codigo,
    nome: d.nome,
    periodo: d.periodo,
    horas: d.horas.total,
    grupo: opts.grupo ?? grupoDe(d),
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
  const segundoEstrato = matriz.disciplinas.filter((d) => d.conjunto === conjSegundoEstrato);
  const renderizadas = [...obrigatorias, ...segundoEstrato];
  const porCodigo = new Map(renderizadas.map((d) => [d.codigo, d]));

  const nos: NoFluxo[] = renderizadas.map((d) => noDe(d));
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
  for (const per of periodos) {
    colunasObr.set(
      per,
      obrigatorias
        .filter((d) => d.periodo === per)
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
        .map((d) => d.codigo),
    );
  }
  ordenarPorBaricentro(colunasObr, prereqsPorNo);

  let maxLinhasObr = 0;
  for (const [per, ids] of colunasObr) {
    maxLinhasObr = Math.max(maxLinhasObr, ids.length);
    ids.forEach((id, i) => {
      const n = nosPorId.get(id)!;
      n.x = xDaColuna(periodos.indexOf(per));
      n.y = PADDING + ALTURA_CABECALHO_FAIXA + i * (ALTURA_NO + GAP_Y);
    });
  }

  const alturaFaixaObr =
    ALTURA_CABECALHO_FAIXA + maxLinhasObr * (ALTURA_NO + GAP_Y) + PADDING / 2;

  // --- faixa 2: 2º estrato, coluna = profundidade após os pré-requisitos ---
  // A coluna é a do período do pré-requisito mais tardio, para a aresta continuar
  // sempre da esquerda para a direita.
  const colunaDe = new Map<string, number>();
  for (const [per, ids] of colunasObr) for (const id of ids) colunaDe.set(id, periodos.indexOf(per));

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
    periodos.length,
    ...[...colunasEst2.keys()].map((c) => c + 1),
    1,
  );

  return {
    nos,
    arestas,
    faixas: [
      {
        id: "obrigatorias",
        rotulo: "Obrigatórias — 1º Estrato",
        subrotulo: "Uma coluna por período previsto na matriz",
        y: PADDING,
        altura: alturaFaixaObr,
      },
      {
        id: "segundoEstrato",
        rotulo: "2º Estrato",
        subrotulo: "Cursáveis do 3º ao 6º período · posicionadas após seus pré-requisitos",
        y: yFaixaEst2,
        altura: alturaFaixaEst2,
      },
    ],
    colunas: periodos.map((p, i) => ({ rotulo: `${p}º período`, x: xDaColuna(i) })),
    largura: xDaColuna(totalColunas - 1) + LARGURA_NO + PADDING,
    altura: yFaixaEst2 + alturaFaixaEst2 + PADDING,
  };
}

/**
 * Board das trilhas do 3º estrato, restrito às disciplinas efetivamente abertas.
 * @param codigosAbertos códigos que apareceram na oferta de algum semestre conhecido
 */
export function montarBoardTrilhas(matriz: Matriz, codigosAbertos: Set<string>): Board {
  const porCodigo = new Map(matriz.disciplinas.map((d) => [d.codigo, d]));

  const trilhas = Object.entries(matriz.conjuntos)
    .filter(([id]) => ehTrilha(descricaoDoCurso(matriz), id))
    .map(([id, c]) => ({ id: Number(id), nome: c.nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const nos: NoFluxo[] = [];
  const arestas: ArestaFluxo[] = [];
  const faixas: FaixaFluxo[] = [];
  let yAtual = PADDING;
  let maxColunas = 1;

  for (const trilha of trilhas) {
    const daTrilha = matriz.disciplinas.filter(
      (d) => d.conjunto === trilha.id && codigosAbertos.has(d.codigo),
    );
    if (daTrilha.length === 0) continue; // trilha sem oferta conhecida não vira raia

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
      nos.push(noDe(d, { id: idNo(codigo), externo: true, grupo: "externo" }));
      prereqsPorNo.set(idNo(codigo), []);
    }
    for (const d of daTrilha) nos.push(noDe(d, { id: idNo(d.codigo), grupo: "trilha" }));

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
      subrotulo: `${daTrilha.length} ${daTrilha.length === 1 ? "disciplina aberta" : "disciplinas abertas"} · ${matriz.conjuntos[String(trilha.id)]?.ch ?? 90}h exigidas`,
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

/** Códigos que apareceram na oferta de qualquer um dos semestres informados. */
export function codigosOfertados(ofertas: { disciplinas: { codigo: string }[] }[]): Set<string> {
  const s = new Set<string>();
  for (const o of ofertas) for (const d of o.disciplinas) s.add(d.codigo);
  return s;
}
