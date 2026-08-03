// Submissão de uma avaliação ao endpoint de coleta (Estrategia.md §6.6).
import {
  LIMITE_COMENTARIO,
  MAX_AVALIACOES_NO_SEMESTRE,
  TAGS,
  TAGS_OPOSTAS,
  DESCRICAO_TAG,
  type Estrelas,
  type SistemaAvaliativo,
  type Tag,
} from "./tipos";
import { URL_ENDPOINT_REVIEWS, coletaHabilitada } from "./config";

/** O que o formulário nativo envia. Espelha o `validar()` do Apps Script. */
export interface EnvioReview {
  codigo: string;
  semestre: string;
  situacao: "aprovado" | "reprovado";
  turma?: string;
  /** Escolhido na lista do elenco. Exclusivo com `professorTexto`. */
  professorId?: string;
  /** Digitado na rota "Professor Não Ofertado". Exclusivo com `professorId`. */
  professorTexto?: string;
  /** Nome completo (ou nome social) vindo do histórico — público (RNF06). */
  autor: string;
  /** Fica só na aba privada da planilha; nunca é publicado. */
  ra?: string;
  geral: Estrelas;
  didatica: Estrelas;
  dificuldade: Estrelas;
  cargaTrabalho: Estrelas;
  avaliacao: SistemaAvaliativo;
  /** Detalhamento opcional: ausente significa "não informado", não zero. */
  qtdProvas?: number;
  qtdTrabalhos?: number;
  tags: Tag[];
  comentario: string;
  consentimento: boolean;
  turnstileToken?: string;
}

export type ResultadoEnvio = { ok: true } | { ok: false; erros: string[] };

/**
 * Valida no cliente antes de gastar uma ida à rede.
 *
 * Isto NÃO substitui a validação do Apps Script: qualquer um pode postar direto
 * no endpoint. É só para o aluno ver o erro na hora, em vez de depois.
 */
export function validarEnvio(dados: EnvioReview): string[] {
  const erros: string[] = [];
  const estrela = (v: number) => Number.isInteger(v) && v >= 1 && v <= 5;

  if (!dados.codigo) erros.push("Disciplina não identificada.");
  if (!/^20\d{2}\/[12]$/.test(dados.semestre)) erros.push("Semestre fora do formato AAAA/S.");
  if (!dados.autor?.trim()) erros.push("Nome do autor ausente.");

  const temId = !!dados.professorId;
  const temTexto = !!dados.professorTexto?.trim();
  if (!temId && !temTexto) erros.push("Escolha o professor com quem você cursou.");
  if (temId && temTexto) erros.push("Escolha da lista ou digite o nome — não os dois.");

  if (!estrela(dados.geral)) erros.push("Dê a avaliação geral.");
  if (!estrela(dados.didatica)) erros.push("Avalie a didática.");
  if (!estrela(dados.dificuldade)) erros.push("Avalie a dificuldade.");
  if (!estrela(dados.cargaTrabalho)) erros.push("Avalie a carga de trabalho.");
  if (!dados.avaliacao) erros.push("Informe o sistema avaliativo.");

  for (const t of dados.tags) {
    if (!TAGS.includes(t)) erros.push(`Tag desconhecida: ${t}`);
  }
  for (const [a, b] of TAGS_OPOSTAS) {
    if (dados.tags.includes(a) && dados.tags.includes(b)) {
      erros.push(`"${DESCRICAO_TAG[a].rotulo}" e "${DESCRICAO_TAG[b].rotulo}" se contradizem.`);
    }
  }

  for (const [campo, rotulo] of [
    ["qtdProvas", "provas"],
    ["qtdTrabalhos", "trabalhos"],
  ] as const) {
    const v = dados[campo];
    if (v === undefined) continue; // não informado é legítimo
    if (!Number.isInteger(v) || v < 0 || v > MAX_AVALIACOES_NO_SEMESTRE) {
      erros.push(`Quantidade de ${rotulo} precisa ser um inteiro de 0 a ${MAX_AVALIACOES_NO_SEMESTRE}.`);
    }
  }
  // o detalhamento tem de casar com o sistema avaliativo: contar provas em quem
  // marcou "Trabalhos" é dado que o próprio formulário não chegou a mostrar
  if (dados.avaliacao === "trabalhos" && dados.qtdProvas !== undefined) {
    erros.push("Quem avalia só por trabalhos não informa quantidade de provas.");
  }
  if (dados.avaliacao === "provas" && dados.qtdTrabalhos !== undefined) {
    erros.push("Quem avalia só por provas não informa quantidade de trabalhos.");
  }
  if (dados.comentario.length > LIMITE_COMENTARIO) {
    erros.push(`O comentário passa de ${LIMITE_COMENTARIO} caracteres.`);
  }
  if (!dados.consentimento) erros.push("É preciso aceitar os termos para enviar.");

  return erros;
}

/**
 * Envia a avaliação.
 *
 * O `Content-Type` é `text/plain` DE PROPÓSITO, com corpo JSON: `application/json`
 * dispara um preflight `OPTIONS` que o Apps Script não responde, e a requisição
 * falha inteira. Trocar isso quebra o envio sem erro óbvio.
 */
export async function enviarReview(dados: EnvioReview): Promise<ResultadoEnvio> {
  if (!coletaHabilitada()) {
    return { ok: false, erros: ["A coleta de avaliações ainda não está configurada."] };
  }
  const erros = validarEnvio(dados);
  if (erros.length) return { ok: false, erros };

  try {
    const resposta = await fetch(URL_ENDPOINT_REVIEWS, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(dados),
      redirect: "follow",
    });
    const corpo = (await resposta.json()) as { ok?: boolean; erros?: string[] };
    if (corpo?.ok) return { ok: true };
    return { ok: false, erros: corpo?.erros?.length ? corpo.erros : ["O envio não foi aceito."] };
  } catch {
    // rede fora, endpoint fora do ar ou resposta ilegível
    return { ok: false, erros: ["Não deu para enviar agora. Tente de novo em instantes."] };
  }
}
