// Tipos da camada de avaliações da comunidade (Estrategia.md §6).
//
// O acervo é ÚNICO e global: não é particionado por curso. Uma avaliação de
// "Professor X em Estruturas de Dados" vale para BSI e para Eng. Comp., porque é
// a mesma pessoa dando a mesma matéria (§6.10).

/** Nota de 1 a 5. 1 = pouco/fácil, 5 = muito/difícil. */
export type Estrelas = 1 | 2 | 3 | 4 | 5;

/** Como a disciplina foi avaliada, na percepção de quem cursou. */
export type SistemaAvaliativo = "provas" | "trabalhos" | "misto";

/**
 * Tags admitidas. Critério de admissão (§6.5): toda tag precisa ser explicável
 * por COMPORTAMENTO OBSERVÁVEL. Traço de personalidade não entra — não é
 * verificável, não ajuda a decidir turma, e é a superfície de risco difamatório
 * que a TASK-08 isola.
 */
export const TAGS = [
  // conteúdo e avaliação
  "cobra-so-o-ensinado",
  "cobra-alem-do-ensinado",
  "prova-com-consulta",
  "da-revisao-antes-da-prova",
  "oferece-substitutiva",
  "trabalho-em-grupo-pesado",
  // didática e material
  "slides-bastam",
  "aula-pratica",
  "resolve-exercicio-em-aula",
  "aula-gravada",
  // comunicação e trato
  "acessivel",
  "pouco-acessivel",
  "trata-com-respeito",
  "aberto-a-rever-nota",
  // rotina e prazos
  "chamada-rigorosa",
  "chamada-flexivel",
  "prazos-rigidos",
  "aceita-atraso",
  "corrige-rapido",
  "corrige-devagar",
] as const;

export type Tag = (typeof TAGS)[number];

export type CategoriaTag = "conteudo" | "didatica" | "comunicacao" | "rotina";

export const CATEGORIAS_TAG: { id: CategoriaTag; rotulo: string; tags: Tag[] }[] = [
  {
    id: "conteudo",
    rotulo: "Conteúdo e avaliação",
    tags: [
      "cobra-so-o-ensinado",
      "cobra-alem-do-ensinado",
      "prova-com-consulta",
      "da-revisao-antes-da-prova",
      "oferece-substitutiva",
      "trabalho-em-grupo-pesado",
    ],
  },
  {
    id: "didatica",
    rotulo: "Didática e material",
    tags: ["slides-bastam", "aula-pratica", "resolve-exercicio-em-aula", "aula-gravada"],
  },
  {
    id: "comunicacao",
    rotulo: "Comunicação e trato",
    tags: ["acessivel", "pouco-acessivel", "trata-com-respeito", "aberto-a-rever-nota"],
  },
  {
    id: "rotina",
    rotulo: "Rotina e prazos",
    tags: [
      "chamada-rigorosa",
      "chamada-flexivel",
      "prazos-rigidos",
      "aceita-atraso",
      "corrige-rapido",
      "corrige-devagar",
    ],
  },
];

/**
 * Pares que se contradizem. Marcar os dois não é opinião matizada, é dado
 * incoerente: ninguém teve um professor que respondia rápido e não respondia.
 * A interface troca um pelo outro, e a validação recusa quem insistir.
 */
export const TAGS_OPOSTAS: [Tag, Tag][] = [
  ["cobra-so-o-ensinado", "cobra-alem-do-ensinado"],
  ["acessivel", "pouco-acessivel"],
  ["chamada-rigorosa", "chamada-flexivel"],
  ["prazos-rigidos", "aceita-atraso"],
  ["corrige-rapido", "corrige-devagar"],
];

/** A tag oposta a esta, se houver. */
export function opostaDe(tag: Tag): Tag | undefined {
  for (const [a, b] of TAGS_OPOSTAS) {
    if (a === tag) return b;
    if (b === tag) return a;
  }
  return undefined;
}

/** Rótulo legível e o comportamento observável que justifica cada tag. */
export const DESCRICAO_TAG: Record<Tag, { rotulo: string; comportamento: string }> = {
  "cobra-so-o-ensinado": { rotulo: "Cobra só o ensinado", comportamento: "A prova não traz assunto fora do que foi dado em aula e lista" },
  "cobra-alem-do-ensinado": { rotulo: "Cobra além do ensinado", comportamento: "A prova traz assunto não coberto em aula nem em lista" },
  "prova-com-consulta": { rotulo: "Prova com consulta", comportamento: "Permite formulário, anotações ou material durante a avaliação" },
  "da-revisao-antes-da-prova": { rotulo: "Dá revisão antes da prova", comportamento: "Existe aula de revisão antes da avaliação" },
  "oferece-substitutiva": { rotulo: "Oferece substitutiva", comportamento: "Existe segunda chance formal de avaliação" },
  "trabalho-em-grupo-pesado": { rotulo: "Trabalho em grupo pesado", comportamento: "Parcela relevante da nota depende de trabalho em grupo" },
  "slides-bastam": { rotulo: "Slides bastam", comportamento: "O material publicado permite estudar sem assistir à aula" },
  "aula-pratica": { rotulo: "Aula prática", comportamento: "O tempo de aula é majoritariamente mão na massa" },
  "resolve-exercicio-em-aula": { rotulo: "Resolve exercício em aula", comportamento: "Dedica parte da aula a resolver exercícios no quadro" },
  "aula-gravada": { rotulo: "Aula gravada", comportamento: "Disponibiliza gravação ou material equivalente depois da aula" },
  "acessivel": { rotulo: "Acessível", comportamento: "Mantém canal aberto e responde em prazo razoável fora de aula" },
  "pouco-acessivel": { rotulo: "Pouco acessível", comportamento: "Comunicação difícil, demora ou não responde fora de aula" },
  "trata-com-respeito": { rotulo: "Trata a turma com respeito", comportamento: "Não expõe nem constrange aluno em público" },
  "aberto-a-rever-nota": { rotulo: "Aberto a rever nota", comportamento: "Aceita e analisa pedido de revisão de correção" },
  "chamada-rigorosa": { rotulo: "Chamada rigorosa", comportamento: "Faz chamada com regularidade e aplica a reprovação por falta" },
  "chamada-flexivel": { rotulo: "Chamada flexível", comportamento: "Não faz chamada sempre, ou aprova apesar de volume alto de faltas" },
  "prazos-rigidos": { rotulo: "Prazos rígidos", comportamento: "Não aceita entrega fora do prazo" },
  "aceita-atraso": { rotulo: "Aceita atraso", comportamento: "Há política explícita de entrega atrasada" },
  "corrige-rapido": { rotulo: "Corrige rápido", comportamento: "A nota sai antes da avaliação seguinte" },
  "corrige-devagar": { rotulo: "Corrige devagar", comportamento: "A nota sai perto do fim do semestre" },
};

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
  /** Vem do histórico: a opinião de quem reprovou é contexto legítimo. */
  situacao: "aprovado" | "reprovado";
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
  tags: Tag[];
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
  /** Tags ordenadas por frequência. */
  tags: { tag: Tag; n: number }[];
  /** As avaliações que compõem o agregado, mais recentes primeiro. */
  reviews: Review[];
}
