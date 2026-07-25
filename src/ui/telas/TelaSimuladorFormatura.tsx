import { useEffect, useMemo, useState } from "react";
import type { Matriz, OfertaSemestre, PerfilAluno, SelecaoTurma, Turma } from "../../domain/tipos";
import {
  formatarSemestre,
  formatarSemestreExtenso,
  rotuloSazonalidade,
  simularFormatura,
  type DisciplinaPlanejada,
  type IdCategoria,
  type Requisito,
} from "../../domain/motor/simuladorFormatura";
import { descricaoDoCurso, ehTrilha } from "../../domain/cursos";
import { buscarOfertaParaPlanejamento } from "../../domain/motor/elegiveis";
import { criarMapaIdentidade } from "../../domain/motor/identidade";
import { calcularPesoPrioridadeTurma } from "../../domain/motor/grade-magica";
import { haveriaConflito, itensDaSelecao } from "../../domain/motor/grade";
import { Barra, Card } from "../componentes";
import {
  IconCheck,
  IconDownload,
  IconGraduationCap,
  IconWarning,
} from "../icons";

function converterParaSelecao(
  disciplinasPlanejadas: DisciplinaPlanejada[],
  oferta: OfertaSemestre,
  matriz: Matriz,
): SelecaoTurma[] {
  const selecao: SelecaoTurma[] = [];
  const usarPrioridadeBsi = matriz.matriz === 981;
  const mapa = criarMapaIdentidade(matriz);
  const ofertadas = new Map(oferta.disciplinas.map((x) => [x.codigo, x]));

  for (const d of disciplinasPlanejadas) {
    if (!d.ocupaVaga || d.codigo === "ELETIVA" || d.codigo === "EXTENSAO" || d.codigo.startsWith("PLACEHOLDER_")) {
      continue;
    }

    const dMatriz = matriz.disciplinas.find((x) => x.codigo === d.codigo);
    const dOf = dMatriz ? buscarOfertaParaPlanejamento(dMatriz, ofertadas, mapa) : ofertadas.get(d.codigo);
    if (!dOf || !dOf.turmas.length) continue;

    const itensAtuais = itensDaSelecao(oferta, selecao);
    const turmasOrdenadas = [...dOf.turmas]
      .map((t) => ({
        turma: t,
        peso: calcularPesoPrioridadeTurma(t, usarPrioridadeBsi),
      }))
      .sort((a, b) => b.peso - a.peso);

    let escolhida: Turma | null = null;
    for (const item of turmasOrdenadas) {
      if (!haveriaConflito(itensAtuais, dOf, item.turma)) {
        escolhida = item.turma;
        break;
      }
    }

    if (!escolhida && turmasOrdenadas.length > 0) {
      escolhida = turmasOrdenadas[0].turma;
    }

    if (escolhida) {
      selecao.push({
        codDisciplina: dOf.codigo,
        codTurma: escolhida.codigo,
      });
    }
  }

  return selecao;
}

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
  expressaoGrafica: {
    chip: "bg-rose-500/10 text-rose-800 border-rose-500/30 dark:text-rose-300",
    ponto: "bg-rose-500",
  },
  trilhas: {
    chip: "bg-indigo-500/10 text-indigo-800 border-indigo-500/30 dark:text-indigo-300",
    ponto: "bg-indigo-500",
  },
  eletivas: {
    chip: "bg-sky-500/10 text-sky-800 border-sky-500/30 dark:text-sky-300",
    ponto: "bg-sky-500",
  },
  extensao: {
    chip: "bg-teal-500/10 text-teal-800 border-teal-500/30 dark:text-teal-300",
    ponto: "bg-teal-500",
  },
};

const ROTULO_CURTO: Record<IdCategoria, string> = {
  obrigatorias: "Obrigatória",
  segundoEstrato: "2º estrato",
  humanidades: "Humanidades",
  expressaoGrafica: "Exp. gráfica",
  trilhas: "Trilha",
  eletivas: "Eletiva",
  extensao: "Extensão",
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
  todasCestasPorSemestre?: Record<string, Record<string, SelecaoTurma[]>>;
  onImportarGrade?: (semestreDestino: string, gradeDestino: string, selecao: SelecaoTurma[]) => void;
}) {
  const { perfil, matriz, ofertas } = props;
  const [ritmo, setRitmo] = useState(5);
  const [semestreInicial, setSemestreInicial] = useState(props.semestreAtivo);
  const [menuImportacaoSemestre, setMenuImportacaoSemestre] = useState<string | null>(null);
  const curso = descricaoDoCurso(matriz);
  const semestresIniciais = useMemo(() => {
    // Por enquanto restringe o simulador a começar apenas no semestre futuro,
    // garantindo que projeções antigas não misturem ofertas passadas.
    return ["2026-2"];
  }, []);

  useEffect(() => {
    setSemestreInicial("2026-2");
  }, []);

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
            <IconGraduationCap className="h-4 w-4 shrink-0" />
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
            {semestresIniciais.map((s) => (
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
            const ofertaDoSemestre = ofertas.find((o) => o.semestre === s.semestre);
            const menuOpen = menuImportacaoSemestre === s.semestre;
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
                        {d.categoria === "trilhas" &&
                        !ehTrilha(curso, d.conjunto)
                          ? "Optativa isolada"
                          : ROTULO_CURTO[d.categoria]}
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

                {/* Botão de importação para Planejamento (quando o semestre tem oferta disponível, ex: 2026-2) */}
                {ofertaDoSemestre && props.onImportarGrade && (
                  <div className="mt-4 border-t border-zinc-200/60 pt-3.5 dark:border-zinc-800">
                    {!menuOpen ? (
                      <button
                        type="button"
                        onClick={() => setMenuImportacaoSemestre(s.semestre)}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-utfpr-500/15 via-amber-500/15 to-utfpr-500/15 border border-utfpr-500/40 px-3.5 py-2 font-display text-xs font-black text-zinc-900 shadow-2xs transition-all hover:bg-utfpr-500/25 hover:scale-[1.01] active:scale-95 dark:from-utfpr-500/10 dark:via-amber-500/10 dark:to-utfpr-500/10 dark:text-amber-300 cursor-pointer"
                      >
                        <IconDownload className="h-4 w-4 text-utfpr-600 dark:text-utfpr-400 shrink-0" />
                        <span>Importar para Planejamento de Matrícula ({s.semestre.replace("-", "/")})</span>
                      </button>
                    ) : (
                      <div className="rounded-2xl border-2 border-utfpr-500/40 bg-gradient-to-r from-zinc-50 via-white to-zinc-50 p-3.5 shadow-md dark:border-utfpr-500/40 dark:from-zinc-900 dark:via-zinc-900/90 dark:to-zinc-900 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between gap-2 border-b border-zinc-200/80 pb-2.5 mb-3 dark:border-zinc-800">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-utfpr-500/20 font-display text-xs font-black text-utfpr-600 dark:text-utfpr-400">
                              ⚡
                            </span>
                            <span className="font-display text-xs sm:text-sm font-black text-zinc-900 dark:text-zinc-100">
                              Selecione para qual Grade de {s.semestre.replace("-", "/")} deseja importar:
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setMenuImportacaoSemestre(null)}
                            className="rounded-lg p-1 text-xs font-bold text-zinc-400 hover:bg-zinc-200/70 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
                            title="Cancelar importação"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {["A", "B", "C"].map((g) => {
                            const selecaoExistente = props.todasCestasPorSemestre?.[s.semestre]?.[g] ?? [];
                            const temMatrias = selecaoExistente.length > 0;

                            return (
                              <button
                                key={g}
                                type="button"
                                onClick={() => {
                                  const novaSelecao = converterParaSelecao(s.disciplinas, ofertaDoSemestre, matriz);
                                  props.onImportarGrade?.(s.semestre, g, novaSelecao);
                                  setMenuImportacaoSemestre(null);
                                }}
                                className={`group flex flex-col items-start justify-between rounded-xl border p-3 text-left transition-all duration-200 cursor-pointer ${
                                  temMatrias
                                    ? "border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 hover:border-amber-500 dark:border-amber-500/40 dark:bg-amber-950/40 dark:hover:bg-amber-900/60"
                                    : "border-zinc-200/90 bg-white hover:border-emerald-500/60 hover:bg-emerald-500/10 dark:border-zinc-800 dark:bg-zinc-800/60 dark:hover:border-emerald-500/50 dark:hover:bg-emerald-950/40"
                                }`}
                              >
                                <div className="flex w-full items-center justify-between gap-2">
                                  <span className="font-display text-sm font-black text-zinc-900 dark:text-white group-hover:text-utfpr-600 dark:group-hover:text-utfpr-400 transition-colors">
                                    Grade {g}
                                  </span>
                                  <span className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                                    temMatrias
                                      ? "bg-amber-500/20 text-amber-800 dark:text-amber-300"
                                      : "bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-300 group-hover:bg-emerald-500/20 group-hover:text-emerald-700 dark:group-hover:text-emerald-300"
                                  }`}>
                                    {temMatrias ? "Ocupada" : "Vazia"}
                                  </span>
                                </div>

                                <div className="mt-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 leading-tight">
                                  {temMatrias ? (
                                    <span className="text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-1">
                                      <IconWarning className="h-3.5 w-3.5 shrink-0 inline align-[-0.1em]" />
                                      Sobrescrever ({selecaoExistente.length} {selecaoExistente.length === 1 ? "turma" : "turmas"})
                                    </span>
                                  ) : (
                                    <span className="text-zinc-500 dark:text-zinc-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                      Pronta para receber a grade projetada
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
