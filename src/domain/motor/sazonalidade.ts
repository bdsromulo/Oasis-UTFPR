import type { DisciplinaMatriz, Matriz } from "../tipos";

export type TipoSazonalidade = "AMBOS" | "IMPAR" | "PAR" | "ESPORADICA";

/**
 * Disciplinas que tipicamente abrem em todos os semestres (1º e 2º) na UTFPR/BSI,
 * seja por serem disciplinas básicas de grande volume ou por estarem sempre em alta demanda.
 */
const DISCIPLINAS_OFERTA_CONTINUA = new Set([
  "IF61C", // Fundamentos de Programação 1
  "IF61K", // Matemática Discreta
  "ICSH31", // Comunicação Linguística
  "ICSH32", // Metodologia da Pesquisa
  "ICSH33", // Relações Humanas
  "IF62C", // Fundamentos de Programação 2
  "IF63C", // Estrutura de Dados 1
  "IF64C", // Estrutura de Dados 2
  "IF64D", // Banco de Dados
  "IF65D", // Engenharia de Software
  "ICMA11", // Cálculo 1
  "ICMA12", // Cálculo 2
  "IF66C", // Redes de Computadores
]);

/**
 * Infere a sazonalidade ideal de uma disciplina na matriz.
 */
export function obterSazonalidade(disciplina: DisciplinaMatriz): TipoSazonalidade {
  if (DISCIPLINAS_OFERTA_CONTINUA.has(disciplina.codigo)) {
    return "AMBOS";
  }

  // Se for optativa / trilha / conjunto extra ou sem período fixo definido
  if (disciplina.conjunto !== null || disciplina.periodo <= 0 || disciplina.periodo > 10) {
    // Optativas/Trilhas abrem dependendo de demanda ou rotação
    return "AMBOS";
  }

  // Se período for ímpar (1, 3, 5, 7), tendência natural é abrir no 1º semestre do ano (.1)
  if (disciplina.periodo % 2 !== 0) {
    return "IMPAR";
  }

  // Se período for par (2, 4, 6, 8), tendência natural é abrir no 2º semestre do ano (.2)
  return "PAR";
}

/**
 * Retorna o rótulo amigável para exibição da sazonalidade.
 */
export function rotuloSazonalidade(saz: TipoSazonalidade): string {
  switch (saz) {
    case "AMBOS":
      return "Todo Semestre (1º e 2º)";
    case "IMPAR":
      return "Abertura Típica em 1º Semestre (.1)";
    case "PAR":
      return "Abertura Típica em 2º Semestre (.2)";
    case "ESPORADICA":
      return "Oferta Esporádica / Rotativa";
  }
}

/**
 * Verifica se a disciplina estaria disponível/aberta em um semestre alvo ("2026-1", "2026-2", "2027-1", etc.)
 */
export function verificarDisponibilidadeNoSemestre(
  disciplina: DisciplinaMatriz,
  semestreAlvo: string,
): boolean {
  const saz = obterSazonalidade(disciplina);
  if (saz === "AMBOS" || saz === "ESPORADICA") return true;

  // Analisa se o semestre alvo é ímpar (.1 / -1) ou par (.2 / -2)
  const isImpar = semestreAlvo.endsWith("-1") || semestreAlvo.endsWith(".1");
  const isPar = semestreAlvo.endsWith("-2") || semestreAlvo.endsWith(".2");

  if (saz === "IMPAR" && isImpar) return true;
  if (saz === "PAR" && isPar) return true;

  return false;
}

/**
 * Lista de gargalos conhecidos / matérias críticas que costumam travar fluxos longos
 * de pré-requisitos no curso (ou têm cadeia de >= 3 matérias dependentes).
 */
export function isMateriaGargalo(disciplina: DisciplinaMatriz, matriz: Matriz): boolean {
  // Matérias que têm 3 ou mais disciplinas que dependem delas diretamente no currículo
  let countDependentes = 0;
  for (const out of matriz.disciplinas) {
    if (out.prerequisitos.includes(disciplina.codigo)) {
      countDependentes++;
    }
  }
  return countDependentes >= 2 || disciplina.codigo === "IF63C" || disciplina.codigo === "IF64C";
}
