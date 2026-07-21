import type { Matriz } from "./tipos";

/**
 * Descrição das categorias curriculares de cada curso.
 *
 * As regras de categoria estavam escritas como número solto no código — 1159,
 * 1161, o intervalo 1162..1173 — espalhadas por motores e telas. Isso amarrava
 * o app à BSI: em Eng. Comp. esses conjuntos simplesmente não existem, e não há
 * "2º estrato" nem "ciclo de humanidades".
 *
 * Aqui a estrutura vira dado. O motor percorre a descrição do curso em vez de
 * testar número, e passa a servir os dois currículos sem duplicação.
 */

export interface CategoriaSimples {
  /** identificador estável usado em chaves de UI e agregação */
  id: string;
  /** conjunto correspondente na matriz */
  conjunto: number;
  /** rótulo curto, para chips e listagens */
  rotulo: string;
  /** rótulo por extenso, para títulos de card e resumo de grade */
  rotuloLongo: string;
}

export interface DescricaoCurso {
  matriz: number;
  /**
   * Conjunto que agrega as trilhas e carrega a carga total do bloco. Não é uma
   * trilha: não entra na lista nem é validável.
   *   BSI       1160 "Terceiro Estrato - Trilhas Em Computação" (345h)
   *   Eng.Comp.  959 "Optativas"                                 (270h)
   */
  agregadorTrilhas: number | null;
  /** quantas trilhas o curso exige validar integralmente */
  trilhasExigidas: number;
  /** categorias de conjunto único, fora do bloco de trilhas */
  categorias: CategoriaSimples[];
  /** título do bloco que agrega todas as trilhas, no resumo de grade */
  rotuloBlocoTrilhas: string;
  /**
   * Sufixo aplicado ao nome de cada trilha. Na BSI as trilhas são o 3º estrato
   * e o painel diz isso; em Eng. Comp. não há estratos, e o nome vai puro.
   */
  sufixoTrilha: string;
  /**
   * Conjuntos que contam para o agregador mas não são trilha validável.
   * Em Eng. Comp., 973 "Optativas Isoladas" soma para as 270h sem nunca
   * contar como uma das duas trilhas exigidas.
   */
  naoValidaveis: number[];
}

export const BSI_981: DescricaoCurso = {
  matriz: 981,
  agregadorTrilhas: 1160,
  trilhasExigidas: 3,
  categorias: [
    { id: "segundoEstrato", conjunto: 1159, rotulo: "2º estrato", rotuloLongo: "2º Estrato" },
    { id: "humanidades", conjunto: 1161, rotulo: "humanidades", rotuloLongo: "Ciclo de Humanidades" },
    // a matriz declara a pool de eletivas como conjunto; sem listá-la aqui ela
    // seria confundida com trilha, virando uma 13ª no painel do 3º estrato
    { id: "eletivas", conjunto: 1199, rotulo: "eletiva", rotuloLongo: "Eletivas" },
  ],
  rotuloBlocoTrilhas: "Trilhas em Computação (3º Estrato - Geral)",
  sufixoTrilha: " (3º Estrato)",
  naoValidaveis: [],
};

export const ENG_COMP_844: DescricaoCurso = {
  matriz: 844,
  agregadorTrilhas: 959,
  trilhasExigidas: 2,
  // Eng. Comp. não tem estratos nem ciclo de humanidades: todo o bloco
  // optativo é trilha ou optativa isolada.
  categorias: [],
  rotuloBlocoTrilhas: "Optativas em Trilhas e Isoladas",
  sufixoTrilha: "",
  naoValidaveis: [973],
};

const CURSOS: DescricaoCurso[] = [BSI_981, ENG_COMP_844];

/** Descrição do curso correspondente à matriz, com a BSI como padrão. */
export function descricaoDoCurso(matriz: Matriz | number): DescricaoCurso {
  const numero = typeof matriz === "number" ? matriz : matriz.matriz;
  return CURSOS.find((c) => c.matriz === numero) ?? BSI_981;
}

/** true quando o conjunto é uma trilha validável do curso. */
export function ehTrilha(curso: DescricaoCurso, conjunto: number | string | null): boolean {
  if (conjunto === null) return false;
  const n = Number(conjunto);
  if (Number.isNaN(n)) return false;
  if (n === curso.agregadorTrilhas) return false;
  if (curso.naoValidaveis.includes(n)) return false;
  return !curso.categorias.some((c) => c.conjunto === n);
}

/** Categoria simples correspondente ao conjunto, se houver. */
export function categoriaSimples(
  curso: DescricaoCurso,
  conjunto: number | string | null,
): CategoriaSimples | null {
  if (conjunto === null) return null;
  const n = Number(conjunto);
  return curso.categorias.find((c) => c.conjunto === n) ?? null;
}

/**
 * Conjuntos da matriz que são trilhas do curso, na ordem em que a matriz os
 * declara. Deriva da própria matriz: não há intervalo fixo no código.
 */
export function trilhasDaMatriz(matriz: Matriz, curso = descricaoDoCurso(matriz)): string[] {
  return Object.keys(matriz.conjuntos).filter((cod) => ehTrilha(curso, cod));
}

/** Rótulo da categoria de uma disciplina, para exibição. */
export function rotuloDoConjunto(
  matriz: Matriz,
  conjunto: number | null,
  curso = descricaoDoCurso(matriz),
): string {
  if (conjunto === null) return "obrigatória";
  const simples = categoriaSimples(curso, conjunto);
  if (simples) return simples.rotulo;
  return matriz.conjuntos[String(conjunto)]?.nome ?? String(conjunto);
}
