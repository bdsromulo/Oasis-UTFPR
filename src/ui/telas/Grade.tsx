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
import { Badge, Botao, Card } from "../componentes";

const DIAS: [number, string][] = [
  [2, "Seg"],
  [3, "Ter"],
  [4, "Qua"],
  [5, "Qui"],
  [6, "Sex"],
  [7, "Sáb"],
];
const SLOTS = [
  ...[1, 2, 3, 4, 5, 6].map((n) => ["M", n] as const),
  ...[1, 2, 3, 4, 5, 6].map((n) => ["T", n] as const),
  ...[1, 2, 3, 4, 5].map((n) => ["N", n] as const),
];
const CORES = [
  "bg-utfpr-500/80 text-zinc-900",
  "bg-sky-500/80 text-white",
  "bg-emerald-500/80 text-white",
  "bg-violet-500/80 text-white",
  "bg-rose-500/80 text-white",
  "bg-orange-500/80 text-white",
  "bg-teal-500/80 text-white",
  "bg-fuchsia-500/80 text-white",
];

export function TelaGrade(props: {
  oferta: OfertaSemestre;
  selecao: SelecaoTurma[];
  setSelecao: (s: SelecaoTurma[]) => void;
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

  if (itens.length === 0) {
    return (
      <Card>
        <p className="py-8 text-center text-sm text-zinc-500">
          Sua grade está vazia — adicione turmas na aba <strong>Posso cursar</strong>.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {conflitos.map((c, i) => (
        <div
          key={i}
          className={`rounded-lg border p-3 text-sm ${
            c.tipo === "choque"
              ? "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
              : "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
          }`}
        >
          {c.tipo === "choque" ? "Choque de horário" : "Sedes diferentes no mesmo turno"}:{" "}
          <strong>{c.a.disciplina.codigo}</strong> × <strong>{c.b.disciplina.codigo}</strong> (
          {c.detalhe})
        </div>
      ))}

      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[640px] border-collapse bg-white text-xs dark:bg-zinc-900">
          <thead>
            <tr>
              <th className="w-10 border-b border-zinc-200 p-1 text-zinc-400 dark:border-zinc-800"></th>
              {DIAS.map(([, rot]) => (
                <th
                  key={rot}
                  className="border-b border-zinc-200 p-1.5 font-semibold dark:border-zinc-800"
                >
                  {rot}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SLOTS.map(([turno, aula]) => (
              <tr key={`${turno}${aula}`} className={aula === 1 ? "border-t-2 border-zinc-300 dark:border-zinc-700" : ""}>
                <td className="border-b border-zinc-100 p-1 text-center font-mono text-zinc-400 dark:border-zinc-800/60">
                  {turno}
                  {aula}
                </td>
                {DIAS.map(([dia]) => {
                  const ocupantes = porSlot.get(`${dia}${turno}${aula}`) ?? [];
                  return (
                    <td
                      key={dia}
                      className={`h-9 border-b border-l border-zinc-100 p-0.5 dark:border-zinc-800/60 ${
                        ocupantes.length > 1 ? "ring-2 ring-red-500" : ""
                      }`}
                    >
                      {ocupantes.map((o, i) => (
                        <div
                          key={i}
                          className={`truncate rounded px-1 py-0.5 font-medium ${o.cor}`}
                          title={`${o.item.disciplina.nome} — ${o.item.turma.codigo}${o.sala ? ` (${o.sala})` : ""}`}
                        >
                          {o.item.disciplina.codigo}
                          {o.sala ? ` · ${o.sala}` : ""}
                        </div>
                      ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Badge tom="acento">{aulasSemanais(itens)} aulas/semana</Badge>
        <Badge tom={conflitos.some((c) => c.tipo === "choque") ? "alerta" : "ok"}>
          {conflitos.length === 0 ? "sem conflitos" : `${conflitos.length} conflito(s)`}
        </Badge>
        <Botao
          variante="primario"
          onClick={() => {
            navigator.clipboard.writeText(relatorioTexto(itens));
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
          }}
        >
          {copiado ? "copiado ✓" : "copiar relatório p/ matrícula"}
        </Botao>
        <Botao variante="perigo" onClick={() => setSelecao([])}>
          limpar grade
        </Botao>
      </div>

      <div className="space-y-1.5">
        {itens.map((item, i) => (
          <div
            key={item.disciplina.codigo}
            className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className={`h-3 w-3 shrink-0 rounded-full ${CORES[i % CORES.length]}`} />
              <span className="truncate">
                <span className="font-mono text-xs text-zinc-400">{item.disciplina.codigo}</span>{" "}
                {item.disciplina.nome}{" "}
                <span className="text-zinc-400">· turma {item.turma.codigo}</span>
              </span>
            </div>
            <Botao
              variante="perigo"
              onClick={() =>
                setSelecao(selecao.filter((s) => s.codDisciplina !== item.disciplina.codigo))
              }
            >
              remover
            </Botao>
          </div>
        ))}
      </div>
    </div>
  );
}
