// O que o aluno modelou no Simulador de Formatura, como dado puro.
//
// Mora fora dos componentes de propósito. O `App` guarda esse estado — ele
// sobrevive à troca de aba, que desmonta a tela do simulador — e importar as
// constantes dos próprios componentes arrastava a tela inteira, o motor de
// projeção e os controles para o bundle inicial, que carrega no celular antes
// de qualquer clique.
import { PRIMEIRO_SLOT, ULTIMO_SLOT } from "../../domain/horarios";

/** O que o aluno pediu para NÃO entrar na projeção. */
export interface ValorExclusoes {
  disciplinas: { codigo: string; nome: string }[];
  professores: string[];
  trilhas: { conjunto: string; nome: string }[];
}

export const EXCLUSOES_VAZIAS: ValorExclusoes = {
  disciplinas: [],
  professores: [],
  trilhas: [],
};

/** O que o aluno modelou, à parte das exclusões. */
export interface ValorModelagem {
  /** conjuntos de trilha escolhidos; vazio devolve a escolha ao motor */
  trilhasAlvo: string[];
  /** códigos que ele quer cursar */
  disciplinasFixadas: string[];
  /** ritmo específico por semestre, sobrepondo o global */
  ritmoPorSemestre: Record<string, number>;
  aulaInicial: string;
  aulaFinal: string;
  /** disciplinas presas a um semestre: chave = semestre, valor = códigos */
  fixacoesPorSemestre: Record<string, string[]>;
}

export const MODELAGEM_VAZIA: ValorModelagem = {
  trilhasAlvo: [],
  disciplinasFixadas: [],
  ritmoPorSemestre: {},
  aulaInicial: PRIMEIRO_SLOT,
  aulaFinal: ULTIMO_SLOT,
  fixacoesPorSemestre: {},
};
