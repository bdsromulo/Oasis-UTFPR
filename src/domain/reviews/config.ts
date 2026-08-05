// Superfície da camada de avaliações na interface.
//
// A coleta em si mora em `forms.ts`: quem responde vai para um Google Forms do
// domínio UTFPR, e não há endpoint próprio nem segredo a guardar deste lado.

/**
 * Matrizes cujo curso expõe a camada de avaliações na interface.
 *
 * A restrição é de SUPERFÍCIE, não de dado: o acervo sempre foi único e global
 * (§6.10), e o roster de docentes sempre foi construído sobre as ofertas de
 * todos os cursos. A BSI 981 foi primeiro por ser o curso de origem do projeto e
 * o de maior massa de oferta — era um piloto, não um recorte permanente.
 *
 * Com o piloto de pé, a lista abre para todas as matrizes cobertas. O ganho é
 * imediato e cruzado: professores são compartilhados entre cursos, então um
 * aluno de Eng. Eletrônica passa a ler o que alunos de BSI escreveram sobre o
 * docente que os dois têm, sem que ninguém precise escrever nada de novo.
 */
export const MATRIZES_COM_REVIEWS: number[] = [981, 806, 823, 844, 962, 968, 973, 978];

/** A interface de avaliações aparece para esta matriz? */
export function reviewsHabilitadasPara(matriz: number | null | undefined): boolean {
  return matriz !== null && matriz !== undefined && MATRIZES_COM_REVIEWS.includes(matriz);
}
