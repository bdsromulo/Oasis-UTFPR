import { useMemo, useState } from "react";
import type { OfertaSemestre } from "../../domain/tipos";
import {
  aulasSemanais,
  chaveSlot,
  detectarConflitos,
  horariosUnicos,
  relatorioTexto,
  type ItemGrade,
} from "../../domain/motor/grade";
import type { SelecaoTurma } from "../App";
import { faixaDoSlot } from "../../domain/horarios";
import { Badge, Botao, Card } from "../componentes";
import { IconCopy, IconCheck, IconTrash, IconWarning, IconCalendar } from "../icons";

const DIAS: [number, string][] = [
  [2, "Segunda"],
  [3, "Terça"],
  [4, "Quarta"],
  [5, "Quinta"],
  [6, "Sexta"],
  [7, "Sábado"],
];
const SLOTS = [
  ...[1, 2, 3, 4, 5, 6].map((n) => ["M", n] as const),
  ...[1, 2, 3, 4, 5, 6].map((n) => ["T", n] as const),
  ...[1, 2, 3, 4, 5].map((n) => ["N", n] as const),
];
const CORES = [
  "bg-utfpr-500 text-zinc-950 font-bold border border-utfpr-600/30 shadow-2xs",
  "bg-sky-500 text-white font-bold border border-sky-600/30 shadow-2xs",
  "bg-emerald-500 text-white font-bold border border-emerald-600/30 shadow-2xs",
  "bg-violet-500 text-white font-bold border border-violet-600/30 shadow-2xs",
  "bg-rose-500 text-white font-bold border border-rose-600/30 shadow-2xs",
  "bg-orange-500 text-white font-bold border border-orange-600/30 shadow-2xs",
  "bg-teal-500 text-white font-bold border border-teal-600/30 shadow-2xs",
  "bg-fuchsia-500 text-white font-bold border border-fuchsia-600/30 shadow-2xs",
];

export function TelaGrade(props: {
  oferta: OfertaSemestre;
  selecao: SelecaoTurma[];
  setSelecao: (s: SelecaoTurma[]) => void;
  cestaGrades?: Record<string, SelecaoTurma[]>;
  gradeAtiva?: string;
  onMudarGradeAtiva?: (id: string) => void;
  onNovaGrade?: () => void;
  onRemoverGrade?: (id: string) => void;
}) {
  const { oferta, selecao, setSelecao } = props;
  const [copiado, setCopiado] = useState(false);

  const itens: ItemGrade[] = useMemo(() => {
    const out: ItemGrade[] = [];
    for (const s of selecao) {
      const d = oferta.disciplinas.find((x) => x.codigo === s.codDisciplina);
      const t = d?.turmas.find((x) => x.codigo === s.codTurma);
      if (d && t) out.push({ disciplina: d, turma: t });
    }
    return out;
  }, [oferta, selecao]);

  const conflitos = useMemo(() => detectarConflitos(itens), [itens]);
  const porSlot = useMemo(() => {
    const mapa = new Map<string, { item: ItemGrade; cor: string; sala: string | null }[]>();
    itens.forEach((item, i) => {
      for (const h of horariosUnicos(item.turma)) {
        const k = chaveSlot(h);
        const lista = mapa.get(k) ?? [];
        lista.push({ item, cor: CORES[i % CORES.length], sala: h.sala });
        mapa.set(k, lista);
      }
    });
    return mapa;
  }, [itens]);

  const chavesGrades = props.cestaGrades ? Object.keys(props.cestaGrades).sort() : ["A"];
  const barraAbas = props.cestaGrades && props.onMudarGradeAtiva && (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-200/80 bg-white/80 p-3 shadow-2xs backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-900/80">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display text-xs font-bold text-zinc-500 dark:text-zinc-400 mr-1">Cenários de Grade:</span>
        {chavesGrades.map((g) => {
          const ativa = g === (props.gradeAtiva ?? "A");
          const count = (props.cestaGrades![g] ?? []).length;
          return (
            <div key={g} className="group relative flex items-center">
              <button
                onClick={() => props.onMudarGradeAtiva!(g)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-mono text-xs font-black transition-all ${
                  ativa
                    ? "bg-zinc-900 text-utfpr-500 shadow-xs dark:bg-zinc-800 dark:text-utfpr-400 border border-utfpr-500/40"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
                title={`Simulação Grade ${g}`}
              >
                <span>Grade {g}</span>
                <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${ativa ? "bg-utfpr-500/20 text-utfpr-400" : "bg-zinc-200/80 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"}`}>
                  {count}
                </span>
              </button>
              {chavesGrades.length > 1 && props.onRemoverGrade && g !== "A" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onRemoverGrade!(g);
                  }}
                  className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-2xs group-hover:flex hover:bg-red-600"
                  title={`Excluir Grade ${g}`}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
        {props.onNovaGrade && chavesGrades.length < 3 && (
          <button
            onClick={props.onNovaGrade}
            className="flex h-8 items-center gap-1 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-2.5 font-mono text-xs font-bold text-zinc-500 transition-colors hover:border-utfpr-500 hover:bg-utfpr-500/10 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-400 dark:hover:text-white"
            title="Criar nova Grade alternativa B ou C (+)"
          >
            <span>+ Nova Grade</span>
          </button>
        )}
      </div>
    </div>
  );

  if (itens.length === 0) {
    return (
      <div className="space-y-6">
        {barraAbas}
        <Card classe="p-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
              <IconCalendar className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Sua grade horária está vazia no momento — selecione e adicione turmas na aba{" "}
              <strong className="text-zinc-800 dark:text-zinc-200">Matérias Abertas</strong>.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {barraAbas}
      {conflitos.map((c, i) => (
        <div
          key={i}
          className={`flex items-center gap-2.5 rounded-xl border p-3.5 text-sm font-medium ${
            c.tipo === "choque"
              ? "border-red-300/80 bg-red-50/90 text-red-800 dark:border-red-800/80 dark:bg-red-950/70 dark:text-red-200"
              : "border-amber-300/80 bg-amber-50/90 text-amber-800 dark:border-amber-800/80 dark:bg-amber-950/70 dark:text-amber-200"
          }`}
        >
          <IconWarning className="h-4 w-4 shrink-0" />
          <div>
            {c.tipo === "choque" ? "Choque de horário" : "Sedes diferentes no mesmo turno"}:{" "}
            <strong className="font-mono">{c.a.disciplina.codigo}</strong> ×{" "}
            <strong className="font-mono">{c.b.disciplina.codigo}</strong> ({c.detalhe})
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-200/80 bg-white/80 p-4 shadow-2xs backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-900/80">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tom="acento" icon={<IconCalendar className="h-3.5 w-3.5" />}>
            {aulasSemanais(itens)} aulas / semana
          </Badge>
          <Badge tom={conflitos.some((c) => c.tipo === "choque") ? "alerta" : "ok"}>
            {conflitos.length === 0 ? "Sem conflitos" : `${conflitos.length} conflito(s) detetado(s)`}
          </Badge>
        </div>
        <div className="flex items-center gap-2.5">
          <Botao
            variante="primario"
            onClick={() => {
              navigator.clipboard.writeText(relatorioTexto(itens));
              setCopiado(true);
              setTimeout(() => setCopiado(false), 2000);
            }}
          >
            {copiado ? (
              <>
                <IconCheck className="h-4 w-4" />
                <span>Copiado</span>
              </>
            ) : (
              <>
                <IconCopy className="h-4 w-4" />
                <span>Copiar relatório p/ matrícula</span>
              </>
            )}
          </Botao>
          <Botao variante="perigo" onClick={() => setSelecao([])}>
            <IconTrash className="h-4 w-4" />
            <span>Limpar grade</span>
          </Botao>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-200/80 shadow-xs dark:border-zinc-800/80">
        <table className="w-full min-w-[680px] border-collapse bg-white text-xs dark:bg-zinc-900">
          <thead>
            <tr className="bg-zinc-50/80 dark:bg-zinc-800/50">
              <th className="w-12 border-b border-r border-zinc-200/80 p-2.5 text-center font-mono text-zinc-400 dark:border-zinc-800/80">
                Turno
              </th>
              {DIAS.map(([, rot]) => (
                <th
                  key={rot}
                  className="border-b border-l border-zinc-200/80 p-2.5 font-display text-xs font-bold tracking-wide text-zinc-700 uppercase dark:border-zinc-800/80 dark:text-zinc-300"
                >
                  {rot}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SLOTS.map(([turno, aula]) => {
              const marcoTurno = aula === 1;
              return (
                <tr
                  key={`${turno}${aula}`}
                  className={
                    marcoTurno
                      ? "border-t-2 border-zinc-200 dark:border-zinc-700"
                      : "border-t border-zinc-100 dark:border-zinc-800/50"
                  }
                >
                  <td
                    className="border-r border-zinc-100 bg-zinc-50/40 p-1.5 text-center font-mono font-semibold text-zinc-500 dark:border-zinc-800/60 dark:bg-zinc-900/40 dark:text-zinc-400"
                    title={(() => {
                      const f = faixaDoSlot(turno, aula);
                      return f ? `${f.inicio}–${f.fim}` : undefined;
                    })()}
                  >
                    <div>
                      {turno}
                      {aula}
                    </div>
                    <div className="text-[9px] font-normal leading-tight text-zinc-400">
                      {faixaDoSlot(turno, aula)?.inicio}
                    </div>
                  </td>
                  {DIAS.map(([dia]) => {
                    const ocupantes = porSlot.get(`${dia}${turno}${aula}`) ?? [];
                    return (
                      <td
                        key={dia}
                        className={`h-11 border-l border-zinc-100 p-1 dark:border-zinc-800/60 ${
                          ocupantes.length > 1 ? "bg-red-50/60 ring-2 inset-ring ring-red-500 dark:bg-red-950/30" : ""
                        }`}
                      >
                        <div className="flex flex-col gap-1">
                          {ocupantes.map((o, i) => (
                            <div
                              key={i}
                              className={`truncate rounded-lg px-2 py-1 text-xs transition-transform hover:scale-[1.01] ${o.cor}`}
                              title={`${o.item.disciplina.nome} — ${o.item.turma.codigo}${o.sala ? ` (${o.sala})` : ""}`}
                            >
                              <span className="font-mono">{o.item.disciplina.codigo}</span>
                              {o.sala ? ` · ${o.sala}` : ""}
                            </div>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-2">
        <h3 className="font-display text-sm font-bold tracking-tight text-zinc-500 uppercase dark:text-zinc-400">
          Disciplinas selecionadas ({itens.length})
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {itens.map((item, i) => (
            <div
              key={item.disciplina.codigo}
              className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200/80 bg-white p-3.5 shadow-2xs dark:border-zinc-800/80 dark:bg-zinc-900"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className={`h-3 w-3 shrink-0 rounded-full ${CORES[i % CORES.length].split(" ")[0]}`} />
                <div className="truncate">
                  <div className="truncate font-display text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {item.disciplina.nome}
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-zinc-400">
                    <span>{item.disciplina.codigo}</span>
                    <span>·</span>
                    <span>Turma {item.turma.codigo}</span>
                  </div>
                </div>
              </div>
              <Botao
                variante="perigo"
                onClick={() =>
                  setSelecao(selecao.filter((s) => s.codDisciplina !== item.disciplina.codigo))
                }
              >
                <IconTrash className="h-3.5 w-3.5" />
                <span>remover</span>
              </Botao>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
