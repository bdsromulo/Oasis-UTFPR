// Sidebar de feedback contínuo (inspirada na minigrade do Grade na Hora):
// grade semanal compacta sempre visível com as turmas escolhidas, preview da
// turma sob o mouse, contador de aulas e alerta de conflitos.
import { useMemo } from "react";
import type { DisciplinaOfertada, OfertaSemestre, Turma } from "../domain/tipos";
import {
  aulasSemanais,
  chaveSlot,
  detectarConflitos,
  horariosUnicos,
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

export function itensDaSelecao(oferta: OfertaSemestre, selecao: SelecaoTurma[]): ItemGrade[] {
  const out: ItemGrade[] = [];
  for (const s of selecao) {
    const d = oferta.disciplinas.find((x) => x.codigo === s.codDisciplina);
    const t = d?.turmas.find((x) => x.codigo === s.codTurma);
    if (d && t) out.push({ disciplina: d, turma: t });
  }
  return out;
}

export function MiniGrade(props: {
  oferta: OfertaSemestre;
  selecao: SelecaoTurma[];
  preview: PreviewTurma | null;
  onLimpar?: () => void;
}) {
  const { oferta, selecao, preview } = props;
  const itens = useMemo(() => itensDaSelecao(oferta, selecao), [oferta, selecao]);
  const conflitos = useMemo(() => detectarConflitos(itens), [itens]);

  const porSlot = useMemo(() => {
    const mapa = new Map<string, { cor: string; codigo: string }[]>();
    itens.forEach((item, i) => {
      for (const h of horariosUnicos(item.turma)) {
        const k = chaveSlot(h);
        const lista = mapa.get(k) ?? [];
        lista.push({ cor: CORES_GRADE[i % CORES_GRADE.length], codigo: item.disciplina.codigo });
        mapa.set(k, lista);
      }
    });
    return mapa;
  }, [itens]);

  const slotsPreview = useMemo(() => {
    if (!preview) return new Set<string>();
    return new Set(horariosUnicos(preview.turma).map(chaveSlot));
  }, [preview]);

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-3 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-zinc-400">
          Minha grade · {oferta.semestre}
        </span>
        {props.onLimpar && itens.length > 0 && (
          <button
            onClick={props.onLimpar}
            className="text-xs text-zinc-400 underline-offset-2 hover:text-red-500 hover:underline"
          >
            limpar
          </button>
        )}
      </div>

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
                  return (
                    <td key={dia} className="p-px">
                      <div
                        title={
                          ocupantes.map((o) => o.codigo).join(" + ") +
                          (emPreview && preview ? ` (preview: ${preview.disciplina.codigo})` : "") +
                          (faixa ? ` · ${faixa.inicio}–${faixa.fim}` : "")
                        }
                        className={`h-3.5 rounded-sm transition-colors ${
                          choque
                            ? "bg-red-500 ring-1 ring-red-600"
                            : ocupantes.length
                              ? ocupantes[0].cor
                              : emPreview
                                ? "bg-utfpr-500/40 ring-1 ring-utfpr-500"
                                : "bg-zinc-100 dark:bg-zinc-800"
                        }`}
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge tom="acento">{aulasSemanais(itens)} aulas/sem</Badge>
        {conflitos.length > 0 ? (
          <Badge tom="alerta">{conflitos.length} conflito(s)</Badge>
        ) : itens.length > 0 ? (
          <Badge tom="ok">sem conflitos</Badge>
        ) : null}
      </div>

      {itens.length > 0 && (
        <ul className="mt-2 space-y-1">
          {itens.map((item, i) => (
            <li key={item.disciplina.codigo} className="flex items-center gap-1.5 text-xs">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${CORES_GRADE[i % CORES_GRADE.length]}`}
              />
              <span className="truncate text-zinc-600 dark:text-zinc-300">
                <span className="font-mono">{item.disciplina.codigo}</span> {item.turma.codigo}
              </span>
            </li>
          ))}
        </ul>
      )}

      {itens.length > 0 && (
        <button
          onClick={() => navigator.clipboard.writeText(relatorioTexto(itens))}
          className="mt-3 w-full rounded-lg bg-utfpr-500 px-2 py-1.5 text-xs font-semibold text-zinc-900 transition-colors hover:bg-utfpr-400"
        >
          copiar p/ matrícula
        </button>
      )}
    </div>
  );
}
