// Pool de eletivas: resolve o NOME de uma eletiva a partir do código lido no
// Histórico Escolar.
//
// Existe porque a maior parte das eletivas cursadas vem de outros cursos e não está
// na matriz 981 — sem a pool, o aluno não veria no catálogo as eletivas que de fato
// cursou, já que o catálogo percorre a matriz.
//
// A pool NÃO tem relação com as ofertas de turmas (data/turmas/) e NÃO serve para
// contabilizar carga: a CH de eletivas do aluno vem sempre do "Resumo Eletiva" do
// histórico, que já aplica o teto da matriz.
import eletivasJson from "../../data/eletivas.json";

export interface EletivaPool {
  nome: string;
  ch: number;
}

export const POOL_ELETIVAS = eletivasJson.disciplinas as Record<string, EletivaPool>;

/** Nome da eletiva pelo código, ou null quando o código ainda não está na pool. */
export function nomeDeEletiva(codigo: string): string | null {
  return POOL_ELETIVAS[codigo]?.nome ?? null;
}
