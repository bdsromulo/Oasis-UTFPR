// Consulta e agregação do acervo de avaliações (Estrategia.md §6.3, §6.6 e §6.10).
//
// O acervo é único e global. Quem lê é que resolve o código pela identidade do
// SEU curso: se a mesma exigência curricular tem código distinto entre matrizes,
// as avaliações continuam sendo um acervo só do ponto de vista do leitor.
import type { MapaIdentidade } from "../motor/identidade";
import type { AgregadoReviews, Review, SistemaAvaliativo, Tag } from "./tipos";

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
  const porTag = new Map<Tag, number>();
  for (const r of reviews) {
    porSistema.set(r.avaliacao, (porSistema.get(r.avaliacao) ?? 0) + 1);
    // um mesmo registro não pode contar a mesma tag duas vezes
    for (const t of new Set(r.tags)) porTag.set(t, (porTag.get(t) ?? 0) + 1);
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
    tags: [...porTag]
      .map(([tag, qtd]) => ({ tag, n: qtd }))
      .sort((a, b) => b.n - a.n || a.tag.localeCompare(b.tag)),
    reviews: [...reviews].sort(maisRecentePrimeiro),
  };
}

export interface ConsultaAcervo {
  /** Avaliações de uma disciplina, somando todos os códigos equivalentes. */
  daDisciplina(codigo: string): Review[];
  /** Avaliações de um docente, em todas as disciplinas que deu. */
  doProfessor(professorId: string): Review[];
  /** O par que a TASK-27 exibe: um docente numa disciplina específica. */
  doParProfessorDisciplina(professorId: string, codigo: string): Review[];
  /** Docentes com avaliação registrada para uma disciplina. */
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
    doProfessor: (professorId) => publicas.filter((r) => r.professorId === professorId),
    doParProfessorDisciplina: (professorId, codigo) =>
      daDisciplina(codigo).filter((r) => r.professorId === professorId),
    professoresAvaliados: (codigo) => [
      ...new Set(daDisciplina(codigo).map((r) => r.professorId!)),
    ],
  };
}
