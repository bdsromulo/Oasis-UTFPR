import { useState, useRef, useEffect, type ReactNode } from "react";
import { IconSortUpDown, IconCheck } from "./icons";
import { calcularProgressoMateria } from "../domain/motor/progressoGrade";
import type { Matriz, PerfilAluno } from "../domain/tipos";

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

/**
 * Rosca de progresso: o mesmo dado da <Barra>, porém com o percentual legível no
 * centro. O traço é desenhado por stroke-dasharray sobre um círculo, começando às
 * 12h (rotação de -90°), sem dependência de biblioteca de gráficos.
 */
export function Rosca(props: {
  valor: number;
  max: number;
  tamanho?: number;
  espessura?: number;
  cor?: string;
  rotuloCentro?: ReactNode;
  legenda?: ReactNode;
  classe?: string;
}) {
  const tamanho = props.tamanho ?? 128;
  const espessura = props.espessura ?? 12;
  const fracao = props.max > 0 ? Math.min(1, Math.max(0, props.valor / props.max)) : 0;
  const pct = Math.round(fracao * 100);

  const raio = (tamanho - espessura) / 2;
  const circunferencia = 2 * Math.PI * raio;
  const centro = tamanho / 2;
  const completo = fracao >= 1;

  return (
    <div className={`flex items-center gap-4 ${props.classe ?? ""}`}>
      <div className="relative shrink-0" style={{ width: tamanho, height: tamanho }}>
        <svg
          width={tamanho}
          height={tamanho}
          viewBox={`0 0 ${tamanho} ${tamanho}`}
          role="img"
          aria-label={`Progresso: ${pct}% (${props.valor} de ${props.max})`}
          className="-rotate-90"
        >
          <circle
            cx={centro}
            cy={centro}
            r={raio}
            fill="none"
            strokeWidth={espessura}
            className="stroke-zinc-200/80 dark:stroke-zinc-800/80"
          />
          <circle
            cx={centro}
            cy={centro}
            r={raio}
            fill="none"
            strokeWidth={espessura}
            strokeLinecap="round"
            strokeDasharray={circunferencia}
            strokeDashoffset={circunferencia * (1 - fracao)}
            className={`transition-all duration-500 ${
              props.cor ?? (completo ? "stroke-emerald-500" : "stroke-utfpr-500")
            }`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-black leading-none tracking-tight text-zinc-900 dark:text-zinc-100">
            {pct}
            <span className="text-sm font-bold text-zinc-400">%</span>
          </span>
          {props.rotuloCentro && (
            <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              {props.rotuloCentro}
            </span>
          )}
        </div>
      </div>
      {props.legenda && <div className="min-w-0">{props.legenda}</div>}
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

export function BarraProgressoComPreview(props: {
  cumprido: number;
  preview: number;
  exigido: number;
  classe?: string;
  corCumprido?: string;
  corPreview?: string;
  corVazio?: string;
}) {
  const max = props.exigido > 0 ? props.exigido : 1;
  const pCumprido = Math.min(100, Math.max(0, (props.cumprido / max) * 100));
  const pPreview = Math.min(100 - pCumprido, Math.max(0, (props.preview / max) * 100));

  const cor1 = props.corCumprido ?? "bg-emerald-500 dark:bg-emerald-400";
  const cor2 = props.corPreview ?? "bg-utfpr-500 dark:bg-utfpr-500";
  const cor3 = props.corVazio ?? "bg-zinc-200/80 dark:bg-zinc-800/80";

  return (
    <div className={`h-2.5 w-full overflow-hidden rounded-full flex ${cor3} ${props.classe ?? ""}`}>
      {pCumprido > 0 && (
        <div
          className={`h-full transition-all duration-300 ${cor1}`}
          style={{ width: `${pCumprido}%` }}
          title={`Já cumprido: ${props.cumprido}h (${Math.round(pCumprido)}%)`}
        />
      )}
      {pPreview > 0 && (
        <div
          className={`h-full transition-all duration-300 ${cor2}`}
          style={{ width: `${pPreview}%` }}
          title={`Impulso previsto: +${props.preview}h (${Math.round(pPreview)}%)`}
        />
      )}
    </div>
  );
}

export function CardPreviewHoverMateria(props: {
  codigoDisciplina: string;
  nomeDisciplina?: string;
  perfil?: PerfilAluno | null;
  matriz?: Matriz | null;
  cargaHoraria?: number;
  classe?: string;
  tituloCustom?: string;
}) {
  const dados = calcularProgressoMateria(
    props.codigoDisciplina,
    props.nomeDisciplina ?? props.codigoDisciplina,
    props.cargaHoraria ?? 60,
    props.perfil,
    props.matriz
  );

  return (
    <div
      className={`rounded-xl border-2 border-utfpr-500/70 bg-white p-3.5 shadow-lg dark:border-utfpr-500/60 dark:bg-zinc-900 transition-all animate-in fade-in duration-150 ${props.classe ?? ""}`}
    >
      <div className="flex items-start justify-between gap-2 border-b border-zinc-100 pb-2 dark:border-zinc-800">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-utfpr-700 dark:text-utfpr-400">
            <span>✨ {props.tituloCustom ?? "Preview do Hover · Impacto na Categoria"}</span>
          </div>
          <div className="mt-0.5 font-display text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-tight truncate">
            {props.codigoDisciplina} — {props.nomeDisciplina ?? dados.categoriaNome}
          </div>
          <div className="mt-0.5 font-mono text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            {dados.categoriaNome}
          </div>
        </div>
        <span className="shrink-0 rounded-lg bg-utfpr-500/15 border border-utfpr-500/30 px-2 py-1 font-mono text-xs font-bold text-utfpr-800 dark:text-utfpr-300">
          +{dados.previewCarga}h
        </span>
      </div>

      <div className="mt-2.5 space-y-1.5">
        <div className="flex items-baseline justify-between text-xs">
          <span className="font-semibold text-zinc-600 dark:text-zinc-400">
            Progresso ({dados.categoriaNome}):{" "}
            <strong className="text-zinc-900 dark:text-zinc-100">{dados.cumpridoBase}h</strong>
            {dados.previewCarga > 0 && (
              <span className="text-utfpr-600 dark:text-utfpr-400 font-bold"> +{dados.previewCarga}h</span>
            )}
          </span>
          <span className="font-mono font-bold text-zinc-500 dark:text-zinc-400">
            {Math.min(dados.exigido, dados.cumpridoSimulado)} / {dados.exigido}h
          </span>
        </div>

        <BarraProgressoComPreview
          cumprido={dados.cumpridoBase}
          preview={dados.previewCarga}
          exigido={dados.exigido}
        />

        <div className="flex flex-wrap items-center justify-between text-[10px] pt-0.5 font-semibold text-zinc-500 dark:text-zinc-400 gap-2">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 shrink-0" /> Feito ({dados.cumpridoBase}h)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-utfpr-500 shrink-0" /> +{dados.previewCarga}h nesta
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-700 shrink-0" /> Faltante (
            {Math.max(0, dados.exigido - dados.cumpridoSimulado)}h)
          </span>
        </div>

        <div className="text-[11px] font-bold text-utfpr-700 dark:text-utfpr-300 pt-1 border-t border-zinc-100 dark:border-zinc-800/80 mt-1">
          {dados.statusTexto}
        </div>
      </div>
    </div>
  );
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    const porRes = window.innerWidth < 768;
    const porUA = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const porTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    return porRes && (porUA || porTouch);
  });

  useEffect(() => {
    const check = () => {
      const porRes = window.innerWidth < 768;
      const porUA = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const porTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      setIsMobile(porRes && (porUA || porTouch));
    };
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return isMobile;
}

export function BalaoProgressoHover(props: {
  codigoDisciplina: string;
  nomeDisciplina?: string;
  perfil?: PerfilAluno | null;
  matriz?: Matriz | null;
  cargaHoraria?: number;
  posicao?: "superior" | "inferior";
  classe?: string;
  carregando?: boolean;
  semHistorico?: boolean;
}) {
  const sup = (props.posicao ?? "superior") === "superior";

  if (!props.perfil || !props.perfil.cursadas?.length || props.semHistorico) {
    return (
      <div
        className={`absolute left-1/2 -translate-x-1/2 z-50 w-64 rounded-xl border border-zinc-200/95 bg-white/95 p-2.5 shadow-2xl backdrop-blur-md dark:border-zinc-700/90 dark:bg-zinc-900/95 transition-all animate-in fade-in zoom-in-95 duration-150 pointer-events-none ${
          sup ? "bottom-full mb-3" : "top-full mt-3"
        } ${props.classe ?? ""}`}
      >
        <div
          className={`absolute left-1/2 -translate-x-1/2 border-[7px] border-transparent ${
            sup
              ? "top-full border-t-white dark:border-t-zinc-900"
              : "bottom-full border-b-white dark:border-b-zinc-900"
          }`}
        />
        <div className="flex flex-col gap-0.5 text-left">
          <span className="font-mono text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
            {props.codigoDisciplina}
          </span>
          <div className="font-display text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
            {props.nomeDisciplina ?? props.codigoDisciplina}
          </div>
        </div>
      </div>
    );
  }

  if (props.carregando) {
    return (
      <div
        className={`absolute left-1/2 -translate-x-1/2 z-50 w-64 rounded-xl border border-zinc-200/95 bg-white/95 p-2.5 shadow-2xl backdrop-blur-md dark:border-zinc-700/90 dark:bg-zinc-900/95 transition-all animate-in fade-in zoom-in-95 duration-150 pointer-events-none ${
          sup ? "bottom-full mb-3" : "top-full mt-3"
        } ${props.classe ?? ""}`}
      >
        {/* Seta do balão */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 border-[7px] border-transparent ${
            sup
              ? "top-full border-t-white dark:border-t-zinc-900"
              : "bottom-full border-b-white dark:border-b-zinc-900"
          }`}
        />

        <div className="flex items-center gap-2.5 text-left">
          <div className="relative shrink-0 flex items-center justify-center">
            <style>{`
              @keyframes radialPieProgress {
                0% { stroke-dashoffset: 100.53; }
                100% { stroke-dashoffset: 0; }
              }
            `}</style>
            <svg viewBox="0 0 36 36" className="w-6 h-6 -rotate-90">
              <circle cx="18" cy="18" r="16" fill="none" className="stroke-zinc-200 dark:stroke-zinc-700" strokeWidth="4" />
              <circle
                cx="18" cy="18" r="16" fill="none"
                className="stroke-utfpr-500" strokeWidth="4" strokeDasharray="100.53"
                style={{ animation: "radialPieProgress 1s linear forwards" }}
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-snug truncate">
              {props.nomeDisciplina ?? props.codigoDisciplina}
            </div>
            <div className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
              Carregando progresso (1s)...
            </div>
          </div>
        </div>
      </div>
    );
  }

  const dados = calcularProgressoMateria(
    props.codigoDisciplina,
    props.nomeDisciplina ?? props.codigoDisciplina,
    props.cargaHoraria ?? 60,
    props.perfil,
    props.matriz
  );

  return (
    <div
      className={`absolute left-1/2 -translate-x-1/2 z-50 w-72 rounded-xl border border-zinc-200/95 bg-white/95 p-3 shadow-2xl backdrop-blur-md dark:border-zinc-700/90 dark:bg-zinc-900/95 transition-all animate-in fade-in zoom-in-95 duration-200 pointer-events-none ${
        sup ? "bottom-full mb-3" : "top-full mt-3"
      } ${props.classe ?? ""}`}
    >
      {/* Seta do balão */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 border-[7px] border-transparent ${
          sup
            ? "top-full border-t-white dark:border-t-zinc-900"
            : "bottom-full border-b-white dark:border-b-zinc-900"
        }`}
      />

      <div className="flex flex-col gap-1 text-left">
        <div className="font-display text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-snug truncate">
          {props.nomeDisciplina ?? props.codigoDisciplina}
        </div>
        <div className="font-mono text-[11px] font-semibold text-utfpr-600 dark:text-utfpr-400 truncate">
          {dados.categoriaNome}
        </div>

        <div className="mt-1.5 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
            <span>Progresso</span>
            <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
              {dados.cumpridoBase}h <span className="text-utfpr-600 dark:text-utfpr-400 font-bold">+{dados.previewCarga}h</span>
              {" / "}
              {dados.exigido}h
            </span>
          </div>
          <BarraProgressoComPreview
            cumprido={dados.cumpridoBase}
            preview={dados.previewCarga}
            exigido={dados.exigido}
            classe="h-2"
          />
        </div>
      </div>
    </div>
  );
}
