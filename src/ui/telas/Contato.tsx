import { useState } from "react";
import { IconCheck, IconCopy, IconMail } from "../icons";

/**
 * Canal de contato do projeto.
 *
 * O `mailto:` resolve para quem tem cliente de e-mail configurado, o que está
 * longe de ser todo mundo — por isso o endereço também aparece em texto e pode
 * ser copiado. Sem isso, quem usa webmail no navegador clicaria no botão e não
 * aconteceria nada.
 */

export const EMAIL_CONTATO = "oasisutfpr@gmail.com";

const ASSUNTO = encodeURIComponent("Oásis UTFPR — contato");
export const LINK_MAILTO = `mailto:${EMAIL_CONTATO}?subject=${ASSUNTO}`;

function useCopiarEmail() {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(EMAIL_CONTATO);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // sem permissão de área de transferência: o endereço segue visível na tela
    }
  }
  return { copiado, copiar };
}

/**
 * Pílula flutuante no canto inferior direito, presente em toda a plataforma.
 *
 * Fica acima da barra de grade do mobile (que ocupa o rodapé abaixo de `lg`),
 * senão as duas se sobrepõem na aba de Planejamento.
 */
export function PilulaFaleConosco(props: { barraGradeMobileAtiva?: boolean }) {
  const [aberta, setAberta] = useState(false);
  const { copiado, copiar } = useCopiarEmail();

  return (
    <div
      className={`fixed right-4 z-30 flex flex-col items-end gap-2 lg:bottom-4 ${
        props.barraGradeMobileAtiva
          ? "bottom-[calc(6rem+env(safe-area-inset-bottom))]"
          : "bottom-[calc(1rem+env(safe-area-inset-bottom))]"
      }`}
    >
      {aberta && (
        <div className="animate-in fade-in zoom-in-95 w-60 rounded-2xl border border-zinc-200/90 bg-white p-3.5 shadow-2xl duration-150 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="font-display text-xs font-black text-zinc-900 dark:text-zinc-100">
            Fale com o Oásis
          </p>
          <p className="mt-1 text-xs leading-snug text-zinc-500 dark:text-zinc-400">
            Achou um erro nos dados, um bug ou tem uma sugestão? Escreva para:
          </p>
          <a
            href={LINK_MAILTO}
            className="mt-2 flex min-h-11 items-center break-all rounded-lg bg-zinc-100 px-2 py-2 font-mono text-xs font-bold text-zinc-800 transition-colors hover:bg-utfpr-500/20 dark:bg-zinc-800 dark:text-zinc-100"
          >
            {EMAIL_CONTATO}
          </a>
          <button
            type="button"
            onClick={copiar}
            className="mt-2 flex min-h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-zinc-200 px-2 py-2 font-display text-xs font-bold text-zinc-600 transition-colors hover:border-utfpr-500 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:text-white"
          >
            {copiado ? (
              <>
                <IconCheck className="h-3.5 w-3.5" />
                <span>E-mail copiado</span>
              </>
            ) : (
              <>
                <IconCopy className="h-3.5 w-3.5" />
                <span>Copiar endereço</span>
              </>
            )}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setAberta((v) => !v)}
        aria-expanded={aberta}
        title={`Fale conosco — ${EMAIL_CONTATO}`}
        className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-zinc-300/80 bg-white/95 px-4 py-2 font-display text-xs font-black text-zinc-800 shadow-lg backdrop-blur-md transition-all hover:border-utfpr-500 hover:text-zinc-950 active:scale-95 dark:border-zinc-700 dark:bg-zinc-900/95 dark:text-zinc-100 dark:hover:border-utfpr-500"
      >
        <IconMail className="h-4 w-4 shrink-0 text-utfpr-600 dark:text-utfpr-500" />
        <span>Fale conosco</span>
      </button>
    </div>
  );
}

/** Botão de contato para as páginas de conteúdo (Como Usar e Sobre). */
export function BotaoFaleConosco(props: { compacto?: boolean }) {
  if (props.compacto) {
    return (
      <a
        href={LINK_MAILTO}
        title={`Fale conosco — ${EMAIL_CONTATO}`}
        className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-utfpr-500/50 bg-utfpr-500/10 px-2.5 py-2 font-display text-xs font-bold text-amber-900 transition-colors hover:bg-utfpr-500/25 dark:text-utfpr-300"
      >
        <IconMail className="h-4 w-4 shrink-0" />
        <span>Fale conosco</span>
      </a>
    );
  }
  return (
    <a
      href={LINK_MAILTO}
      className="inline-flex items-center gap-2 rounded-xl bg-utfpr-500 px-4 py-2.5 font-display text-sm font-black text-zinc-950 shadow-sm transition-all hover:bg-utfpr-400 active:scale-95"
    >
      <IconMail className="h-4.5 w-4.5 shrink-0" />
      <span>Fale conosco: {EMAIL_CONTATO}</span>
    </a>
  );
}
