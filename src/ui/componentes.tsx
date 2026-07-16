import type { ReactNode } from "react";

export function Card(props: { titulo?: ReactNode; children: ReactNode; classe?: string }) {
  return (
    <div
      className={`rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${props.classe ?? ""}`}
    >
      {props.titulo && (
        <div className="mb-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
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
    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
      <div
        className={`h-full rounded-full transition-all ${
          pct >= 100 ? "bg-emerald-500" : props.destaque ? "bg-utfpr-500" : "bg-utfpr-400"
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Badge(props: {
  children: ReactNode;
  tom?: "ok" | "alerta" | "neutro" | "acento";
}) {
  const tons = {
    ok: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    alerta: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
    neutro: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
    acento: "bg-utfpr-500/20 text-utfpr-700 dark:text-utfpr-400",
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${tons[props.tom ?? "neutro"]}`}
    >
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
      "bg-utfpr-500 text-zinc-900 hover:bg-utfpr-400 font-semibold disabled:opacity-40",
    sutil:
      "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-40",
    perigo: "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950 dark:text-red-300",
  };
  return (
    <button
      onClick={props.onClick}
      disabled={props.desabilitado}
      className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${variantes[props.variante ?? "sutil"]}`}
    >
      {props.children}
    </button>
  );
}
