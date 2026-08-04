// Montagem do link pré-preenchido do Google Forms.
//
// A pesquisabilidade que o Forms não tem mora no Oásis: o aluno acha a disciplina
// e o professor aqui, onde a busca já funciona, e o formulário chega pronto. O
// prefill NÃO trava campo — o respondente pode editar antes de enviar —, então
// isto é conveniência, e a validação da ingestão continua sendo a defesa real.
//
// Nada aqui é segredo: o formulário é público por natureza, e a fronteira de
// confiança fica na planilha, onde envio nenhum vira acervo sem aprovação humana.

/** Alvo da avaliação: uma disciplina cursada num semestre específico. */
export interface AlvoAvaliacao {
  codigo: string;
  nome: string;
  semestre: string;
  /**
   * Contexto de tela, não de envio: a lista marca as reprovadas para a pessoa se
   * localizar. O formulário não pergunta isso — quem reprovou não tem por que
   * declarar em público, e perguntar convidaria à omissão.
   */
  situacao?: "aprovado" | "reprovado";
}

/**
 * Base do formulário publicado, terminada em `/viewform`.
 *
 * Vazia desliga a coleta: a plataforma segue exibindo avaliações e apenas não
 * oferece o botão de avaliar. É a degradação pretendida caso o formulário saia
 * do ar.
 */
export const URL_BASE_FORMS =
  "https://docs.google.com/forms/d/e/1FAIpQLSc2G6G1Fp9lHRTPmvGNJXwC9oxRn3-QmLHyEFNyxnf5loET-g/viewform";

/**
 * IDs dos campos, colhidos em "Obter link pré-preenchido".
 *
 * São opacos e pertencem ao formulário, não ao código. EDITAR o enunciado de uma
 * pergunta preserva o id; APAGAR e recriar a pergunta gera um id novo e quebra o
 * preenchimento em silêncio — o formulário abre igual, só que com o campo vazio.
 * Ao mexer nas perguntas, colha o link de novo e confira estes cinco valores.
 */
export const CAMPOS_FORMS = {
  autor: "entry.1965589267",
  codigo: "entry.193967348",
  disciplina: "entry.1823147339",
  semestre: "entry.702603882",
  professor: "entry.1351659844",
} as const;

/** A coleta só existe quando há formulário para onde mandar. */
export function coletaHabilitada(): boolean {
  return URL_BASE_FORMS.trim().length > 0;
}

/**
 * URL do formulário com os cinco primeiros campos preenchidos.
 *
 * `professor` nulo é a rota "Professor Não Ofertado": o campo vai ausente e a
 * pessoa digita. Pela medição do Estrategia.md isso alcança ~14% dos casos, e 31%
 * para quem está adiantado — é caminho comum, não borda.
 */
export function montarUrlDeAvaliacao(
  alvo: AlvoAvaliacao,
  autor: string,
  professor: string | null,
): string {
  const params = new URLSearchParams({ usp: "pp_url" });
  params.set(CAMPOS_FORMS.autor, autor);
  params.set(CAMPOS_FORMS.codigo, alvo.codigo);
  params.set(CAMPOS_FORMS.disciplina, alvo.nome);
  params.set(CAMPOS_FORMS.semestre, alvo.semestre);
  if (professor) params.set(CAMPOS_FORMS.professor, professor);
  return `${URL_BASE_FORMS}?${params.toString()}`;
}
