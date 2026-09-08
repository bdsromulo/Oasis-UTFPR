import { IconCheckCircle, IconInfo, IconWarning, IconX } from "../icons";
import { useToasts } from "./contexto";
import type { Toast, TomToast } from "./pilha";

/**
 * Os avisos flutuantes, no canto inferior direito.
 *
 * `position: fixed` sem portal, como todo o resto da interface — o projeto não
 * usa `createPortal` em lugar nenhum e os modais já provam que o empilhamento
 * funciona assim. `z-[90]` deixa a pilha acima do modal de Novidades (z-70) e
 * dos demais modais (z-50): um aviso encoberto é um aviso perdido.
 */

const TONS: Record<TomToast, { caixa: string; icone: string; barra: string }> = {
  info: {
    caixa:
      "border-zinc-300/80 bg-white text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100",
    icone: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300",
    barra: "bg-zinc-400",
  },
  ok: {
    caixa:
      "border-emerald-400/70 bg-emerald-50 text-emerald-900 dark:border-emerald-800/80 dark:bg-emerald-950/90 dark:text-emerald-100",
    icone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    barra: "bg-emerald-500",
  },
  aviso: {
    caixa:
      "border-amber-400/70 bg-amber-50 text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/90 dark:text-amber-100",
    icone: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    barra: "bg-amber-500",
  },
  alerta: {
    caixa:
      "border-red-400/70 bg-red-50 text-red-900 dark:border-red-800/80 dark:bg-red-950/90 dark:text-red-100",
    icone: "bg-red-500/15 text-red-700 dark:text-red-300",
    barra: "bg-red-500",
  },
};

function IconeDoTom(props: { tom: TomToast; className?: string }) {
  if (props.tom === "ok") return <IconCheckCircle className={props.className} />;
  if (props.tom === "info") return <IconInfo className={props.className} />;
  return <IconWarning className={props.className} />;
}

/**
 * Um cartão. Exportado à parte do contêiner porque é a unidade que os testes
 * conseguem renderizar isolada — a pilha depende do provedor e do relógio.
 */
export function CartaoToast(props: {
  toast: Toast;
  onDispensar: (chave: string) => void;
  onPausar?: (chave: string) => void;
  onRetomar?: (chave: string) => void;
}) {
  const t = props.toast;
  const tom = TONS[t.tom];
  // O choque de turma substitui um modal bloqueante: precisa interromper o
  // leitor de tela, não sussurrar no fim da fila.
  const critico = t.tom === "alerta";

  return (
    <div
      role={critico ? "alert" : "status"}
      aria-live={critico ? "assertive" : "polite"}
      onMouseEnter={() => props.onPausar?.(t.chave)}
      onMouseLeave={() => props.onRetomar?.(t.chave)}
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border-2 shadow-2xl backdrop-blur-md ${tom.caixa} ${
        t.saindo ? "animate-toast-sai" : "animate-toast-entra"
      }`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${tom.barra}`} aria-hidden="true" />
      <div className="flex items-start gap-3 py-3.5 pr-2.5 pl-4.5">
        <span
          className={`mt-px flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${tom.icone}`}
        >
          <IconeDoTom tom={t.tom} className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-display text-[13px] leading-snug font-black tracking-tight">
            {t.titulo}
          </p>
          {t.descricao && (
            <p className="mt-1 text-xs leading-relaxed font-medium opacity-90">{t.descricao}</p>
          )}
          {t.detalhes && t.detalhes.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {t.detalhes.map((d) => (
                <li key={d} className="font-mono text-[11px] leading-snug opacity-80">
                  {d}
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={() => props.onDispensar(t.chave)}
          aria-label="Fechar aviso"
          title="Fechar aviso"
          className="flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg opacity-60 transition-opacity hover:opacity-100 sm:min-h-8 sm:min-w-8"
        >
          <IconX className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function PilhaToasts(props: {
  /** sobe a pilha para não cobrir a barra de grade flutuante do mobile */
  acimaDaBarraMobile?: boolean;
}) {
  const { toasts, dispensar, pausar, retomar } = useToasts();
  if (toasts.length === 0) return null;

  // A barra de grade do mobile vive em `bottom-[calc(1rem+safe-area)]` e mede
  // cerca de 4rem; abaixo de `lg` a pilha precisa subir acima dela.
  const base = props.acimaDaBarraMobile
    ? "bottom-[calc(6rem+env(safe-area-inset-bottom))] lg:bottom-[calc(1rem+env(safe-area-inset-bottom))]"
    : "bottom-[calc(1rem+env(safe-area-inset-bottom))]";

  return (
    <div
      role="region"
      aria-label="Avisos"
      className={`pointer-events-none fixed right-4 left-4 z-[90] flex flex-col items-stretch gap-2.5 sm:left-auto sm:w-full sm:max-w-sm ${base}`}
    >
      {toasts.map((t) => (
        <CartaoToast
          key={t.chave}
          toast={t}
          onDispensar={dispensar}
          onPausar={pausar}
          onRetomar={retomar}
        />
      ))}
    </div>
  );
}
