// Superfície da camada de avaliações na interface.
//
// A coleta em si mora em `forms.ts`: quem responde vai para um Google Forms do
// domínio UTFPR, e não há endpoint próprio nem segredo a guardar deste lado.

/**
 * Matrizes cujo curso já expõe a camada de avaliações na interface.
 *
 * A restrição é de SUPERFÍCIE, não de dado: o acervo permanece único e global
 * (§6.10), e o roster de docentes continua sendo construído sobre as ofertas de
 * todos os cursos. Habilitar um curso novo é acrescentar a matriz a esta lista —
 * e no mesmo instante os alunos dele passam a enxergar as avaliações já escritas
 * por alunos de outros cursos sobre os professores que os dois compartilham.
 *
 * A BSI 981 vai primeiro por ser o curso de origem do projeto e o de maior massa
 * de dados de oferta.
 */
export const MATRIZES_COM_REVIEWS: number[] = [981];

/** A interface de avaliações aparece para esta matriz? */
export function reviewsHabilitadasPara(matriz: number | null | undefined): boolean {
  return matriz !== null && matriz !== undefined && MATRIZES_COM_REVIEWS.includes(matriz);
}
