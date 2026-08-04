// Consulta e agregação do acervo de avaliações (Estrategia.md §6.3, §6.6 e §6.10).
//
// O acervo é único e global. Quem lê é que resolve o código pela identidade do
// SEU curso: se a mesma exigência curricular tem código distinto entre matrizes,
// as avaliações continuam sendo um acervo só do ponto de vista do leitor.
import type { MapaIdentidade } from "../motor/identidade";
import { unidadeInclui } from "./professores";
import type { AgregadoReviews, Review, SistemaAvaliativo } from "./tipos";

/**
 * Abaixo deste número de avaliações, os comentários aparecem mas as médias não.
 *
 * Com n baixo o agregado mente: uma única avaliação vira "5,0 de didática" e
 * soa como consenso. O valor é calibração de produto; a regra é estrutural.
 */
export const LIMIAR_ESTATISTICA = 3;

/** Só avaliações já promovidas ao roster entram na leitura pública. */
export function publicaveis(reviews: Review[]): Review[] {
  return reviews.filter((r) => !!r.professorId);
}

/** Ordena da mais recente para a mais antiga, pelo semestre cursado. */
function maisRecentePrimeiro(a: Review, b: Review): number {
  return b.semestre.localeCompare(a.semestre);
}

function media(valores: number[]): number | null {
  if (!valores.length) return null;
  return Math.round((valores.reduce((s, v) => s + v, 0) / valores.length) * 10) / 10;
}

/** Calcula médias, contagens e ordenações de um conjunto de avaliações. */
export function agregar(reviews: Review[], limiar = LIMIAR_ESTATISTICA): AgregadoReviews {
  const n = reviews.length;
  const exibivel = n >= limiar;

  const porSistema = new Map<SistemaAvaliativo, number>();
  for (const r of reviews) {
    porSistema.set(r.avaliacao, (porSistema.get(r.avaliacao) ?? 0) + 1);
  }

  return {
    n,
    estatisticaExibivel: exibivel,
    geral: exibivel ? media(reviews.map((r) => r.geral)) : null,
    didatica: exibivel ? media(reviews.map((r) => r.didatica)) : null,
    dificuldade: exibivel ? media(reviews.map((r) => r.dificuldade)) : null,
    cargaTrabalho: exibivel ? media(reviews.map((r) => r.cargaTrabalho)) : null,
    avaliacao: [...porSistema]
      .map(([sistema, qtd]) => ({ sistema, n: qtd }))
      .sort((a, b) => b.n - a.n || a.sistema.localeCompare(b.sistema)),
    reviews: [...reviews].sort(maisRecentePrimeiro),
  };
}

export interface ConsultaAcervo {
  /** Avaliações de uma disciplina, somando todos os códigos equivalentes. */
  daDisciplina(codigo: string): Review[];
  /** Avaliações de uma unidade docente (pessoa ou dupla), em todas as disciplinas. */
  doProfessor(unidadeId: string): Review[];
  /** O par que a TASK-27 exibe: uma unidade numa disciplina específica. */
  doParProfessorDisciplina(unidadeId: string, codigo: string): Review[];
  /**
   * Avaliações de QUALQUER unidade que inclua este docente individual — inclusive
   * as turmas em que ele dividiu a disciplina com outra pessoa. É o que permite
   * ver o histórico de alguém sem perder as turmas ministradas em dupla.
   */
  doDocenteIndividual(slugDocente: string): Review[];
  /** Unidades docentes com avaliação registrada para uma disciplina. */
  professoresAvaliados(codigo: string): string[];
}

/**
 * Cria a camada de consulta para um curso.
 *
 * `mapa` é o `MapaIdentidade` do curso de quem está lendo — é ele que faz uma
 * avaliação submetida sob o código de uma matriz aparecer para quem cursa outra.
 */
export function criarConsulta(reviews: Review[], mapa: MapaIdentidade): ConsultaAcervo {
  const publicas = publicaveis(reviews);

  // índice por código canônico do curso do leitor
  const porCanonico = new Map<string, Review[]>();
  for (const r of publicas) {
    const canonico = mapa.resolver(r.codigo);
    if (!porCanonico.has(canonico)) porCanonico.set(canonico, []);
    porCanonico.get(canonico)!.push(r);
  }

  const daDisciplina = (codigo: string): Review[] => porCanonico.get(mapa.resolver(codigo)) ?? [];

  return {
    daDisciplina,
    doProfessor: (unidadeId) => publicas.filter((r) => r.professorId === unidadeId),
    doParProfessorDisciplina: (unidadeId, codigo) =>
      daDisciplina(codigo).filter((r) => r.professorId === unidadeId),
    doDocenteIndividual: (slugDocente) =>
      publicas.filter((r) => unidadeInclui(r.professorId!, slugDocente)),
    professoresAvaliados: (codigo) => [
      ...new Set(daDisciplina(codigo).map((r) => r.professorId!)),
    ],
  };
}
