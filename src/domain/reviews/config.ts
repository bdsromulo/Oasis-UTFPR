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
 * Vazio desliga a submissão: a plataforma segue exibindo avaliações, mas não
 * oferece o botão de avaliar. É a degradação pretendida enquanto não há endpoint.
 */
export const URL_ENDPOINT_REVIEWS = "";

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
