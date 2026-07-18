// Sidebar de feedback contínuo (inspirada na minigrade do Grade na Hora):
// grade semanal compacta sempre visível com as turmas escolhidas, preview da
// turma sob o mouse, contador de aulas e alerta de conflitos.
import { useState, useMemo } from "react";
import type { DisciplinaOfertada, OfertaSemestre, Turma } from "../domain/tipos";
import {
  aulasSemanais,
  chaveSlot,
  detectarConflitos,
  horariosUnicos,
  itensDaSelecao,
  relatorioTexto,
  type ItemGrade,
} from "../domain/motor/grade";
import { faixaDoSlot } from "../domain/horarios";
import type { SelecaoTurma } from "./App";
import { Badge } from "./componentes";

const DIAS: [number, string][] = [
  [2, "S"],
  [3, "T"],
  [4, "Q"],
  [5, "Q"],
  [6, "S"],
  [7, "S"],
];
const SLOTS: [string, number][] = [
  ...[1, 2, 3, 4, 5, 6].map((n) => ["M", n] as [string, number]),
  ...[1, 2, 3, 4, 5, 6].map((n) => ["T", n] as [string, number]),
  ...[1, 2, 3, 4, 5].map((n) => ["N", n] as [string, number]),
];

export const CORES_GRADE = [
  "bg-utfpr-500 text-zinc-900",
  "bg-sky-500 text-white",
  "bg-emerald-500 text-white",
  "bg-violet-500 text-white",
  "bg-rose-500 text-white",
  "bg-orange-500 text-white",
  "bg-teal-500 text-white",
  "bg-fuchsia-500 text-white",
  "bg-lime-500 text-zinc-900",
  "bg-indigo-500 text-white",
];

export interface PreviewTurma {
  disciplina: DisciplinaOfertada;
  turma: Turma;
}

export { itensDaSelecao };

export function MiniGrade(props: {
  oferta: OfertaSemestre;
  selecao: SelecaoTurma[];
  preview: PreviewTurma | null;
  onLimpar?: () => void;
  cestaGrades?: { [id: string]: SelecaoTurma[] };
  gradeAtiva?: string;
  onMudarGradeAtiva?: (id: string) => void;
  onNovaGrade?: () => void;
  onRemoverGrade?: (id: string) => void;
  onRemoverTurma?: (codigoDisciplina: string) => void;
  exclusoesSugestao?: {
    disciplinas: { codigo: string; nome: string }[];
    professores: string[];
    trilhas?: { conjunto: string; nome: string }[];
    outrosFiltros?: string[];
  } | null;
  onLimparExclusoes?: () => void;
}) {
  const [modalCompletoAberto, setModalCompletoAberto] = useState(false);
  const [disciplinaHoverId, setDisciplinaHoverId] = useState<string | null>(null);
  const [modalConfirmarLimpar, setModalConfirmarLimpar] = useState(false);
  const [minimizada, setMinimizada] = useState(() => localStorage.getItem("minigrade_minimizada") === "true");

  function handleToggleMinimizar(e: React.MouseEvent) {
    e.stopPropagation();
    const next = !minimizada;
    setMinimizada(next);
    localStorage.setItem("minigrade_minimizada", String(next));
  }

  const {
    oferta,
    selecao,
    preview,
    cestaGrades,
    gradeAtiva = "A",
    onMudarGradeAtiva,
    onNovaGrade,
    onRemoverGrade,
    onRemoverTurma,
  } = props;
  const itens: ItemGrade[] = useMemo(() => itensDaSelecao(oferta, selecao), [oferta, selecao]);
  const conflitos = useMemo(() => detectarConflitos(itens), [itens]);

  const porSlot = useMemo(() => {
    const mapa = new Map<string, { cor: string; codigo: string; nome: string; turma: string; sede?: string }[]>();
    itens.forEach((item, i) => {
      for (const h of horariosUnicos(item.turma)) {
        const k = chaveSlot(h);
        const lista = mapa.get(k) ?? [];
        lista.push({
          cor: CORES_GRADE[i % CORES_GRADE.length],
          codigo: item.disciplina.codigo,
          nome: item.disciplina.nome,
          turma: item.turma.codigo,
          sede: h.sede,
        });
        mapa.set(k, lista);
      }
    });
    return mapa;
  }, [itens]);

  const slotsPreview = useMemo(() => {
    if (!preview) return new Set<string>();
    return new Set(horariosUnicos(preview.turma).map(chaveSlot));
  }, [preview]);

  const chavesGrades = cestaGrades ? Object.keys(cestaGrades).sort() : ["A"];

  return (
    <div
      onClick={() => {
        if (minimizada) {
          setMinimizada(false);
          localStorage.setItem("minigrade_minimizada", "false");
        }
      }}
      className={`rounded-2xl border border-zinc-200/80 bg-white p-3 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900 transition-all max-h-[calc(100vh-2rem)] overflow-y-auto ${
        minimizada ? "cursor-pointer hover:border-utfpr-500/50 hover:shadow-md" : ""
      }`}
      title={minimizada ? "Clique em qualquer lugar para expandir a Prévia de Planejamento" : undefined}
    >
      {/* Cabeçalho Principal do Bloco */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-display text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-100 truncate">
              Prévia de Planejamento de Matrícula
            </h4>
            {minimizada && itens.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-utfpr-500/20 px-2 py-0.5 text-[10px] font-bold text-utfpr-700 dark:text-utfpr-300 shrink-0">
                {itens.length} {itens.length === 1 ? "matéria" : "matérias"}
              </span>
            )}
          </div>
          <div className="text-[11px] font-bold text-zinc-400 truncate mt-0.5">
            Minha grade · {oferta.semestre} {chavesGrades.length > 1 ? `(${gradeAtiva})` : ""}
          </div>
        </div>

        {/* Ações do Cabeçalho: Expandir + Seta Toggle */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setModalCompletoAberto(true);
            }}
            className="group/btn flex items-center gap-1.5 rounded-lg bg-zinc-100 px-2 py-1 font-display text-xs font-bold text-zinc-700 hover:bg-utfpr-500 hover:text-zinc-950 dark:bg-zinc-800 dark:text-zinc-300 transition-all cursor-pointer shadow-2xs overflow-hidden"
            title="Expandir visualização da Grade Completa em Pop-up Grande"
          >
            <span className="text-sm leading-none">⛶</span>
            <span className="max-w-0 overflow-hidden opacity-0 group-hover/btn:max-w-xs group-hover/btn:opacity-100 transition-all duration-300 ease-in-out whitespace-nowrap">
              Expandir
            </span>
          </button>

          <button
            onClick={handleToggleMinimizar}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-white transition-colors cursor-pointer"
            title={minimizada ? "Expandir bloco da prévia" : "Minimizar bloco da prévia"}
          >
            <span className={`transition-transform duration-200 text-xs font-bold ${minimizada ? "rotate-180" : ""}`}>
              ▲
            </span>
          </button>
        </div>
      </div>

      {!minimizada && (
        <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 space-y-3 animate-in fade-in duration-200">
          {/* Abas de Grades Alternativas [ A ] [ + ] e Ações */}
          {cestaGrades && onMudarGradeAtiva && (
            <div className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-2.5 dark:border-zinc-800">
              <div className="flex items-center gap-1.5">
                {chavesGrades.map((g) => {
                  const ativa = g === gradeAtiva;
                  return (
                    <div key={g} className="group relative flex items-center">
                      <button
                        onClick={() => onMudarGradeAtiva(g)}
                        className={`flex h-7 w-8 items-center justify-center rounded-lg font-mono text-xs font-black transition-all ${
                          ativa
                            ? "bg-zinc-900 text-utfpr-500 shadow-xs dark:bg-zinc-800 dark:text-utfpr-400 border border-utfpr-500/40"
                            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        }`}
                        title={`Grade ${g}`}
                      >
                        {g}
                      </button>
                      {chavesGrades.length > 1 && onRemoverGrade && g !== "A" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoverGrade(g);
                          }}
                          className="absolute -right-1 -top-1 hidden h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-2xs group-hover:flex hover:bg-red-600"
                          title={`Remover Grade ${g}`}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
                {onNovaGrade && chavesGrades.length < 3 && (
                  <button
                    onClick={onNovaGrade}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 font-mono text-xs font-bold text-zinc-500 transition-colors hover:border-utfpr-500 hover:bg-utfpr-500/10 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-400 dark:hover:text-white"
                    title="Criar nova Grade alternativa B ou C para simulação (+)"
                  >
                    +
                  </button>
                )}
              </div>

              {props.onLimpar && itens.length > 0 && (
                <button
                  onClick={() => {
                    if (itens.length > 1) {
                      setModalConfirmarLimpar(true);
                    } else {
                      props.onLimpar?.();
                      props.onLimparExclusoes?.();
                    }
                  }}
                  className="text-xs text-zinc-400 underline-offset-2 hover:text-red-500 hover:underline cursor-pointer"
                >
                  limpar matérias
                </button>
              )}
            </div>
          )}

          {!cestaGrades && props.onLimpar && itens.length > 0 && (
            <div className="flex justify-end border-b border-zinc-100 pb-2 dark:border-zinc-800">
              <button
                onClick={() => {
                  if (itens.length > 1) {
                    setModalConfirmarLimpar(true);
                  } else {
                    props.onLimpar?.();
                    props.onLimparExclusoes?.();
                  }
                }}
                className="text-xs text-zinc-400 underline-offset-2 hover:text-red-500 hover:underline cursor-pointer"
              >
                limpar matérias
              </button>
            </div>
          )}

          <table className="w-full border-collapse text-[10px] leading-none">
            <thead>
              <tr>
                <th className="w-6" />
                {DIAS.map(([dia, r]) => (
                  <th key={dia} className="pb-1 font-semibold text-zinc-400">
                    {r}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SLOTS.map(([turno, aula]) => {
                const faixa = faixaDoSlot(turno, aula);
                return (
                  <tr
                    key={`${turno}${aula}`}
                    className={aula === 1 ? "border-t border-zinc-200 dark:border-zinc-700" : ""}
                  >
                    <td
                      className="py-px pr-1 text-right font-mono text-zinc-400"
                      title={faixa ? `${faixa.inicio}–${faixa.fim}` : undefined}
                    >
                      {turno}
                      {aula}
                    </td>
                    {DIAS.map(([dia]) => {
                      const k = `${dia}${turno}${aula}`;
                      const ocupantes = porSlot.get(k) ?? [];
                      const emPreview = slotsPreview.has(k);
                      const choque = ocupantes.length > 1 || (emPreview && ocupantes.length > 0);
                      const isHovered = ocupantes.some((o) => o.codigo === disciplinaHoverId);
                      return (
                        <td key={dia} className="p-px">
                          <div
                            title={
                              ocupantes.map((o) => o.codigo).join(" + ") +
                              (emPreview && preview ? ` (preview: ${preview.disciplina.codigo})` : "") +
                              (faixa ? ` · ${faixa.inicio}–${faixa.fim}` : "")
                            }
                            onMouseEnter={() => ocupantes.length > 0 && setDisciplinaHoverId(ocupantes[0].codigo)}
                            onMouseLeave={() => setDisciplinaHoverId(null)}
                            className={`h-3.5 rounded-sm transition-all flex items-center justify-center relative ${
                              choque
                                ? "bg-red-500 ring-1 ring-red-600"
                                : ocupantes.length
                                  ? ocupantes[0].cor
                                  : emPreview
                                    ? "bg-utfpr-500/40 ring-1 ring-utfpr-500"
                                    : "bg-zinc-100 dark:bg-zinc-800"
                            } ${
                              isHovered ? "ring-2 ring-zinc-950 dark:ring-white scale-110 z-10 shadow-xs brightness-105" : ""
                            }`}
                          >
                            {isHovered && ocupantes.length > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRemoverTurma?.(ocupantes[0].codigo);
                                }}
                                className="flex h-3 w-3 items-center justify-center rounded-full bg-red-600 text-[8px] font-black text-white shadow-2xs hover:bg-red-700 cursor-pointer"
                                title={`Remover ${ocupantes[0].codigo}`}
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tom="acento">{aulasSemanais(itens)} aulas/sem</Badge>
            {conflitos.length > 0 ? (
              <Badge tom="alerta">{conflitos.length} conflito(s)</Badge>
            ) : itens.length > 0 ? (
              <Badge tom="ok">sem conflitos</Badge>
            ) : null}
          </div>

          {props.exclusoesSugestao &&
            ((props.exclusoesSugestao.disciplinas && props.exclusoesSugestao.disciplinas.length > 0) ||
              (props.exclusoesSugestao.professores && props.exclusoesSugestao.professores.length > 0) ||
              (props.exclusoesSugestao.trilhas && props.exclusoesSugestao.trilhas.length > 0) ||
              (props.exclusoesSugestao.outrosFiltros && props.exclusoesSugestao.outrosFiltros.length > 0)) && (
              <div className="rounded-xl border border-amber-400/50 bg-amber-50/80 p-2 text-[11px] text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/60 dark:text-amber-200 space-y-1">
                <div className="font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1">ℹ️ Excluídos/Filtros via Sugestão de Grade:</span>
                  {props.onLimparExclusoes && (
                    <button
                      type="button"
                      onClick={props.onLimparExclusoes}
                      className="text-[10px] font-normal text-amber-700 hover:underline dark:text-amber-300 cursor-pointer"
                      title="Ocultar observação"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {props.exclusoesSugestao.disciplinas && props.exclusoesSugestao.disciplinas.length > 0 && (
                  <div
                    className="truncate"
                    title={props.exclusoesSugestao.disciplinas.map((d) => `${d.codigo} (${d.nome})`).join("; ")}
                  >
                    <strong>Matérias:</strong> {props.exclusoesSugestao.disciplinas.map((d) => d.codigo).join(", ")}
                  </div>
                )}
                {props.exclusoesSugestao.professores && props.exclusoesSugestao.professores.length > 0 && (
                  <div className="truncate" title={props.exclusoesSugestao.professores.join("; ")}>
                    <strong>Professores:</strong> {props.exclusoesSugestao.professores.join(", ")}
                  </div>
                )}
                {props.exclusoesSugestao.trilhas && props.exclusoesSugestao.trilhas.length > 0 && (
                  <div className="truncate" title={props.exclusoesSugestao.trilhas.map((t) => t.nome).join("; ")}>
                    <strong>Trilhas:</strong> {props.exclusoesSugestao.trilhas.map((t) => t.nome).join(", ")}
                  </div>
                )}
                {props.exclusoesSugestao.outrosFiltros && props.exclusoesSugestao.outrosFiltros.length > 0 && (
                  <div className="truncate" title={props.exclusoesSugestao.outrosFiltros.join("; ")}>
                    <strong>Filtros:</strong> {props.exclusoesSugestao.outrosFiltros.join(", ")}
                  </div>
                )}
              </div>
            )}

          {/* Preview em destaque com NOME COMPLETO da matéria */}
          {preview ? (
            <div className="flex items-center gap-2 rounded-xl border border-utfpr-500/50 bg-utfpr-500/15 p-2 text-xs font-semibold text-zinc-900 dark:border-utfpr-500/40 dark:bg-utfpr-500/10 dark:text-zinc-100 shadow-2xs animate-in fade-in duration-150">
              <span className="h-2 w-2 shrink-0 rounded-full bg-utfpr-500" />
              <span className="truncate">
                <span className="font-mono font-bold text-utfpr-800 dark:text-utfpr-400 mr-1">
                  {preview.disciplina.codigo}
                </span>
                <span className="font-mono mr-1.5">{preview.turma.codigo}</span>—{" "}
                <span className="font-bold ml-1">{preview.disciplina.nome}</span>
              </span>
            </div>
          ) : null}

          {itens.length > 0 && (
            <ul className="space-y-1">
              {itens.map((item, i) => {
                const codIdentificador = item.selecaoOriginal?.codDisciplina ?? item.disciplina.codigo;
                const isHovered =
                  disciplinaHoverId === item.disciplina.codigo ||
                  disciplinaHoverId === codIdentificador;
                return (
                  <li
                    key={item.selecaoOriginal ? `${item.selecaoOriginal.codDisciplina}-${item.selecaoOriginal.codTurma}` : item.disciplina.codigo}
                    onMouseEnter={() => setDisciplinaHoverId(codIdentificador)}
                    onMouseLeave={() => setDisciplinaHoverId(null)}
                    className={`group relative flex items-center justify-between gap-1.5 text-xs rounded-md px-1.5 py-1 transition-all ${
                      isHovered ? "bg-zinc-100 dark:bg-zinc-800 ring-1 ring-zinc-300 dark:ring-zinc-700 scale-[1.01]" : ""
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${CORES_GRADE[i % CORES_GRADE.length]}`}
                      />
                      <span className="truncate text-zinc-600 dark:text-zinc-300">
                        <span className="font-mono font-bold">{item.disciplina.codigo}</span> {item.turma.codigo} — <span className="font-semibold text-zinc-800 dark:text-zinc-200">{item.disciplina.nome}</span>
                      </span>
                    </div>
                    {onRemoverTurma && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoverTurma(codIdentificador);
                        }}
                        className={`h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-600 font-mono text-[10px] font-bold text-white shadow-2xs hover:bg-red-700 cursor-pointer ${
                          isHovered ? "flex" : "hidden group-hover:flex"
                        }`}
                        title={`Remover ${codIdentificador}`}
                      >
                        ×
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {itens.length > 0 && (
            <button
              onClick={() => navigator.clipboard.writeText(relatorioTexto(itens))}
              className="w-full rounded-lg bg-utfpr-500 px-2 py-1.5 text-xs font-semibold text-zinc-900 transition-colors hover:bg-utfpr-400"
            >
              copiar p/ matrícula
            </button>
          )}
        </div>
      )}

      {modalCompletoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 transition-all">
          <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden text-left">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800 shrink-0">
              <div>
                <h3 className="font-display text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  Grade Horária Completa · {oferta.semestre} {gradeAtiva ? `(Grade ${gradeAtiva})` : ""}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Visualização ampliada da sua grade atual com matéria, turma e sede/sala por horário
                </p>
              </div>
              <button
                onClick={() => setModalCompletoAberto(false)}
                className="rounded-xl bg-zinc-100 px-4 py-2 font-display text-sm font-bold text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                ✕ Fechar
              </button>
            </div>

            <div className="mt-4 flex-1 overflow-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="py-3 px-2 text-left font-mono font-bold text-zinc-400 w-24">Horário</th>
                    {DIAS.map(([dia, r], idx) => {
                      const nomesDias = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
                      return (
                        <th key={dia} className="py-3 px-2 text-center font-display font-bold text-zinc-700 dark:text-zinc-300">
                          {nomesDias[idx]} ({r})
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {SLOTS.map(([turno, aula]) => {
                    const faixa = faixaDoSlot(turno, aula);
                    return (
                      <tr key={`${turno}${aula}`} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                        <td className="py-2.5 px-2 font-mono text-xs font-semibold text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                          <div className="font-bold text-zinc-800 dark:text-zinc-200">{turno}{aula}</div>
                          <div className="text-[10px] text-zinc-400">{faixa ? `${faixa.inicio}–${faixa.fim}` : ""}</div>
                        </td>
                        {DIAS.map(([dia]) => {
                          const k = `${dia}${turno}${aula}`;
                          const ocupantes = porSlot.get(k) ?? [];
                          return (
                            <td key={dia} className="p-1.5 align-top h-16 w-[15%] border-l border-zinc-100 dark:border-zinc-800/40">
                              {ocupantes.length > 0 ? (
                                <div className="space-y-1">
                                {ocupantes.map((ocup, idxItem) => {
                                  const isHovered = disciplinaHoverId === ocup.codigo;
                                  return (
                                    <div
                                      key={`${ocup.codigo}-${ocup.turma}-${idxItem}`}
                                      onMouseEnter={() => setDisciplinaHoverId(ocup.codigo)}
                                      onMouseLeave={() => setDisciplinaHoverId(null)}
                                      className={`group relative rounded-xl p-2 shadow-2xs transition-all ${ocup.cor} ${
                                        isHovered ? "ring-2 ring-zinc-950 dark:ring-white scale-[1.03] z-10 brightness-105" : ""
                                      }`}
                                    >
                                      <div className="font-mono text-[11px] font-black tracking-tight flex items-center justify-between">
                                        <span>{ocup.codigo}</span>
                                        <span className="opacity-80">{ocup.turma}</span>
                                      </div>
                                      <div className="font-display text-xs font-bold leading-tight mt-0.5 line-clamp-2">
                                        {ocup.nome}
                                      </div>
                                      {ocup.sede && (
                                        <div className="mt-1 text-[10px] font-semibold opacity-90 flex items-center gap-0.5">
                                          <span>📍 {ocup.sede}</span>
                                        </div>
                                      )}
                                      {onRemoverTurma && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onRemoverTurma(ocup.codigo);
                                          }}
                                          className={`absolute right-1.5 top-1.5 h-4 w-4 items-center justify-center rounded-full bg-red-600 font-mono text-[10px] font-bold text-white shadow-2xs hover:bg-red-700 cursor-pointer ${
                                            isHovered ? "flex" : "hidden group-hover:flex"
                                          }`}
                                          title={`Remover ${ocup.codigo}`}
                                        >
                                          ×
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                                </div>
                              ) : (
                                <div className="h-full w-full min-h-[3rem] rounded-lg bg-zinc-50/40 dark:bg-zinc-800/10" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 border-t border-zinc-100 pt-3 flex items-center justify-between text-xs text-zinc-500 dark:border-zinc-800 shrink-0">
              <span>{itens.length} {itens.length === 1 ? "aula semanal selecionada" : "aulas semanais selecionadas"} na {gradeAtiva ? `Grade ${gradeAtiva}` : "grade atual"}</span>
              <button
                onClick={() => navigator.clipboard.writeText(relatorioTexto(itens))}
                className="rounded-xl bg-utfpr-500 px-4 py-1.5 font-display text-xs font-bold text-zinc-950 hover:bg-utfpr-400 transition-colors"
              >
                📋 Copiar resumo p/ matrícula
              </button>
            </div>
          </div>
        </div>
      )}

      {modalConfirmarLimpar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="flex max-w-md w-full flex-col rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 text-left">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-2">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-xl">
                🗑️
              </span>
              <h3 className="font-display text-lg font-black text-zinc-900 dark:text-white">
                Tem certeza que deseja limpar a prévia de Matrícula?
              </h3>
            </div>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
              Você está prestes a remover todas as <strong className="text-zinc-900 dark:text-white">{itens.length} disciplinas</strong> selecionadas na Grade <strong>{props.gradeAtiva || "A"}</strong>.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalConfirmarLimpar(false)}
                className="rounded-xl bg-zinc-100 px-4 py-2 font-display text-xs font-bold text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  props.onLimpar?.();
                  props.onLimparExclusoes?.();
                  setModalConfirmarLimpar(false);
                }}
                className="rounded-xl bg-red-600 px-4 py-2 font-display text-xs font-bold text-white hover:bg-red-700 transition-colors shadow-md cursor-pointer"
              >
                Sim, Limpar Grade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
