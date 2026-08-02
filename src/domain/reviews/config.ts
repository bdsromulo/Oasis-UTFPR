// Configuração da coleta de avaliações (Estrategia.md §6.6).
//
// NADA aqui é segredo, e não pode ser: tudo neste arquivo é embutido no bundle
// servido ao navegador. Front-end estático não guarda segredo (§5.6). A URL do
// endpoint é pública por natureza — quem abrir o DevTools a encontra —, e o
// desenho parte disso: o dano de quem a descobrir para na fronteira de confiança,
// porque envio nenhum vira acervo público sem aprovação humana (§6.2).
//
// O ÚNICO segredo do sistema é a chave secreta do Turnstile, e ela vive nas
// Script Properties do Apps Script — server-side de verdade, fora deste repo.

/**
 * URL `/exec` do Apps Script publicado como App da Web.
 *
 * Vazio desliga a submissão: a plataforma segue exibindo avaliações, mas não
 * oferece o botão de avaliar. É a degradação pretendida enquanto não há endpoint.
 *
 * Precisa terminar em `/exec`. A URL `/dev`, que o editor do Apps Script também
 * mostra, só funciona para quem está logado como dono do script — passa nos
 * testes de quem publicou e falha para todo o resto.
 *
 * Ao editar o script, republique pela implantação EXISTENTE
 * (Gerenciar implantações → editar → Nova versão) para preservar esta URL.
 */
export const URL_ENDPOINT_REVIEWS =
  "https://script.google.com/macros/s/AKfycbxOgninI_XB2h-FiYdzMzpJ0S6_z_dAJ4c2HSiG9I7ybZMj04-peJ4KL86VgNibM6Fm/exec";

/**
 * Site key do Cloudflare Turnstile (pública, pertence ao bundle).
 * Vazia desliga o widget; o endpoint aceita envio sem token enquanto a
 * propriedade `TURNSTILE_SECRET` também não estiver configurada lá.
 */
export const TURNSTILE_SITE_KEY = "";

/** A coleta só existe quando há para onde enviar. */
export function coletaHabilitada(): boolean {
  return URL_ENDPOINT_REVIEWS.trim().length > 0;
}

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
