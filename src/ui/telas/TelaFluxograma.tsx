import { useEffect, useMemo, useRef, useState } from "react";
import type { Matriz, OfertaSemestre, PerfilAluno } from "../../domain/tipos";
import {
  ALTURA_NO,
  LARGURA_NO,
  codigosOfertados,
  montarBoardObrigatorias,
  montarBoardTrilhas,
  type Board,
  type GrupoCor,
  type NoFluxo,
} from "../../domain/motor/fluxograma";
import { descricaoDoCurso } from "../../domain/cursos";

type AbaBoard = "obrigatorias" | "trilhas";

const ZOOM_MIN = 0.35;
const ZOOM_MAX = 1.8;

/** Paleta por eixo de formação — a cor é o que dá leitura rápida ao board. */
const CORES: Record<GrupoCor, { no: string; barra: string; rotulo: string }> = {
  basica: {
    no: "border-sky-400/70 bg-sky-50 dark:border-sky-500/50 dark:bg-sky-950/50",
    barra: "bg-sky-500",
    rotulo: "Formação básica e científica",
  },
  profissional: {
    no: "border-utfpr-500/70 bg-amber-50 dark:border-utfpr-500/50 dark:bg-amber-950/40",
    barra: "bg-utfpr-500",
    rotulo: "Formação profissional",
  },
  humanistica: {
    no: "border-violet-400/70 bg-violet-50 dark:border-violet-500/50 dark:bg-violet-950/50",
    barra: "bg-violet-500",
    rotulo: "Formação humanística",
  },
  estagio: {
    no: "border-teal-400/70 bg-teal-50 dark:border-teal-500/50 dark:bg-teal-950/50",
    barra: "bg-teal-500",
    rotulo: "Estágio",
  },
  conclusao: {
    no: "border-rose-400/70 bg-rose-50 dark:border-rose-500/50 dark:bg-rose-950/50",
    barra: "bg-rose-500",
    rotulo: "Trabalho de conclusão",
  },
  atividades: {
    no: "border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900",
    barra: "bg-zinc-400",
    rotulo: "Atividades",
  },
  segundoEstrato: {
    no: "border-emerald-400/70 bg-emerald-50 dark:border-emerald-500/50 dark:bg-emerald-950/50",
    barra: "bg-emerald-500",
    rotulo: "2º estrato",
  },
  trilha: {
    no: "border-indigo-400/70 bg-indigo-50 dark:border-indigo-500/50 dark:bg-indigo-950/50",
    barra: "bg-indigo-500",
    rotulo: "Trilha do 3º estrato",
  },
  externo: {
    no: "border-dashed border-zinc-300 bg-zinc-50/70 dark:border-zinc-700 dark:bg-zinc-900/60",
    barra: "bg-zinc-300 dark:bg-zinc-700",
    rotulo: "Pré-requisito de fora da trilha",
  },
};

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Curva da aresta: sai pela direita do pré-requisito e entra pela esquerda do dependente. */
function caminhoAresta(a: NoFluxo, b: NoFluxo): string {
  const x1 = a.x + LARGURA_NO;
  const y1 = a.y + ALTURA_NO / 2;
  const x2 = b.x;
  const y2 = b.y + ALTURA_NO / 2;
  const dx = Math.max(36, (x2 - x1) / 2);
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

export function TelaFluxograma(props: {
  matriz: Matriz;
  ofertas: OfertaSemestre[];
  perfil: PerfilAluno | null;
}) {
  const { matriz, ofertas, perfil } = props;
  const curso = descricaoDoCurso(matriz);
  const [abaBoard, setAbaBoard] = useState<AbaBoard>("obrigatorias");
  const [busca, setBusca] = useState("");
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.72);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const arrastando = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const abertos = useMemo(() => codigosOfertados(ofertas), [ofertas]);

  const boardObr = useMemo(() => montarBoardObrigatorias(matriz), [matriz]);
  const boardTri = useMemo(() => montarBoardTrilhas(matriz, abertos), [matriz, abertos]);
  const board: Board = abaBoard === "obrigatorias" ? boardObr : boardTri;

  const nosPorId = useMemo(() => new Map(board.nos.map((n) => [n.id, n])), [board]);

  // ao trocar de board, o pan/seleção do anterior não faz mais sentido
  useEffect(() => {
    setPan({ x: 0, y: 0 });
    setSelecionado(null);
  }, [abaBoard]);

  const aprovadas = useMemo(() => {
    const s = new Set<string>();
    if (perfil) for (const c of perfil.aprovadas) s.add(c);
    return s;
  }, [perfil]);

  const correspondem = useMemo(() => {
    const termo = normalizar(busca.trim());
    if (!termo) return null;
    const s = new Set<string>();
    for (const n of board.nos) {
      if (normalizar(n.nome).includes(termo) || normalizar(n.codigo).includes(termo)) s.add(n.id);
    }
    return s;
  }, [busca, board]);

  /** cadeia completa (ancestrais + descendentes) do nó selecionado */
  const cadeia = useMemo(() => {
    if (!selecionado) return null;
    const paisDe = new Map<string, string[]>();
    const filhosDe = new Map<string, string[]>();
    for (const a of board.arestas) {
      if (!paisDe.has(a.para)) paisDe.set(a.para, []);
      paisDe.get(a.para)!.push(a.de);
      if (!filhosDe.has(a.de)) filhosDe.set(a.de, []);
      filhosDe.get(a.de)!.push(a.para);
    }
    const vistos = new Set<string>([selecionado]);
    const andar = (id: string, mapa: Map<string, string[]>) => {
      for (const prox of mapa.get(id) ?? []) {
        if (vistos.has(prox)) continue;
        vistos.add(prox);
        andar(prox, mapa);
      }
    };
    andar(selecionado, paisDe);
    andar(selecionado, filhosDe);
    return vistos;
  }, [selecionado, board]);

  function estadoDoNo(n: NoFluxo): "ativo" | "apagado" | "normal" {
    if (cadeia) return cadeia.has(n.id) ? "ativo" : "apagado";
    if (correspondem) return correspondem.has(n.id) ? "ativo" : "apagado";
    return "normal";
  }

  function arestaAtiva(de: string, para: string): boolean {
    if (cadeia) return cadeia.has(de) && cadeia.has(para);
    if (correspondem) return correspondem.has(de) || correspondem.has(para);
    return false;
  }

  function arestaApagada(de: string, para: string): boolean {
    if (!cadeia && !correspondem) return false;
    return !arestaAtiva(de, para);
  }

  function iniciarArrasto(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest("[data-no]")) return;
    arrastando.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }

  useEffect(() => {
    function mover(e: MouseEvent) {
      const a = arrastando.current;
      if (!a) return;
      setPan({ x: a.panX + (e.clientX - a.x), y: a.panY + (e.clientY - a.y) });
    }
    function soltar() {
      arrastando.current = null;
    }
    window.addEventListener("mousemove", mover);
    window.addEventListener("mouseup", soltar);
    return () => {
      window.removeEventListener("mousemove", mover);
      window.removeEventListener("mouseup", soltar);
    };
  }, []);

  // zoom na roda do mouse ancorado no cursor (listener nativo: precisa ser não-passivo)
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    function naRoda(e: WheelEvent) {
      e.preventDefault();
      const caixa = el!.getBoundingClientRect();
      const cx = e.clientX - caixa.left;
      const cy = e.clientY - caixa.top;
      setZoom((z) => {
        const novo = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
        setPan((p) => ({
          x: cx - ((cx - p.x) / z) * novo,
          y: cy - ((cy - p.y) / z) * novo,
        }));
        return novo;
      });
    }
    el.addEventListener("wheel", naRoda, { passive: false });
    return () => el.removeEventListener("wheel", naRoda);
  }, []);

  /** centraliza o primeiro resultado da busca no viewport */
  function irPara(id: string) {
    const n = nosPorId.get(id);
    const el = viewportRef.current;
    if (!n || !el) return;
    const caixa = el.getBoundingClientRect();
    setPan({
      x: caixa.width / 2 - (n.x + LARGURA_NO / 2) * zoom,
      y: caixa.height / 2 - (n.y + ALTURA_NO / 2) * zoom,
    });
  }

  const resultados = correspondem ? board.nos.filter((n) => correspondem.has(n.id)) : [];
  const gruposPresentes = [...new Set(board.nos.map((n) => n.grupo))];

  return (
    <div className="space-y-4">
      {/* Abas dos dois boards */}
      <div className="grid grid-cols-2 gap-2 rounded-3xl border-2 border-zinc-200/90 bg-white/95 p-2 shadow-md dark:border-zinc-800/90 dark:bg-zinc-900/95">
        {(
          [
            { id: "obrigatorias" as const, rotulo: curso.matriz === 981 ? "Obrigatórias & 2º Estrato" : "Obrigatórias", icone: "🎓", qtd: boardObr.nos.length },
            { id: "trilhas" as const, rotulo: curso.matriz === 981 ? "Trilhas do 3º Estrato" : "Trilhas Optativas", icone: "⚡", qtd: boardTri.nos.filter((n) => !n.externo).length },
          ]
        ).map((op) => {
          const ativo = abaBoard === op.id;
          return (
            <button
              key={op.id}
              type="button"
              onClick={() => setAbaBoard(op.id)}
              className={`flex items-center justify-center gap-2.5 rounded-2xl px-4 py-3 font-display text-sm font-black transition-all cursor-pointer ${
                ativo
                  ? "bg-zinc-900 text-utfpr-400 shadow-md ring-2 ring-utfpr-500/40 dark:bg-zinc-800"
                  : "bg-zinc-50/90 text-zinc-700 hover:bg-utfpr-50 dark:bg-zinc-800/60 dark:text-zinc-300"
              }`}
            >
              <span>{op.icone}</span>
              <span className="truncate">{op.rotulo}</span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[11px] font-black ${
                  ativo ? "bg-utfpr-500 text-zinc-950" : "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
                }`}
              >
                {op.qtd}
              </span>
            </button>
          );
        })}
      </div>

      {abaBoard === "trilhas" && (
        <p className="rounded-2xl border border-indigo-300/70 bg-indigo-50/70 px-4 py-3 text-xs font-medium leading-relaxed text-indigo-900 dark:border-indigo-800/70 dark:bg-indigo-950/40 dark:text-indigo-200">
          Este board mostra apenas disciplinas de trilha que <strong>efetivamente abriram</strong> em {ofertas.map((o) => o.semestre.replace("-", ".")).join(" ou ")} — trilhas sem oferta conhecida não aparecem. Blocos tracejados são
          pré-requisitos que vivem fora da trilha.
        </p>
      )}

      {/* Barra de ferramentas: busca e zoom */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200/90 bg-white p-3 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="relative min-w-[220px] flex-1">
          <input
            type="search"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setSelecionado(null);
            }}
            placeholder="Buscar matéria por nome ou código…"
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-utfpr-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
            🔍
          </span>
        </div>

        {busca && (
          <span className="font-mono text-xs font-bold text-zinc-500 dark:text-zinc-400">
            {resultados.length} {resultados.length === 1 ? "resultado" : "resultados"}
          </span>
        )}

        {selecionado && (
          <button
            type="button"
            onClick={() => setSelecionado(null)}
            className="rounded-xl bg-utfpr-500/20 px-3 py-1.5 font-display text-xs font-black text-utfpr-700 transition-colors hover:bg-utfpr-500/30 dark:text-utfpr-400 cursor-pointer"
          >
            Limpar cadeia ✕
          </button>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z / 1.15))}
            title="Reduzir"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 font-black text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 cursor-pointer"
          >
            −
          </button>
          <span className="w-12 text-center font-mono text-xs font-bold text-zinc-500 dark:text-zinc-400">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z * 1.15))}
            title="Ampliar"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 font-black text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 cursor-pointer"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(0.72);
              setPan({ x: 0, y: 0 });
            }}
            className="rounded-xl bg-zinc-100 px-3 py-2 font-display text-xs font-black text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 cursor-pointer"
          >
            Reenquadrar
          </button>
        </div>
      </div>

      {/* Resultados clicáveis da busca */}
      {busca && resultados.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {resultados.slice(0, 12).map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => {
                setSelecionado(n.id);
                irPara(n.id);
              }}
              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 font-display text-xs font-bold text-zinc-700 transition-colors hover:border-utfpr-500 hover:text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:text-white cursor-pointer"
            >
              {n.nome}
            </button>
          ))}
        </div>
      )}

      {/* Canvas navegável */}
      <div
        ref={viewportRef}
        onMouseDown={iniciarArrasto}
        className="relative h-[620px] cursor-grab overflow-hidden rounded-3xl border-2 border-zinc-200/90 bg-zinc-50 shadow-inner active:cursor-grabbing dark:border-zinc-800/90 dark:bg-zinc-950/60"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgb(161 161 170 / 0.28) 1px, transparent 1px)",
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            width: board.largura,
            height: board.altura,
          }}
        >
          {/* faixas de fundo */}
          {board.faixas.map((f) => (
            <div
              key={f.id}
              className="absolute rounded-2xl border border-zinc-200/80 bg-white/60 dark:border-zinc-800/80 dark:bg-zinc-900/40"
              style={{ left: 12, top: f.y, width: board.largura - 24, height: f.altura }}
            >
              <div className="px-4 pt-3">
                <div className="font-display text-sm font-black tracking-tight text-zinc-800 dark:text-zinc-200">
                  {f.rotulo}
                </div>
                {f.subrotulo && (
                  <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-500">
                    {f.subrotulo}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* rótulos de coluna (períodos) */}
          {board.colunas.map((c) => (
            <div
              key={c.rotulo}
              className="absolute font-display text-[11px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-600"
              style={{ left: c.x, top: 14, width: LARGURA_NO, textAlign: "center" }}
            >
              {c.rotulo}
            </div>
          ))}

          {/* arestas de pré-requisito */}
          <svg
            className="pointer-events-none absolute left-0 top-0 overflow-visible"
            width={board.largura}
            height={board.altura}
          >
            <defs>
              <marker id="seta" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                <path d="M 0 0 L 7 3.5 L 0 7 z" className="fill-zinc-400 dark:fill-zinc-600" />
              </marker>
              <marker
                id="seta-ativa"
                markerWidth="7"
                markerHeight="7"
                refX="6"
                refY="3.5"
                orient="auto"
              >
                <path d="M 0 0 L 7 3.5 L 0 7 z" className="fill-utfpr-500" />
              </marker>
            </defs>
            {board.arestas.map((a) => {
              const de = nosPorId.get(a.de);
              const para = nosPorId.get(a.para);
              if (!de || !para) return null;
              const ativa = arestaAtiva(a.de, a.para);
              const apagada = arestaApagada(a.de, a.para);
              return (
                <path
                  key={a.id}
                  d={caminhoAresta(de, para)}
                  fill="none"
                  strokeWidth={ativa ? 2.6 : 1.6}
                  markerEnd={ativa ? "url(#seta-ativa)" : "url(#seta)"}
                  className={`transition-opacity ${
                    ativa ? "stroke-utfpr-500" : "stroke-zinc-400 dark:stroke-zinc-700"
                  }`}
                  opacity={apagada ? 0.12 : 1}
                />
              );
            })}
          </svg>

          {/* blocos das disciplinas */}
          {board.nos.map((n) => {
            const estado = estadoDoNo(n);
            const cor = CORES[n.grupo];
            const concluida = aprovadas.has(n.codigo);
            return (
              <button
                key={n.id}
                data-no={n.id}
                type="button"
                onClick={() => setSelecionado(selecionado === n.id ? null : n.id)}
                title={`${n.codigo} — ${n.nome}${n.horas ? ` · ${n.horas}h` : ""}${
                  n.exigePeriodo ? ` · exige ${n.exigePeriodo}º período` : ""
                }`}
                className={`absolute flex flex-col justify-center overflow-hidden rounded-xl border-2 px-3 text-left shadow-xs transition-all hover:z-10 hover:shadow-lg cursor-pointer ${cor.no} ${
                  estado === "ativo" ? "ring-2 ring-utfpr-500 ring-offset-1 dark:ring-offset-zinc-950" : ""
                } ${selecionado === n.id ? "scale-[1.03] shadow-lg" : ""}`}
                style={{
                  left: n.x,
                  top: n.y,
                  width: LARGURA_NO,
                  height: ALTURA_NO,
                  opacity: estado === "apagado" ? 0.2 : 1,
                }}
              >
                <span className={`absolute left-0 top-0 h-full w-1.5 ${cor.barra}`} />
                <span
                  className={`line-clamp-3 pl-1.5 font-display text-[12.5px] font-bold leading-tight ${
                    n.externo
                      ? "text-zinc-500 dark:text-zinc-500"
                      : "text-zinc-900 dark:text-zinc-100"
                  }`}
                >
                  {n.nome}
                </span>
                {concluida && (
                  <span
                    className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-black text-white"
                    title="Concluída no seu histórico"
                  >
                    ✓
                  </span>
                )}
                {n.exigePeriodo && (
                  <span className="absolute bottom-1 right-1.5 rounded bg-zinc-900/80 px-1 font-mono text-[9px] font-bold text-utfpr-400">
                    {n.exigePeriodo}º per.
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* dica de navegação */}
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-zinc-900/80 px-3.5 py-1.5 text-[11px] font-semibold text-zinc-300 backdrop-blur-sm">
          Arraste para mover · roda do mouse para zoom · clique num bloco para ver a cadeia de pré-requisitos
        </div>
      </div>

      {/* Legenda de cores */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-zinc-200/90 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        {gruposPresentes.map((g) => (
          <span key={g} className="flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            <span className={`h-3 w-3 rounded ${CORES[g].barra}`} />
            {CORES[g].rotulo}
          </span>
        ))}
        {perfil && (
          <span className="flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-[8px] font-black text-white">
              ✓
            </span>
            Concluída no seu histórico
          </span>
        )}
      </div>
    </div>
  );
}
