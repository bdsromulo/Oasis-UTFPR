import type { ReactNode } from "react";

export function Card(props: { titulo?: ReactNode; children: ReactNode; classe?: string }) {
  return (
    <div
      className={`rounded-2xl border border-zinc-200/80 bg-white/90 p-5 shadow-xs backdrop-blur-sm transition-all hover:border-zinc-300/80 dark:border-zinc-800/80 dark:bg-zinc-900/90 dark:hover:border-zinc-700/80 ${props.classe ?? ""}`}
    >
      {props.titulo && (
        <div className="mb-3 font-display text-sm font-bold tracking-tight text-zinc-500 dark:text-zinc-400">
          {props.titulo}
        </div>
      )}
      {props.children}
    </div>
  );
}

export function Barra(props: { valor: number; max: number; destaque?: boolean }) {
  const pct = props.max > 0 ? Math.min(100, (props.valor / props.max) * 100) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800/80">
      <div
        className={`h-full rounded-full transition-all duration-500 ease-out ${
          pct >= 100
            ? "bg-emerald-500 dark:bg-emerald-400"
            : props.destaque
              ? "bg-utfpr-500 shadow-[0_0_8px_rgba(254,205,15,0.4)]"
              : "bg-utfpr-400 dark:bg-utfpr-500"
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Badge(props: {
  children: ReactNode;
  tom?: "ok" | "alerta" | "neutro" | "acento";
  icon?: ReactNode;
}) {
  const tons = {
    ok: "border border-emerald-200/60 bg-emerald-50/80 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-300",
    alerta: "border border-red-200/60 bg-red-50/80 text-red-800 dark:border-red-800/60 dark:bg-red-950/60 dark:text-red-300",
    neutro: "border border-zinc-200/60 bg-zinc-100/80 text-zinc-700 dark:border-zinc-800/60 dark:bg-zinc-800/80 dark:text-zinc-300",
    acento: "border border-utfpr-500/40 bg-utfpr-500/15 text-utfpr-700 dark:border-utfpr-500/30 dark:text-utfpr-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${tons[props.tom ?? "neutro"]}`}
    >
      {props.icon}
      {props.children}
    </span>
  );
}

export function Botao(props: {
  children: ReactNode;
  onClick?: () => void;
  variante?: "primario" | "sutil" | "perigo";
  desabilitado?: boolean;
}) {
  const variantes = {
    primario:
      "bg-utfpr-500 text-zinc-950 shadow-xs hover:bg-utfpr-400 active:scale-[0.98] font-bold disabled:opacity-40",
    sutil:
      "border border-zinc-200/80 bg-white text-zinc-700 shadow-2xs hover:bg-zinc-50 hover:text-zinc-900 active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white disabled:opacity-40",
    perigo:
      "border border-red-200/80 bg-red-50 text-red-700 hover:bg-red-100 active:scale-[0.98] dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300 dark:hover:bg-red-900/40 disabled:opacity-40",
  };
  return (
    <button
      onClick={props.onClick}
      disabled={props.desabilitado}
      className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm transition-all duration-150 ${variantes[props.variante ?? "sutil"]}`}
    >
      {props.children}
    </button>
  );
}
