import { useState, useRef, useEffect, type ReactNode } from "react";
import { IconSortUpDown, IconCheck } from "./icons";

export function Card(props: { titulo?: ReactNode; children: ReactNode; classe?: string }) {
  return (
    <div
      className={`rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs transition-all hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none dark:hover:border-zinc-700/80 ${props.classe ?? ""}`}
    >
      {props.titulo && (
        <div className="mb-3 font-display text-sm font-bold tracking-tight text-zinc-600 dark:text-zinc-400">
          {props.titulo}
        </div>
      )}
      {props.children}
    </div>
  );
}

export function Badge(props: {
  children: ReactNode;
  tom?: "neutro" | "ok" | "alerta" | "acento" | "aviso";
  icon?: ReactNode;
  classe?: string;
  onClick?: () => void;
}) {
  const tons = {
    neutro:
      "bg-zinc-100 text-zinc-700 border border-zinc-200/80 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700/80",
    ok: "bg-emerald-500/10 text-emerald-800 border border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
    alerta:
      "bg-red-500/10 text-red-800 border border-red-500/20 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30",
    aviso:
      "bg-orange-500/10 text-orange-800 border border-orange-500/20 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30",
    acento:
      "bg-utfpr-500/15 text-zinc-900 border border-utfpr-500/40 dark:bg-utfpr-500/15 dark:text-zinc-100 dark:border-utfpr-500/40",
  };
  return (
    <span
      onClick={props.onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-display text-xs font-semibold tracking-tight transition-all ${tons[props.tom ?? "neutro"]} ${props.onClick ? "cursor-pointer hover:scale-105 active:scale-95" : ""} ${props.classe ?? ""}`}
    >
      {props.icon}
      {props.children}
    </span>
  );
}

export function Barra(props: { valor: number; max: number; cor?: string; classe?: string; destaque?: boolean }) {
  const p = props.max > 0 ? Math.min(100, Math.max(0, (props.valor / props.max) * 100)) : 0;
  const corBarra = props.cor ?? (props.destaque ? "bg-emerald-500" : "bg-utfpr-500");
  return (
    <div className={`h-2.5 w-full overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800/80 ${props.classe ?? ""}`}>
      <div
        className={`h-full rounded-full transition-all duration-300 ${corBarra}`}
        style={{ width: `${p}%` }}
      />
    </div>
  );
}

export function Botao(props: {
  children: ReactNode;
  onClick?: (e?: any) => void;
  variante?: "primario" | "sutil" | "perigo" | "neutro";
  desabilitado?: boolean;
  classe?: string;
  title?: string;
}) {
  const variantes = {
    primario:
      "bg-utfpr-500 text-zinc-950 shadow-xs hover:bg-utfpr-400 active:scale-[0.98] font-bold disabled:opacity-40",
    sutil:
      "border border-zinc-200 bg-white text-zinc-700 shadow-xs hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950 active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white disabled:opacity-40",
    neutro:
      "border border-zinc-200 bg-zinc-100 text-zinc-700 shadow-xs hover:border-zinc-300 hover:bg-zinc-200/80 active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 disabled:opacity-40",
    perigo:
      "border border-red-200/80 bg-red-50 text-red-700 hover:bg-red-100 active:scale-[0.98] dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300 dark:hover:bg-red-900/40 disabled:opacity-40",
  };
  return (
    <button
      onClick={props.onClick}
      disabled={props.desabilitado}
      title={props.title}
      className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm transition-all duration-150 ${variantes[props.variante ?? "sutil"]} ${props.classe ?? ""}`}
    >
      {props.children}
    </button>
  );
}

export interface OpcaoOrdenacao {
  id: string;
  rotulo: string;
}

export const OPCOES_ORDENACAO_PADRAO: OpcaoOrdenacao[] = [
  { id: "az", rotulo: "Ordem Alfabética (A-Z)" },
  { id: "za", rotulo: "Ordem Alfabética (Z-A)" },
  { id: "ch_desc", rotulo: "Mais Horas (90h, 75h, 60h...)" },
  { id: "ch_asc", rotulo: "Menos Horas (30h, 45h, 60h...)" },
  { id: "per_asc", rotulo: "Período (Mais Anterior 1º→8º)" },
  { id: "per_desc", rotulo: "Período (Mais Posterior 8º→1º)" },
];

export function MenuOrdenacao(props: {
  valor: string;
  onMudar: (v: string) => void;
  opcoes?: OpcaoOrdenacao[];
  classe?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const lista = props.opcoes ?? OPCOES_ORDENACAO_PADRAO;
  const opAtual = lista.find((x) => x.id === props.valor) ?? lista[0];

  useEffect(() => {
    function clickFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", clickFora);
    return () => document.removeEventListener("mousedown", clickFora);
  }, []);

  return (
    <div ref={ref} className={`relative inline-block text-left ${props.classe ?? ""}`}>
      <button
        onClick={() => setAberto(!aberto)}
        title={`Ordenação atual: ${opAtual?.rotulo ?? "Padrão"} — Clique para alterar`}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-xs transition-all hover:border-zinc-900 hover:bg-zinc-50 hover:text-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-amber-400 dark:hover:bg-zinc-800/80 dark:hover:text-amber-400 cursor-pointer"
      >
        <IconSortUpDown className="h-4.5 w-4.5" />
      </button>

      {aberto && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 z-50 animate-in fade-in duration-150">
          <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 border-b border-zinc-100 dark:border-zinc-800/80 mb-1">
            Opções de Ordenação
          </div>
          <div className="space-y-0.5">
            {lista.map((op) => {
              const selecionada = op.id === props.valor;
              return (
                <button
                  key={op.id}
                  onClick={() => {
                    props.onMudar(op.id);
                    setAberto(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-display text-xs transition-colors cursor-pointer ${
                    selecionada
                      ? "bg-utfpr-500/15 font-bold text-zinc-950 dark:bg-utfpr-500/10 dark:text-utfpr-400"
                      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/80"
                  }`}
                >
                  <span className="truncate">{op.rotulo}</span>
                  {selecionada && <IconCheck className="h-3.5 w-3.5 shrink-0 text-utfpr-600 dark:text-utfpr-400 ml-2" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
