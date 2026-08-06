import { useEffect, useMemo, useState } from "react";
import type { Matriz, OfertaSemestre, PerfilAluno, SelecaoTurma, Turma } from "../../domain/tipos";
import {
  formatarSemestre,
  formatarSemestreExtenso,
  gradeFixadaDaSelecao,
  rotuloSazonalidade,
  simularFormatura,
  type DisciplinaPlanejada,
  type IdCategoria,
  type Requisito,
} from "../../domain/motor/simuladorFormatura";
import { descricaoDoCurso, ehTrilha, TETO_CH_SEMESTRE } from "../../domain/cursos";
import { progressoGlobalDoCurso } from "../../domain/motor/situacao";
import { buscarOfertaParaPlanejamento } from "../../domain/motor/elegiveis";
import { criarMapaIdentidade } from "../../domain/motor/identidade";
import { calcularPesoPrioridadeTurma } from "../../domain/motor/grade-magica";
import { haveriaConflito, itensDaSelecao } from "../../domain/motor/grade";
import { Barra, Card } from "../componentes";
import {
  IconBan,
  IconCheck,
  IconDownload,
  IconGraduationCap,
  IconWarning,
  IconInfo,
} from "../icons";
import { ModalExplicacaoCalculos } from "../componentes/ModalExplicacaoCalculos";
import {
  EXCLUSOES_VAZIAS,
  SeletorExclusoes,
  totalExclusoes,
  type ValorExclusoes,
} from "./SeletorExclusoes";

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
    if (d.codigo === "ELETIVA" || d.codigo === "EXTENSAO" || d.codigo.startsWith("PLACEHOLDER_")) {
      continue;
    }

    // O motor já reservou uma turma para esta disciplina na oferta do semestre,
    // conferindo choque contra as demais que ele mesmo escolheu. Repetir a
    // escolha dele é o que impede a grade importada de nascer em conflito.
    if (d.codigoOferta && d.turma) {
      const existe = oferta.disciplinas
        .find((x) => x.codigo === d.codigoOferta)
        ?.turmas.some((t) => t.codigo === d.turma);
      if (existe) {
        selecao.push({ codDisciplina: d.codigoOferta, codTurma: d.turma });
        continue;
      }
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

    const jaNaSelecao = (t: Turma) =>
      selecao.some((s) => s.codDisciplina === dOf.codigo && s.codTurma === t.codigo);

    let escolhida: Turma | null = null;
    for (const item of turmasOrdenadas) {
      if (!jaNaSelecao(item.turma) && !haveriaConflito(itensAtuais, dOf, item.turma)) {
        escolhida = item.turma;
        break;
      }
    }

    // Sem turma livre, a disciplina fica fora da importação. Antes o fallback
    // pegava a primeira turma de qualquer jeito, e era daí que saía a grade
    // importada já em choque.
    if (escolhida) {
      selecao.push({
        codDisciplina: dOf.codigo,
        codTurma: escolhida.codigo,
      });
    }
  }

  return selecao;
}

export function listarGradesDoPlanejamento(
  todasCestas: Record<string, Record<string, SelecaoTurma[]>> | undefined,
  semestre = "2026-2",
): { semestre: string; grade: string; quantidade: number }[] {
  const grades = todasCestas?.[semestre] ?? {};
  return Object.entries(grades)
    .filter(([, selecao]) => selecao.length > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([grade, selecao]) => ({ semestre, grade, quantidade: selecao.length }));
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
  opcoes: {
    chip: "bg-cyan-500/10 text-cyan-800 border-cyan-500/30 dark:text-cyan-300",
    ponto: "bg-cyan-500",
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
  opcoes: "Opção",
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
  /** grade montada no Planejamento que o motor deve tomar como fato */
  gradeDoPlanejamento?: { semestre: string; grade: string; selecao: SelecaoTurma[] } | null;
  onUsarGradeDoPlanejamento?: (semestre: string, grade: string) => void;
  onDescartarGradeDoPlanejamento?: () => void;
  /**
   * Ritmo e exclusões vêm controlados pelo pai. A tela troca de aba assim que
   * o aluno importa uma grade — de propósito, para ele ver o resultado — e
   * isso desmonta este componente. Um `useState` local voltaria ao padrão a
   * cada remontagem: o aluno ajustava o ritmo para 7, importava, voltava para
   * importar o semestre seguinte e o simulador já tinha esquecido o 7.
   */
  ritmo: number;
  onMudarRitmo: (r: number) => void;
  exclusoes: ValorExclusoes;
  onMudarExclusoes: (v: ValorExclusoes) => void;
}) {
  const { perfil, matriz, ofertas, ritmo, exclusoes } = props;
  const setRitmo = props.onMudarRitmo;
  const setExclusoes = props.onMudarExclusoes;
  const [semestreInicial, setSemestreInicial] = useState(props.semestreAtivo);
  const [menuImportacaoSemestre, setMenuImportacaoSemestre] = useState<string | null>(null);
  const [seletorGradePlanejamentoAberto, setSeletorGradePlanejamentoAberto] = useState(false);
  const [explicacaoAberta, setExplicacaoAberta] = useState(false);
  const curso = descricaoDoCurso(matriz);
  const semestresIniciais = useMemo(() => {
    // Por enquanto restringe o simulador a começar apenas no semestre futuro,
    // garantindo que projeções antigas não misturem ofertas passadas.
    return ["2026-2"];
  }, []);

  useEffect(() => {
    setSemestreInicial("2026-2");
  }, []);

  // Caminho de volta da importação: a grade montada no Planejamento entra como
  // o primeiro semestre da projeção, turma por turma, e os seguintes saem dela.
  const gradeFixada = useMemo(() => {
    const g = props.gradeDoPlanejamento;
    if (!g || g.selecao.length === 0) return null;
    const ofertaOrigem = ofertas.find((o) => o.semestre.replace(".", "-") === g.semestre);
    if (!ofertaOrigem) return null;
    return gradeFixadaDaSelecao(g.semestre, ofertaOrigem, g.selecao, matriz, `Grade ${g.grade}`);
  }, [props.gradeDoPlanejamento, ofertas, matriz]);

  const semestreDePartida = gradeFixada?.semestre ?? semestreInicial;

  const gradesPlanejamentoDisponiveis = useMemo(() => {
    return listarGradesDoPlanejamento(props.todasCestasPorSemestre);
  }, [props.todasCestasPorSemestre]);

  const [painelExclusoesAberto, setPainelExclusoesAberto] = useState(false);

  const resultado = useMemo(
    () =>
      simularFormatura(perfil, matriz, ofertas, {
        ritmo,
        semestreInicial: semestreDePartida,
        gradeFixada,
        exclusoes: {
          disciplinas: exclusoes.disciplinas,
          professores: exclusoes.professores,
          trilhas: exclusoes.trilhas.map((t) => t.conjunto),
        },
      }),
    [perfil, matriz, ofertas, ritmo, semestreDePartida, gradeFixada, exclusoes],
  );

  const totalMaterias = resultado.semestres.reduce((a, s) => a + s.materias, 0);
  const totalHoras = resultado.semestres.reduce((a, s) => a + s.horas, 0);
  // O "já concluído" usa a MESMA régua de Minha Situação. Somar o `cumprido` e o
  // `exigido` dos requisitos daria outro número: a extensão entra ali como bloco
  // próprio, mas suas horas já vêm embutidas no CHEXT das disciplinas contadas em
  // obrigatórias e optativas, e o total das categorias (3280h na 981) repete essas
  // horas em vez de fechar no ch_total_ppc (3220h). A lista de requisitos abaixo
  // segue valendo para dizer o que falta em cada bloco — só não serve de global.
  const global = useMemo(() => progressoGlobalDoCurso(perfil, matriz), [perfil, matriz]);
  const horasCumpridas = global.cumprido;
  const horasExigidas = global.total;

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border-2 border-zinc-200/90 bg-white/95 p-6 shadow-md dark:border-zinc-800/90 dark:bg-zinc-900/95">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <IconGraduationCap className="h-4 w-4 shrink-0" />
            <div>
              <h2 className="font-display text-2xl font-black tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                Simulador de Formatura
                <button
                  type="button"
                  onClick={() => setExplicacaoAberta(true)}
                  className="ml-2 inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 transition-colors cursor-help"
                >
                  <IconInfo className="h-3 w-3 shrink-0" /> Como funciona?
                </button>
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
              {global.percentual}
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

      {/* Antes da lista de semestres, e não depois dela: extensão e estágio
          saíram do plano semestre a semestre justamente por não serem turma que
          se escolhe. Se o aviso ficasse no rodapé, a pessoa leria a projeção
          inteira acreditando que basta cursar o que está listado. */}
      {resultado.avisos.map((a) => (
        <div
          key={a}
          className="flex items-start gap-2.5 rounded-2xl border border-amber-300/80 bg-amber-50/80 p-3.5 text-xs font-medium text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/50 dark:text-amber-200"
        >
          <IconWarning className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{a}</span>
        </div>
      ))}

      {gradeFixada && (
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border-2 border-utfpr-500/50 bg-gradient-to-r from-utfpr-500/10 via-amber-500/5 to-transparent p-4 dark:border-utfpr-500/40">
          <div className="flex items-start gap-2.5">
            <IconDownload className="mt-0.5 h-4 w-4 shrink-0 text-utfpr-600 dark:text-utfpr-400" />
            <div className="text-sm text-zinc-700 dark:text-zinc-200">
              <span className="font-display font-black text-zinc-900 dark:text-white">
                Projeção partindo da sua {gradeFixada.origem} de{" "}
                {formatarSemestre(gradeFixada.semestre)}
              </span>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                O semestre de {formatarSemestre(gradeFixada.semestre)} entra exatamente como você
                montou no Planejamento de Matrícula ({gradeFixada.itens.length}{" "}
                {gradeFixada.itens.length === 1 ? "matéria" : "matérias"}) — o motor não escolhe
                nada nele. Os semestres seguintes são calculados a partir dessa grade.
              </p>
            </div>
          </div>
          {props.onDescartarGradeDoPlanejamento && (
            <button
              type="button"
              onClick={props.onDescartarGradeDoPlanejamento}
              className="shrink-0 rounded-xl border border-zinc-300 bg-white px-3 py-1.5 font-display text-xs font-bold text-zinc-700 transition-colors hover:border-red-400 hover:text-red-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:text-red-300 cursor-pointer"
              title="Voltar a projetar o primeiro semestre livremente"
            >
              Descartar e projetar do zero
            </button>
          )}
        </div>
      )}

      {!gradeFixada && props.onUsarGradeDoPlanejamento && (
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-sm font-black text-zinc-900 dark:text-zinc-100">
                Já montou a grade deste semestre?
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                Importe uma grade pronta do Planejamento para usá-la como ponto de partida da projeção.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSeletorGradePlanejamentoAberto((aberto) => !aberto)}
              disabled={gradesPlanejamentoDisponiveis.length === 0}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-utfpr-500/50 bg-utfpr-500/15 px-3.5 py-2 font-display text-xs font-black text-zinc-900 transition-colors hover:bg-utfpr-500/25 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-400 dark:text-utfpr-300 dark:disabled:border-zinc-700 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
              title={gradesPlanejamentoDisponiveis.length === 0 ? "Monte uma grade no Planejamento de Matrícula primeiro" : undefined}
            >
              <IconDownload className="h-4 w-4 shrink-0" />
              Importar grade pronta do Planejamento
            </button>
          </div>

          {gradesPlanejamentoDisponiveis.length === 0 && (
            <p className="mt-2 text-[11px] font-semibold text-zinc-400">
              Nenhuma grade de 2026/2 foi montada ainda.
            </p>
          )}

          {seletorGradePlanejamentoAberto && gradesPlanejamentoDisponiveis.length > 0 && (
            <div className="mt-3 grid gap-2 border-t border-zinc-200/70 pt-3 sm:grid-cols-3 dark:border-zinc-800">
              {gradesPlanejamentoDisponiveis.map((item) => (
                <button
                  key={`${item.semestre}-${item.grade}`}
                  type="button"
                  onClick={() => {
                    props.onUsarGradeDoPlanejamento?.(item.semestre, item.grade);
                    setSeletorGradePlanejamentoAberto(false);
                  }}
                  className="min-h-11 cursor-pointer rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-left transition-colors hover:border-utfpr-500/60 hover:bg-utfpr-500/10 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-utfpr-500/50"
                >
                  <span className="block font-display text-sm font-black text-zinc-900 dark:text-white">
                    Grade {item.grade}
                  </span>
                  <span className="mt-1 block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                    {item.quantidade} {item.quantidade === 1 ? "turma selecionada" : "turmas selecionadas"}
                  </span>
                </button>
              ))}
            </div>
          )}
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
                className={`h-11 w-11 cursor-pointer rounded-xl font-mono text-sm font-black transition-all ${
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
            value={semestreDePartida}
            disabled={!!gradeFixada}
            onChange={(e) => setSemestreInicial(e.target.value)}
            className="mt-2 h-11 cursor-pointer rounded-xl border border-zinc-200 bg-zinc-50 px-3 font-mono text-sm font-bold text-zinc-900 outline-none focus:border-utfpr-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            {Array.from(new Set([...semestresIniciais, semestreDePartida])).map((s) => (
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

      {/* Filtros de exclusão */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <button
          type="button"
          onClick={() => setPainelExclusoesAberto((v) => !v)}
          className="flex w-full cursor-pointer items-center justify-between gap-3 p-4 text-left"
        >
          <span className="flex items-center gap-2.5">
            <IconBan className="h-4 w-4 shrink-0 text-zinc-500" />
            <span>
              <span className="block font-display text-sm font-black text-zinc-900 dark:text-zinc-100">
                Filtros de exclusão
              </span>
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Matérias, professores e trilhas que você prefere não cursar
              </span>
            </span>
          </span>
          <span className="flex items-center gap-2">
            {totalExclusoes(exclusoes) > 0 && (
              <span className="rounded-lg bg-red-500/15 px-2 py-0.5 font-mono text-xs font-black text-red-700 dark:text-red-300">
                {totalExclusoes(exclusoes)}
              </span>
            )}
            <span className="font-mono text-xs font-bold text-zinc-400">
              {painelExclusoesAberto ? "▲" : "▼"}
            </span>
          </span>
        </button>
        {painelExclusoesAberto && (
          <div className="animate-in fade-in border-t border-zinc-200/70 p-4 dark:border-zinc-800">
            <SeletorExclusoes
              ofertas={ofertas}
              matriz={matriz}
              valor={exclusoes}
              onChange={setExclusoes}
            />
            {totalExclusoes(exclusoes) > 0 && (
              <button
                type="button"
                onClick={() => setExclusoes(EXCLUSOES_VAZIAS)}
                className="mt-4 cursor-pointer rounded-xl border border-zinc-300 px-3 py-1.5 font-display text-xs font-bold text-zinc-600 transition-colors hover:border-red-400 hover:text-red-700 dark:border-zinc-700 dark:text-zinc-300 dark:hover:text-red-300"
              >
                Limpar todas as exclusões
              </button>
            )}
          </div>
        )}
      </div>

      {/* Exclusões que a integralização não permitiu respeitar */}
      {resultado.exclusoesImpossiveis.length > 0 && (
        <section className="rounded-2xl border-2 border-red-400/60 bg-red-50/70 p-4 dark:border-red-800/70 dark:bg-red-950/40">
          <div className="flex items-start gap-2.5">
            <IconWarning className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
            <div>
              <h3 className="font-display text-sm font-black text-red-900 dark:text-red-200">
                Não é possível se formar respeitando{" "}
                {resultado.exclusoesImpossiveis.length === 1
                  ? "esta exclusão"
                  : `estas ${resultado.exclusoesImpossiveis.length} exclusões`}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-red-900/80 dark:text-red-200/80">
                A projeção abaixo <strong>mantém</strong> o que você pediu para excluir — sem isso
                não haveria como integralizar o curso. As disciplinas afetadas aparecem marcadas na
                linha do tempo.
              </p>
            </div>
          </div>
          <ul className="mt-3 space-y-2">
            {resultado.exclusoesImpossiveis.map((x) => (
              <li
                key={`${x.tipo}-${x.alvo}`}
                className="rounded-xl border border-red-300/70 bg-white/80 p-3 text-xs dark:border-red-900/60 dark:bg-zinc-900/70"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-red-500/15 px-1.5 py-0.5 font-display text-[10px] font-black uppercase tracking-wide text-red-700 dark:text-red-300">
                    {x.tipo}
                  </span>
                  <span className="font-display font-black text-zinc-900 dark:text-zinc-100">
                    {x.rotulo}
                  </span>
                </div>
                <p className="mt-1 leading-snug text-zinc-600 dark:text-zinc-300">{x.motivo}</p>
                {x.disciplinas.length > 0 && (
                  <p className="mt-1.5 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                    Entra no plano: {x.disciplinas.join(", ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

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
                    {s.fixadoPeloPlanejamento && (
                      <span className="rounded-full border border-utfpr-500/50 bg-utfpr-500/15 px-2.5 py-0.5 font-display text-[10px] font-black text-amber-900 dark:text-utfpr-300">
                        DO PLANEJAMENTO
                      </span>
                    )}
                    {ultimo && resultado.semestreFormatura && (
                      <span className="rounded-full bg-utfpr-500 px-2.5 py-0.5 font-display text-[10px] font-black text-zinc-950">
                        FORMATURA
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end">
                    <span
                      className="font-mono text-xs font-bold text-zinc-500 dark:text-zinc-400"
                      title={`Carga em sala de aula: é ela que respeita o teto de ${TETO_CH_SEMESTRE}h por semestre. Estágio, TCC, atividades complementares e extensão acontecem em paralelo às aulas e ficam fora da conta.`}
                    >
                      {s.materias} {s.materias === 1 ? "matéria" : "matérias"} · {s.chAula}h de sala
                    </span>
                    {s.horas !== s.chAula && (
                      <span
                        className="font-mono text-[10px] font-semibold text-zinc-400"
                        title="Soma tudo o que o semestre pede, inclusive o que não ocupa vaga de aula"
                      >
                        {s.horas}h no total
                      </span>
                    )}
                    {s.semestreReferencia &&
                      s.semestreReferencia.replace(".", "-") !== s.semestre.replace(".", "-") && (
                        <span
                          className="text-[10px] font-semibold text-zinc-400"
                          title="Os horários deste semestre futuro usam a oferta real mais recente de mesma paridade"
                        >
                          horários espelhados de {formatarSemestre(s.semestreReferencia)}
                        </span>
                      )}
                  </div>
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
                      {d.exclusaoIgnorada && (
                        <span
                          className="inline-flex items-center gap-1 rounded border border-red-400/60 bg-red-500/15 px-1.5 font-display text-[10px] font-black text-red-700 dark:text-red-300"
                          title={`Você pediu para excluir, mas ${d.exclusaoIgnorada.motivo}`}
                        >
                          <IconBan className="h-3 w-3 shrink-0" />
                          excluída, mas necessária
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
            O bloco optativo exige {resultado.trilhasExigidas} {resultado.trilhasExigidas === 1 ? "trilha validada" : "trilhas validadas"} e a carga horária
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
        {ofertas.map((o) => formatarSemestre(o.semestre)).join(" e ")}. Cada semestre futuro herda
        os horários da oferta real mais recente de mesma paridade (2027.1 espelha 2026.1, 2027.2
        espelha 2026.2), e o motor só agenda uma disciplina se houver turma sem choque com as que
        já entraram no mesmo semestre. Disciplinas de trilha sem oferta registrada ficam fora do
        plano. Confirme sempre no Portal do Aluno.
      </p>

      <ModalExplicacaoCalculos
        aberto={explicacaoAberta}
        onFechar={() => setExplicacaoAberta(false)}
        id="modalExplicacaoCalculosSimulador"
      />
    </div>
  );
}
