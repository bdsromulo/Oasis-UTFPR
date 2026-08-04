// Montagem do link pré-preenchido do Google Forms.
//
// A pesquisabilidade que o Forms não tem mora no Oásis: o aluno acha a disciplina
// e o professor aqui, onde a busca já funciona, e o formulário chega pronto. O
// prefill NÃO trava campo — o respondente pode editar antes de enviar —, então
// isto é conveniência, e a validação da ingestão continua sendo a defesa real.
//
// Nada aqui é segredo: o formulário é público por natureza, e a fronteira de
// confiança fica na planilha, onde envio nenhum vira acervo sem aprovação humana.

import type { DisciplinaCursada } from "../tipos";

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
 * Registros que existem no histórico mas não são aula com professor.
 *
 * Avaliar didática, personalidade e carga de trabalho pressupõe alguém dando
 * aula. O ENADE é prova externa; o estágio acontece na empresa, com supervisor
 * que não é o docente; e as atividades complementares são um saldo de horas
 * somadas de eventos, cursos e projetos variados. Nos três casos as quatro
 * verticais não têm sobre o que responder, e a nota resultante mediria outra
 * coisa qualquer.
 *
 * Casado por nome, e não por lista de códigos, porque o código muda a cada
 * matriz — as atividades complementares são CSX50 na 806, ICSX50 na 981, CSX53
 * na 844, ICSXG3 na 962 e ELS03 na 968. Os códigos de estágio ainda entram por
 * fora, vindos da descrição do curso, para o caso de a fonte abreviar o nome.
 */
const NAO_AVALIAVEIS = [
  /^enade/i,
  /atividades?\s+complementares/i,
  /est[áa]gio/i,
];

/**
 * Quem pode ser avaliada: aprovação no histórico, com o período conhecido, e
 * desde que seja de fato uma disciplina com aula.
 *
 * A reprovação já esteve dentro do escopo, sob o argumento de que a opinião de
 * quem reprovou é contexto legítimo. Ficou de fora por decisão do projeto: a
 * avaliação passa a exigir ter concluído a disciplina.
 *
 * Dispensa, consignação e cancelamento nunca entraram, por outro motivo — nesses
 * casos a pessoa não assistiu à disciplina com aquele professor, então não tem o
 * que relatar.
 *
 * `ano` e `semestre` são exigidos porque o formulário grava o período, e a
 * ingestão recusa semestre fora do formato AAAA/S.
 *
 * `codigosDeEstagio` vem de `descricaoDoCurso(matriz).estagios`. É opcional para
 * a regra por nome continuar valendo sozinha, e não para o curso ser dispensável.
 *
 * Predicado único de propósito: três telas decidem o que é avaliável, e cada uma
 * com a sua cópia da regra é como elas divergem sem ninguém perceber.
 */
export function podeSerAvaliada(
  c: DisciplinaCursada,
  codigosDeEstagio: readonly string[] = [],
): boolean {
  if (c.situacao !== "aprovado" || !c.ano || !c.semestre) return false;
  if (codigosDeEstagio.includes(c.codigo)) return false;
  if (/^ENADE/i.test(c.codigo)) return false;
  return !NAO_AVALIAVEIS.some((re) => re.test(c.nome ?? ""));
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
