import { useMemo, useState } from "react";
import type { Matriz, OfertaSemestre, PerfilAluno } from "../../domain/tipos";
import {
  formatarSemestre,
  formatarSemestreExtenso,
  rotuloSazonalidade,
  simularFormatura,
  type IdCategoria,
  type Requisito,
} from "../../domain/motor/simuladorFormatura";
import { Barra, Card } from "../componentes";
import { IconCheck, IconWarning } from "../icons";

const CORES_CATEGORIA: Record<IdCategoria, { chip: string; ponto: string }> = {
  obrigatorias: {
    chip: "bg-utfpr-500/15 text-amber-900 border-utfpr-500/40 dark:text-utfpr-300",
    ponto: "bg-utfpr-500",
  },
  segundoEstrato: {
    chip: "bg-emerald-500/10 text-emerald-800 border-emerald-500/30 dark:text-emerald-300",
    ponto: "bg-emerald-500",
  },
  humanidades: {
    chip: "bg-violet-500/10 text-violet-800 border-violet-500/30 dark:text-violet-300",
    ponto: "bg-violet-500",
  },
  trilhas: {
    chip: "bg-indigo-500/10 text-indigo-800 border-indigo-500/30 dark:text-indigo-300",
    ponto: "bg-indigo-500",
  },
  eletivas: {
    chip: "bg-sky-500/10 text-sky-800 border-sky-500/30 dark:text-sky-300",
    ponto: "bg-sky-500",
  },
};

const ROTULO_CURTO: Record<IdCategoria, string> = {
  obrigatorias: "Obrigatória",
  segundoEstrato: "2º estrato",
  humanidades: "Humanidades",
  trilhas: "Trilha",
  eletivas: "Eletiva",
};

function CardRequisito(props: { req: Requisito }) {
  const { req } = props;
  const total = req.cumprido + req.planejado;
  return (
    <div
      className={`rounded-2xl border p-3.5 transition-colors ${
        req.atendido
          ? "border-emerald-500/40 bg-emerald-50/60 dark:border-emerald-700/50 dark:bg-emerald-950/30"
          : "border-red-400/50 bg-red-50/60 dark:border-red-800/50 dark:bg-red-950/30"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-display text-xs font-black text-zinc-700 dark:text-zinc-200">
          {req.nome}
        </span>
        {req.atendido ? (
          <IconCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <IconWarning className="h-3.5 w-3.5 shrink-0 text-red-600 dark:text-red-400" />
        )}
      </div>
      <div className="mt-1.5 font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">
        {total}
        <span className="font-sans text-xs font-normal text-zinc-400"> / {req.exigido}h</span>
      </div>
      <div className="mt-2">
        <Barra valor={total} max={req.exigido} destaque={req.atendido} />
      </div>
      <div className="mt-2 text-[11px] font-medium leading-snug text-zinc-500 dark:text-zinc-400">
        {req.cumprido}h já concluídas
        {req.planejado > 0 && <> · {req.planejado}h na projeção</>}
      </div>
    </div>
  );
}

export function TelaSimuladorFormatura(props: {
  perfil: PerfilAluno | null;
  matriz: Matriz;
  ofertas: OfertaSemestre[];
  semestreAtivo: string;
}) {
  const { perfil, matriz, ofertas } = props;
  const [ritmo, setRitmo] = useState(5);
  const [semestreInicial, setSemestreInicial] = useState("2026-2");

  const resultado = useMemo(
    () => simularFormatura(perfil, matriz, ofertas, { ritmo, semestreInicial }),
    [perfil, matriz, ofertas, ritmo, semestreInicial],
  );

  const totalMaterias = resultado.semestres.reduce((a, s) => a + s.materias, 0);
  const totalHoras = resultado.semestres.reduce((a, s) => a + s.horas, 0);
  const horasCumpridas = resultado.requisitos.reduce((a, r) => a + r.cumprido, 0);
  const horasExigidas = resultado.requisitos.reduce((a, r) => a + r.exigido, 0);

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border-2 border-zinc-200/90 bg-white/95 p-6 shadow-md dark:border-zinc-800/90 dark:bg-zinc-900/95">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-utfpr-500/20 text-2xl">
              🎓
            </span>
            <div>
              <h2 className="font-display text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
                Simulador de Formatura
              </h2>
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Projeta o caminho mais curto até a integralização assumindo que você cursa{" "}
                <strong>apenas o mínimo</strong> de cada categoria, respeitando pré-requisitos e a
                sazonalidade real de oferta de cada disciplina.
              </p>
            </div>
          </div>

          <div className="min-w-[180px]">
            <span className="block font-display text-[11px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Já concluído
            </span>
            <div className="mt-1 font-display text-2xl font-black text-zinc-900 dark:text-zinc-100">
              {Math.round((horasCumpridas / Math.max(1, horasExigidas)) * 100)}
              <span className="text-sm text-zinc-400">%</span>
              <span className="ml-2 font-sans text-xs font-semibold text-zinc-400">
                {horasCumpridas} / {horasExigidas}h
              </span>
            </div>
            <div className="mt-2">
              <Barra valor={horasCumpridas} max={horasExigidas} />
            </div>
          </div>
        </div>
      </header>

      {!perfil && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-300/80 bg-amber-50/80 p-4 text-sm text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/50 dark:text-amber-200">
          <IconWarning className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Sem histórico importado, a projeção parte do <strong>curso inteiro do zero</strong>.
            Importe seu PDF nas configurações para uma previsão real.
          </span>
        </div>
      )}

      {/* Controles */}
      <div className="flex flex-wrap items-end gap-6 rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <label className="block font-display text-[11px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Matérias por semestre
          </label>
          <div className="mt-2 flex gap-1.5">
            {[3, 4, 5, 6, 7, 8].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRitmo(n)}
                className={`h-9 w-9 rounded-xl font-mono text-sm font-black transition-all cursor-pointer ${
                  ritmo === n
                    ? "bg-utfpr-500 text-zinc-950 shadow-md"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block font-display text-[11px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Começando em
          </label>
          <select
            value={semestreInicial}
            onChange={(e) => setSemestreInicial(e.target.value)}
            className="mt-2 h-9 cursor-pointer rounded-xl border border-zinc-200 bg-zinc-50 px-3 font-mono text-sm font-bold text-zinc-900 outline-none focus:border-utfpr-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            {["2026-2", "2027-1", "2027-2"].map((s) => (
              <option key={s} value={s}>
                {formatarSemestre(s)}
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto text-right">
          <span className="block font-display text-[11px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Formatura estimada
          </span>
          <div className="mt-1 font-display text-2xl font-black text-utfpr-600 dark:text-utfpr-400">
            {resultado.semestreFormatura ? formatarSemestre(resultado.semestreFormatura) : "—"}
          </div>
          {resultado.semestreFormatura && (
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              {formatarSemestreExtenso(resultado.semestreFormatura)} ·{" "}
              {resultado.semestres.length}{" "}
              {resultado.semestres.length === 1 ? "semestre" : "semestres"}
            </span>
          )}
        </div>
      </div>

      {resultado.avisos.map((a) => (
        <div
          key={a}
          className="flex items-start gap-2.5 rounded-2xl border border-amber-300/80 bg-amber-50/80 p-3.5 text-xs font-medium text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/50 dark:text-amber-200"
        >
          <IconWarning className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{a}</span>
        </div>
      ))}

      {/* Requisitos por categoria */}
      <section>
        <h3 className="mb-3 font-display text-sm font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Mínimos por categoria
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {resultado.requisitos.map((r) => (
            <CardRequisito key={r.id} req={r} />
          ))}
        </div>
      </section>

      {/* Linha do tempo */}
      <section>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-display text-sm font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Linha do tempo projetada
          </h3>
          <span className="font-mono text-xs font-bold text-zinc-500 dark:text-zinc-400">
            {totalMaterias} matérias · {totalHoras}h restantes
          </span>
        </div>

        <div className="space-y-3">
          {resultado.semestres.map((s, i) => {
            const ultimo = i === resultado.semestres.length - 1;
            return (
              <Card
                key={s.semestre}
                classe={ultimo && resultado.semestreFormatura ? "!border-utfpr-500/60 !border-2" : ""}
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-2.5 dark:border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 font-mono text-[11px] font-black text-utfpr-400 dark:bg-zinc-800">
                      {i + 1}
                    </span>
                    <div>
                      <span className="font-display text-base font-black text-zinc-900 dark:text-white">
                        {formatarSemestre(s.semestre)}
                      </span>
                      <span className="ml-2 text-[11px] font-semibold text-zinc-400">
                        {formatarSemestreExtenso(s.semestre)}
                      </span>
                    </div>
                    {ultimo && resultado.semestreFormatura && (
                      <span className="rounded-full bg-utfpr-500 px-2.5 py-0.5 font-display text-[10px] font-black text-zinc-950">
                        FORMATURA
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-xs font-bold text-zinc-500 dark:text-zinc-400">
                    {s.materias} {s.materias === 1 ? "matéria" : "matérias"} · {s.horas}h
                  </span>
                </div>

                <ul className="space-y-1.5">
                  {s.disciplinas.map((d) => (
                    <li
                      key={d.codigo + d.nome}
                      className="flex flex-wrap items-center gap-2 text-sm"
                      title={rotuloSazonalidade(d.sazonalidade)}
                    >
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${CORES_CATEGORIA[d.categoria].ponto}`}
                      />
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">{d.nome}</span>
                      <span
                        className={`rounded-md border px-1.5 py-0.5 font-display text-[10px] font-black ${CORES_CATEGORIA[d.categoria].chip}`}
                      >
                        {ROTULO_CURTO[d.categoria]}
                      </span>
                      <span className="font-mono text-[11px] text-zinc-400">{d.horas}h</span>
                      {d.sazonalidade !== "ambos" && d.ocupaVaga && (
                        <span className="rounded bg-zinc-100 px-1.5 font-mono text-[10px] font-bold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          {d.sazonalidade === "primeiro"
                            ? "só .1"
                            : d.sazonalidade === "segundo"
                              ? "só .2"
                              : "sem oferta"}
                        </span>
                      )}
                      {!d.ocupaVaga && (
                        <span className="rounded bg-teal-500/15 px-1.5 font-mono text-[10px] font-bold text-teal-700 dark:text-teal-300">
                          fora da grade
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      </section>

      {resultado.trilhasFechadas.length > 0 && (
        <section className="rounded-2xl border border-indigo-300/60 bg-indigo-50/60 p-4 dark:border-indigo-800/60 dark:bg-indigo-950/30">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-display text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
              Trilhas validadas ao fim da projeção
            </h3>
            <span
              className={`rounded-lg px-2 py-0.5 font-mono text-xs font-black ${
                resultado.trilhasFechadas.length >= resultado.trilhasExigidas
                  ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                  : "bg-red-500/20 text-red-800 dark:text-red-300"
              }`}
            >
              {resultado.trilhasFechadas.length} de {resultado.trilhasExigidas}
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-snug text-indigo-900/70 dark:text-indigo-200/70">
            O bloco optativo exige {resultado.trilhasExigidas} trilhas validadas e a carga horária
            total definida pela matriz. Horas acima do mínimo de uma trilha continuam contando para
            esse bloco.
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {resultado.trilhasFechadas.map((t) => (
              <li
                key={t.conjunto}
                className="rounded-lg border border-indigo-300/60 bg-white px-2.5 py-1 font-display text-xs font-bold text-indigo-900 dark:border-indigo-800/60 dark:bg-zinc-900 dark:text-indigo-200"
              >
                {t.nome}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="pb-4 text-center text-xs leading-relaxed text-zinc-400 dark:text-zinc-500">
        Projeção baseada na matriz {matriz.matriz} e na oferta observada em{" "}
        {ofertas.map((o) => formatarSemestre(o.semestre)).join(" e ")}. Disciplinas de trilha sem
        oferta registrada nesses semestres ficam fora do plano. Confirme sempre no Portal do Aluno.
      </p>
    </div>
  );
}
