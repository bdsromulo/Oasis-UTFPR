// Tipos da camada de avaliações da comunidade (Estrategia.md §6).
//
// O acervo é ÚNICO e global: não é particionado por curso. Uma avaliação de
// "Professor X em Estruturas de Dados" vale para BSI e para Eng. Comp., porque é
// a mesma pessoa dando a mesma matéria (§6.10).

/** Nota de 1 a 5. 1 = pouco/fácil, 5 = muito/difícil. */
export type Estrelas = 1 | 2 | 3 | 4 | 5;

/** Como a disciplina foi avaliada, na percepção de quem cursou. */
export type SistemaAvaliativo = "provas" | "trabalhos" | "misto";

/** Limite do campo aberto, conforme §6.3. */
export const LIMITE_COMENTARIO = 1000;

/**
 * Uma avaliação publicada. Corresponde a uma linha aprovada da planilha, já
 * validada e regenerada no `data/reviews.json` (§6.6).
 */
export interface Review {
  /** Hash estável da linha de origem — torna a regeneração idempotente. */
  id: string;
  /**
   * Slug do roster curado. Ausente enquanto a avaliação está pendente de
   * moderação pela rota "Professor Não Ofertado" (§6.4).
   */
  professorId?: string;
  /** Nome digitado pelo aluno quando o docente não constava do elenco. */
  professorTexto?: string;
  /** Código da disciplina como cursado. A leitura resolve equivalências (§6.10). */
  codigo: string;
  /** Semestre em que a disciplina foi cursada, no formato "2025/2". */
  semestre: string;
  /**
   * Ausente nas avaliações vindas do formulário, que não pergunta isso: quem
   * reprovou não tem por que declarar a reprovação em público, e perguntar
   * convidaria à omissão. Ausência significa "não informado", nunca "aprovado".
   */
  situacao?: "aprovado" | "reprovado";
  /** Nome completo (ou nome social completo) de quem assina — público (RNF06). */
  autor: string;
  geral: Estrelas;
  didatica: Estrelas;
  dificuldade: Estrelas;
  cargaTrabalho: Estrelas;
  avaliacao: SistemaAvaliativo;
  /**
   * Detalhamento opcional da composição da nota. Ausente quando quem avaliou não
   * abriu a seção — e ausência não é zero: significa "não informado".
   */
  qtdProvas?: number;
  qtdTrabalhos?: number;
  comentario: string;
}

/** Teto de sanidade para o detalhamento: acima disso é digitação errada. */
export const MAX_AVALIACOES_NO_SEMESTRE = 20;

/** Formato do arquivo publicado. */
export interface AcervoReviews {
  fonte: string;
  geradoEm: string;
  reviews: Review[];
}

/** Médias e contagens de um conjunto de avaliações. */
export interface AgregadoReviews {
  /** Quantas avaliações compõem o agregado. */
  n: number;
  /**
   * `false` quando `n` está abaixo do limiar: os comentários podem ser exibidos,
   * as médias não. Com n baixo o agregado mente — 1 de 1 vira "100%" (§6.6).
   */
  estatisticaExibivel: boolean;
  geral: number | null;
  didatica: number | null;
  dificuldade: number | null;
  cargaTrabalho: number | null;
  /** Contagem por sistema avaliativo, da mais citada para a menos. */
  avaliacao: { sistema: SistemaAvaliativo; n: number }[];
  /** As avaliações que compõem o agregado, mais recentes primeiro. */
  reviews: Review[];
}
