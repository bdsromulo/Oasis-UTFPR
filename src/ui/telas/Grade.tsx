import { useMemo, useState, useRef } from "react";
import { toPng } from "html-to-image";
import type { OfertaSemestre } from "../../domain/tipos";
import {
  aulasSemanais,
  chaveSlot,
  detectarConflitos,
  horariosUnicos,
  itensDaSelecao,
  relatorioTexto,
  type ItemGrade,
} from "../../domain/motor/grade";
import type { Matriz, PerfilAluno, SelecaoTurma } from "../../domain/tipos";
import { faixaDoSlot } from "../../domain/horarios";
import { categoriaDe, normNome } from "../../domain/motor/elegiveis";
import { calcularResumoProgressoGrade, obterCargaHoraria, type ResumoCategoriaGrade } from "../../domain/motor/progressoGrade";
import { Badge, Botao, Card, BarraProgressoComPreview, BalaoProgressoHover } from "../componentes";
import { IconCopy, IconCheck, IconTrash, IconWarning, IconCalendar } from "../icons";
import { ModalGradeMagica } from "./ModalGradeMagica";

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
  "bg-amber-400 text-amber-950 dark:bg-amber-500 dark:text-amber-950",
  "bg-emerald-400 text-emerald-950 dark:bg-emerald-500 dark:text-emerald-950",
  "bg-sky-400 text-sky-950 dark:bg-sky-500 dark:text-sky-950",
  "bg-rose-400 text-rose-950 dark:bg-rose-500 dark:text-rose-950",
  "bg-violet-400 text-violet-950 dark:bg-violet-500 dark:text-violet-950",
  "bg-orange-400 text-orange-950 dark:bg-orange-500 dark:text-orange-950",
  "bg-teal-400 text-teal-950 dark:bg-teal-500 dark:text-teal-950",
  "bg-fuchsia-400 text-fuchsia-950 dark:bg-fuchsia-500 dark:text-fuchsia-950",
  "bg-lime-400 text-lime-950 dark:bg-lime-500 dark:text-lime-950",
  "bg-indigo-400 text-indigo-950 dark:bg-indigo-500 dark:text-indigo-950",
];

function CardResumoCategoria({ r, isSubTrilha }: { r: ResumoCategoriaGrade; isSubTrilha?: boolean }) {
  const max = r.exigido > 0 ? r.exigido : 1;
  const pctTotal = Math.min(100, Math.round((r.cumpridoSimulado / max) * 100));
  const ehExcedenteConcluido = Boolean(isSubTrilha && r.cumpridoBase >= r.exigido && r.impulsoGrade > 0);

  return (
    <div
      key={r.categoriaId}
      className={`flex flex-col justify-between rounded-2xl border p-4.5 transition-all ${
        ehExcedenteConcluido
          ? "border-amber-500/60 bg-amber-50/50 dark:border-amber-500/50 dark:bg-amber-950/30 ring-1 ring-amber-500/30 shadow-md"
          : r.impulsoGrade > 0
          ? "border-utfpr-500/40 bg-utfpr-50/30 dark:border-utfpr-500/30 dark:bg-utfpr-950/20 shadow-sm"
          : "border-zinc-200/80 bg-zinc-50/60 dark:border-zinc-800/80 dark:bg-zinc-900/60 opacity-85"
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <span className="font-display text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
            {r.categoriaNome}
          </span>
          {r.impulsoGrade > 0 && (
            ehExcedenteConcluido ? (
              <span className="shrink-0 rounded-lg bg-amber-500/25 border border-amber-500/50 px-2 py-0.5 font-mono text-xs font-black text-amber-900 dark:text-amber-200 ring-1 ring-amber-500/30 flex items-center gap-1">
                ⚡ +{r.impulsoGrade}h (Excedente)
              </span>
            ) : (
              <span className="shrink-0 rounded-lg bg-utfpr-500/15 border border-utfpr-500/30 px-2 py-0.5 font-mono text-xs font-bold text-utfpr-800 dark:text-utfpr-300">
                +{r.impulsoGrade}h
              </span>
            )
          )}
        </div>

        <div className="mt-3 space-y-1.5">
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-medium text-zinc-600 dark:text-zinc-400">
              Progresso: <strong className="text-zinc-900 dark:text-zinc-100">{r.cumpridoBase}h</strong>
              {r.impulsoGrade > 0 && (
                <span className="text-utfpr-600 dark:text-utfpr-400 font-bold"> +{r.impulsoGrade}h</span>
              )}
            </span>
            <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">
              {Math.min(r.exigido, r.cumpridoSimulado)}/{r.exigido}h ({pctTotal}%)
            </span>
          </div>

          <BarraProgressoComPreview
            cumprido={r.cumpridoBase}
            preview={r.impulsoGrade}
            exigido={r.exigido}
          />
        </div>

        {ehExcedenteConcluido && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/15 border border-amber-500/30 p-2.5 text-[11px] font-bold text-amber-900 dark:text-amber-200">
            <span className="text-sm shrink-0 mt-0.5">⭐️</span>
            <span>
              Trilha já completa ({r.cumpridoBase}/{r.exigido}h)! As <strong className="font-mono text-amber-700 dark:text-amber-300">+{r.impulsoGrade}h</strong> contam como <strong className="underline decoration-amber-500">horas excedentes</strong> para o 3º Estrato/Eletivas.
            </span>
          </div>
        )}

        {r.disciplinasEnvolvidas.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-zinc-200/60 dark:border-zinc-800/80 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Matérias na grade ({r.disciplinasEnvolvidas.length}):
            </div>
            <div className="flex flex-wrap gap-1">
              {r.disciplinasEnvolvidas.map((disc) => (
                <span
                  key={disc.codigo}
                  className="inline-flex items-center gap-1 rounded bg-white/90 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-zinc-700 shadow-2xs border border-zinc-200/80 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700/80"
                  title={`${disc.nome} (${disc.carga}h)`}
                >
                  {disc.codigo}
                  <span className="text-[10px] font-bold text-utfpr-600 dark:text-utfpr-400">
                    +{disc.carga}h
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 pt-2 border-t border-zinc-200/50 dark:border-zinc-800/60 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
        {r.statusTexto}
      </div>
    </div>
  );
}

function SecaoResumoImpactoGrade(props: {
  itens: ItemGrade[];
  perfil?: PerfilAluno | null;
  matriz?: Matriz | null;
}) {
  const temHistorico = Boolean(props.perfil && props.perfil.cursadas && props.perfil.cursadas.length > 0);
  const resumos = useMemo(
    () => calcularResumoProgressoGrade(props.itens, props.perfil, props.matriz),
    [props.itens, props.perfil, props.matriz]
  );

  if (!temHistorico) {
    return (
      <div className="mt-8 rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-md dark:border-zinc-800 dark:bg-zinc-900 space-y-5 animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-utfpr-500/20 text-utfpr-700 dark:bg-utfpr-500/15 dark:text-utfpr-400 font-bold text-sm">
                📈
              </span>
              <h3 className="font-display text-lg font-black text-zinc-900 dark:text-zinc-100">
                Resumo do Impacto Curricular da Grade
              </h3>
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Confira quanto as matérias selecionadas impulsionam cada estrato do seu curso em relação ao progresso atual.
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl">
          {/* Overlay bloqueio com mensagem */}
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-white/75 p-6 text-center backdrop-blur-md dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 shadow-lg">
            <span className="mb-2.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-2xl text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 shadow-inner">
              🔒
            </span>
            <h4 className="font-display text-base font-bold text-zinc-900 dark:text-zinc-100">
              Histórico do Aluno não carregado
            </h4>
            <p className="mt-1 max-w-md text-xs font-medium text-zinc-600 dark:text-zinc-300 leading-relaxed">
              Não é possível enxergar o resumo de progresso esperado pois o Histórico Escolar do aluno não foi carregado no início da sessão. Carregue seu histórico na aba inicial para liberar a visualização do progresso curricular por estrato e trilha.
            </p>
          </div>

          {/* Previews vazios com blur ao fundo */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 blur-md opacity-40 pointer-events-none select-none p-2">
            {[
              "Obrigatórias (1º Estrato)",
              "2º Estrato",
              "Ciclo de Humanidades",
              "Trilhas em Computação (3º Estrato)",
              "Eletivas / Atividades",
              "Estágio / TCC"
            ].map((titulo, i) => (
              <div key={i} className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4.5 dark:border-zinc-800 dark:bg-zinc-900 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-display text-sm font-bold text-zinc-900 dark:text-zinc-100">{titulo}</span>
                  <span className="text-xs font-bold text-zinc-400">0h / ---h</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800" />
                <div className="text-[11px] text-zinc-400">Progresso bloqueado (sem histórico)</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (resumos.length === 0) return null;

  const resumosNormaisPrimeiraParte = resumos.filter((r) =>
    ["obrigatorias", "1159", "1161"].includes(r.categoriaId)
  );
  const resumoTrilhasGeral = resumos.find((r) => r.categoriaId === "trilhas_geral");
  const resumosSubTrilhas = resumos.filter(
    (r) => !isNaN(Number(r.categoriaId)) && Number(r.categoriaId) >= 1162 && Number(r.categoriaId) <= 1173
  );
  const resumosNormaisSegundaParte = resumos.filter(
    (r) =>
      !["obrigatorias", "1159", "1161", "trilhas_geral"].includes(r.categoriaId) &&
      !(!isNaN(Number(r.categoriaId)) && Number(r.categoriaId) >= 1162 && Number(r.categoriaId) <= 1173)
  );

  return (
    <div className="mt-8 rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-md dark:border-zinc-800 dark:bg-zinc-900 space-y-5 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-utfpr-500/20 text-utfpr-700 dark:bg-utfpr-500/15 dark:text-utfpr-400 font-bold text-sm">
              📈
            </span>
            <h3 className="font-display text-lg font-black text-zinc-900 dark:text-zinc-100">
              Resumo do Impacto Curricular da Grade
            </h3>
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            Confira quanto as matérias selecionadas impulsionam cada estrato do seu curso em relação ao progresso atual.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Já concluído
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
            <span className="h-2.5 w-2.5 rounded-full bg-utfpr-500" /> +Impulso nesta Grade
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" /> Faltante
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {resumosNormaisPrimeiraParte.map((r) => (
          <CardResumoCategoria key={r.categoriaId} r={r} />
        ))}

        {(resumoTrilhasGeral || resumosSubTrilhas.length > 0) && (
          <div className="col-span-full rounded-3xl border-2 border-utfpr-500/35 bg-gradient-to-br from-zinc-50/95 via-white to-utfpr-500/5 p-5 dark:from-zinc-900/95 dark:via-zinc-900 dark:to-utfpr-500/10 shadow-lg space-y-5">
            {resumoTrilhasGeral && (
              <div className="flex flex-col justify-between rounded-2xl border border-utfpr-500/40 bg-white/90 p-4.5 dark:bg-zinc-900/90 shadow-sm">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-utfpr-500/20 text-utfpr-700 dark:bg-utfpr-500/15 dark:text-utfpr-400 font-bold text-sm">
                        🎯
                      </span>
                      <span className="font-display text-base font-black text-zinc-900 dark:text-zinc-100 leading-snug">
                        {resumoTrilhasGeral.categoriaNome}
                      </span>
                    </div>
                    {resumoTrilhasGeral.impulsoGrade > 0 && (
                      <span className="shrink-0 rounded-lg bg-utfpr-500/15 border border-utfpr-500/30 px-2.5 py-1 font-mono text-xs font-bold text-utfpr-800 dark:text-utfpr-300">
                        +{resumoTrilhasGeral.impulsoGrade}h
                      </span>
                    )}
                  </div>

                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-medium text-zinc-600 dark:text-zinc-400">
                        Progresso Total (3 Trilhas): <strong className="text-zinc-900 dark:text-zinc-100">{resumoTrilhasGeral.cumpridoBase}h</strong>
                        {resumoTrilhasGeral.impulsoGrade > 0 && (
                          <span className="text-utfpr-600 dark:text-utfpr-400 font-bold"> +{resumoTrilhasGeral.impulsoGrade}h</span>
                        )}
                      </span>
                      <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">
                        {Math.min(resumoTrilhasGeral.exigido, resumoTrilhasGeral.cumpridoSimulado)}/{resumoTrilhasGeral.exigido}h ({Math.min(100, Math.round((resumoTrilhasGeral.cumpridoSimulado / (resumoTrilhasGeral.exigido || 1)) * 100))}%)
                      </span>
                    </div>

                    <BarraProgressoComPreview
                      cumprido={resumoTrilhasGeral.cumpridoBase}
                      preview={resumoTrilhasGeral.impulsoGrade}
                      exigido={resumoTrilhasGeral.exigido}
                    />
                  </div>

                  {resumoTrilhasGeral.disciplinasEnvolvidas.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-zinc-200/60 dark:border-zinc-800/80 space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        Matérias de Trilhas nesta grade ({resumoTrilhasGeral.disciplinasEnvolvidas.length}):
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {resumoTrilhasGeral.disciplinasEnvolvidas.map((disc) => (
                          <span
                            key={disc.codigo}
                            className="inline-flex items-center gap-1 rounded bg-white/90 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-zinc-700 shadow-2xs border border-zinc-200/80 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700/80"
                            title={`${disc.nome} (${disc.carga}h)`}
                          >
                            {disc.codigo}
                            <span className="text-[10px] font-bold text-utfpr-600 dark:text-utfpr-400">
                              +{disc.carga}h
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-zinc-200/50 dark:border-zinc-800/60 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                  {resumoTrilhasGeral.statusTexto}
                </div>
              </div>
            )}

            {resumosSubTrilhas.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-zinc-200/80 dark:border-zinc-800/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-utfpr-700 dark:text-utfpr-400">
                      📌 Progresso Individual por Trilha ({resumosSubTrilhas.length})
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                    As 3 trilhas com maior carga somam para as 345h obrigatórias do estrato
                  </span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {resumosSubTrilhas.map((r) => (
                    <CardResumoCategoria key={r.categoriaId} r={r} isSubTrilha={true} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {resumosNormaisSegundaParte.map((r) => (
          <CardResumoCategoria key={r.categoriaId} r={r} />
        ))}
      </div>
    </div>
  );
}

export function TelaGrade(props: {
  oferta: OfertaSemestre;
  selecao: SelecaoTurma[];
  setSelecao: (s: SelecaoTurma[]) => void;
  cestaGrades?: Record<string, SelecaoTurma[]>;
  gradeAtiva?: string;
  onMudarGradeAtiva?: (id: string) => void;
  onNovaGrade?: () => void;
  onRemoverGrade?: (id: string) => void;
  perfil?: PerfilAluno | null;
  matriz?: Matriz;
  onAbrirGradeMagica?: () => void;
  exclusoesSugestao?: {
    disciplinas: { codigo: string; nome: string }[];
    professores: string[];
    trilhas?: { conjunto: string; nome: string }[];
    outrosFiltros?: string[];
  } | null;
  onLimparExclusoes?: () => void;
  todasCestasPorSemestre?: Record<string, Record<string, SelecaoTurma[]>>;
  semestreAtivo?: string;
  todasOfertas?: Record<string, OfertaSemestre>;
}) {
  const { oferta, selecao, setSelecao } = props;
  const [copiado, setCopiado] = useState(false);
  const [modalGradeMagica, setModalGradeMagica] = useState(false);
  const [disciplinaHoverId, setDisciplinaHoverId] = useState<string | null>(null);
  const [elementoHoverKey, setElementoHoverKey] = useState<string | null>(null);
  const [progressoCarregadoKey, setProgressoCarregadoKey] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const iniciarHover = (id: string, chaveElemento?: string) => {
    setDisciplinaHoverId(id);
    if (chaveElemento) {
      setElementoHoverKey(chaveElemento);
      setProgressoCarregadoKey(null);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = setTimeout(() => {
        setProgressoCarregadoKey(chaveElemento);
      }, 1000);
    } else {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      setElementoHoverKey(null);
      setProgressoCarregadoKey(null);
    }
  };

  const cancelarHover = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setDisciplinaHoverId(null);
    setElementoHoverKey(null);
    setProgressoCarregadoKey(null);
  };
  const [modalConfirmarLimpar, setModalConfirmarLimpar] = useState(false);
  const [baixandoImagem, setBaixandoImagem] = useState(false);
  const gradeTableRef = useRef<HTMLDivElement>(null);

  const [modalImportarAberto, setModalImportarAberto] = useState(false);
  const [semestreOrigemSelecionado, setSemestreOrigemSelecionado] = useState<string | null>(null);
  const [gradeOrigemSelecionada, setGradeOrigemSelecionada] = useState<string>("A");
  const [confirmacaoSobreescreverImportacao, setConfirmacaoSobreescreverImportacao] = useState(false);
  const [turnoFiltro, setTurnoFiltro] = useState<"TODOS" | "M" | "T" | "N">("TODOS");

  const itens: ItemGrade[] = useMemo(() => itensDaSelecao(oferta, selecao), [oferta, selecao]);

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

  const semestresParaImportacao = useMemo(() => {
    if (!props.todasCestasPorSemestre) return [];
    const semestreAtual = props.semestreAtivo || "2026-2";
    const chavesNoStorage = Object.keys(props.todasCestasPorSemestre);
    const conhecidos = ["2026-2", "2026-1", "2025-2"];
    const todas = Array.from(new Set([...conhecidos, ...chavesNoStorage])).filter(
      (s) => s !== semestreAtual && s !== "null" && s !== "undefined"
    );
    return todas
      .map((semestre) => {
        const cesta = props.todasCestasPorSemestre![semestre] || {};
        const abasComDados = Object.entries(cesta)
          .filter(([_, sel]) => Array.isArray(sel) && sel.length > 0)
          .map(([aba, sel]) => ({ aba, selecao: sel }));
        return {
          semestre,
          label: semestre.replace("-", "."),
          abas: abasComDados,
          temDados: abasComDados.length > 0,
        };
      })
      .filter((s) => s.temDados);
  }, [props.todasCestasPorSemestre, props.semestreAtivo]);

  const semOrigem = semestreOrigemSelecionado ?? semestresParaImportacao[0]?.semestre ?? null;
  const semestreObjOrigem = semestresParaImportacao.find((s) => s.semestre === semOrigem);
  const gradeOrigemAba = semestreObjOrigem?.abas.some((a) => a.aba === gradeOrigemSelecionada)
    ? gradeOrigemSelecionada
    : (semestreObjOrigem?.abas[0]?.aba ?? "A");

  const itensPreviewImportacao = useMemo(() => {
    if (!semestreObjOrigem || !props.todasOfertas) return [];
    const abaDados = semestreObjOrigem.abas.find((a) => a.aba === gradeOrigemAba);
    if (!abaDados) return [];
    const ofertaOrigem = props.todasOfertas[semestreObjOrigem.semestre];
    const ofertaAlvo = props.oferta;

    return abaDados.selecao.map((s) => {
      const resolvedOrigem = ofertaOrigem ? itensDaSelecao(ofertaOrigem, [s])[0] : undefined;
      const discOrigem = resolvedOrigem?.disciplina ?? ofertaOrigem?.disciplinas.find((x) => x.codigo === s.codDisciplina);
      const turOrigem = resolvedOrigem?.turma ?? discOrigem?.turmas.find((x) => x.codigo === s.codTurma);

      const codDiscBuscarAlvo = discOrigem?.codigo ?? s.codDisciplina;
      const discAlvo = ofertaAlvo.disciplinas.find((x) => x.codigo === codDiscBuscarAlvo || x.codigo === s.codDisciplina);

      let compativel = false;
      let turmaAlvoCompativel = null;

      const getHorStr = (t: any) => (t?.horarios || []).map((h: any) => `${h.dia}${h.turno}${h.aula}`).sort().join(",");
      const getProfStr = (t: any) => Array.isArray(t?.professores) ? t.professores.slice().sort().join(",") : (t?.professores_raw || "");

      if (discAlvo && turOrigem && turOrigem.horarios && turOrigem.horarios.length > 0) {
        const hOrigemStr = getHorStr(turOrigem);
        const pOrigemStr = getProfStr(turOrigem);

        for (const tAlvo of discAlvo.turmas) {
          const hAlvoStr = getHorStr(tAlvo);
          const pAlvoStr = getProfStr(tAlvo);
          if (hAlvoStr === hOrigemStr && pAlvoStr === pOrigemStr && hAlvoStr.length > 0) {
            compativel = true;
            turmaAlvoCompativel = tAlvo;
            break;
          }
        }
      }
      
      if (!compativel && discAlvo) {
        const codTurmaProcurar = turOrigem?.codTurmaOriginal ?? turOrigem?.codigo ?? s.codTurma;
        const tAlvo = discAlvo.turmas.find((t) => t.codigo === codTurmaProcurar || t.codigo === s.codTurma);
        if (tAlvo) {
          compativel = true;
          turmaAlvoCompativel = tAlvo;
        }
      }

      const horStrDisplay = (turOrigem?.horarios || []).map((h) => `${h.dia}${h.turno}${h.aula}`).join(", ");
      const profStrDisplay = Array.isArray(turOrigem?.professores)
        ? turOrigem.professores.join(", ")
        : (turOrigem?.professores_raw || "A definir");

      return {
        codDisciplina: resolvedOrigem?.selecaoOriginal ? s.codDisciplina : (discOrigem?.codigo ?? s.codDisciplina),
        codTurmaOrigem: s.codTurma,
        codTurmaAlvo: turmaAlvoCompativel?.codigo ?? (resolvedOrigem?.selecaoOriginal ? s.codTurma : (turOrigem?.codigo ?? s.codTurma)),
        nomeDisciplina: discOrigem?.nome || discAlvo?.nome || s.codDisciplina,
        horariosStr: horStrDisplay || "Sem horário",
        professoresStr: profStrDisplay || "A definir",
        compativel,
        existeNoAlvo: !!discAlvo,
      };
    });
  }, [semestreObjOrigem, gradeOrigemAba, props.todasOfertas, props.oferta]);

  function handleExecutarImportacao() {
    const importaveis = itensPreviewImportacao
      .filter((item) => item.compativel)
      .map((item) => ({
        codDisciplina: item.codDisciplina,
        codTurma: item.codTurmaAlvo,
      }));
    props.setSelecao(importaveis);
    setModalImportarAberto(false);
    setConfirmacaoSobreescreverImportacao(false);
  }

  const importacaoBloqueada = (props.semestreAtivo || "2026-2") !== "2026-2" && props.oferta.semestre !== "2026-2" && props.oferta.semestre !== "2026.2";
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
      {semestresParaImportacao.length > 0 && !importacaoBloqueada && (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              const sIni = semestresParaImportacao[0]?.semestre || null;
              setSemestreOrigemSelecionado(sIni);
              if (sIni) {
                const sObj = semestresParaImportacao.find((x) => x.semestre === sIni);
                setGradeOrigemSelecionada(sObj?.abas[0]?.aba ?? "A");
              }
              setConfirmacaoSobreescreverImportacao(false);
              setModalImportarAberto(true);
            }}
            className="flex h-8 items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3 font-mono text-xs font-bold shadow-2xs transition-colors hover:border-utfpr-500 hover:bg-utfpr-50 hover:text-utfpr-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
            title="Importar matérias cadastradas em outros semestres"
          >
            <span>📥 Importar Matérias</span>
          </button>
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 text-[11px] font-bold text-zinc-600 cursor-help dark:bg-zinc-700 dark:text-zinc-300"
            title="Ao importar as matérias de outro semestre, só serão importadas as matérias que permaneceram iguais em horário e professor no novo período atual. Cargas e professores mudados não serão importados."
          >
            ?
          </span>
        </div>
      )}
    </div>
  );

  const modaisJSX = (
    <>
      <ModalGradeMagica
        aberto={modalGradeMagica}
        onFechar={() => setModalGradeMagica(false)}
        perfil={props.perfil ?? null}
        matriz={props.matriz ?? null}
        oferta={props.oferta}
        selecaoAtual={props.selecao}
        onGerarGrade={(s) => {
          props.setSelecao(s);
          setModalGradeMagica(false);
        }}
      />

      {modalImportarAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-200/80 px-6 py-5 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-utfpr-500/10 text-xl text-utfpr-600 dark:bg-utfpr-500/20 dark:text-utfpr-400">
                  📥
                </span>
                <div>
                  <h2 className="font-display text-lg font-black tracking-tight text-zinc-900 dark:text-white">
                    Importar Matérias de Outro Semestre
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    Selecione o período de origem e a grade desejada para copiar para {props.semestreAtivo || "2026-2"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setModalImportarAberto(false);
                  setConfirmacaoSobreescreverImportacao(false);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-white transition-colors"
                title="Fechar (ESC)"
              >
                ×
              </button>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Aviso de regra de compatibilidade */}
              <div className="flex items-start gap-3 rounded-2xl border border-amber-300/80 bg-amber-50/80 p-4 text-xs text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-200">
                <span className="text-base shrink-0 mt-0.5">ℹ️</span>
                <p className="leading-relaxed">
                  <strong>Regra de compatibilidade:</strong> Só serão importadas as matérias que permaneceram exatamente iguais em horário e professor na oferta de {props.semestreAtivo || "2026-2"}. Turmas que sofreram alteração na carga horária, dias/horários ou docente serão sinalizadas como incompatíveis e não serão trazidas.
                </p>
              </div>

              {/* Botões de semestres */}
              <div className="space-y-3">
                <label className="font-display text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                  1. Escolha o Semestre de Origem
                </label>
                <div className="flex flex-wrap gap-2">
                  {semestresParaImportacao.map((s) => {
                    const sel = semOrigem === s.semestre;
                    return (
                      <button
                        key={s.semestre}
                        onClick={() => {
                          setSemestreOrigemSelecionado(s.semestre);
                          setGradeOrigemSelecionada(s.abas[0]?.aba ?? "A");
                          setConfirmacaoSobreescreverImportacao(false);
                        }}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2.5 font-mono text-xs font-bold transition-all cursor-pointer ${
                          sel
                            ? "bg-zinc-900 text-utfpr-400 shadow-sm dark:bg-zinc-800 dark:text-utfpr-300 border-2 border-utfpr-500"
                            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-400 dark:hover:bg-zinc-800 border-2 border-transparent"
                        }`}
                      >
                        <span>Período {s.label}</span>
                        <span className="rounded-full bg-zinc-200/80 px-1.5 py-0.5 text-[10px] dark:bg-zinc-700 text-current">
                          {s.abas.length} {s.abas.length === 1 ? "grade" : "grades"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sub-botões com a opção de grade (A, B, C...) */}
              {semestreObjOrigem && (
                <div className="space-y-3 pt-2 animate-in fade-in duration-150">
                  <label className="font-display text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                    2. Escolha a Grade Cadastrada
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {semestreObjOrigem.abas.map((a) => {
                      const sel = gradeOrigemAba === a.aba;
                      return (
                        <button
                          key={a.aba}
                          onClick={() => {
                            setGradeOrigemSelecionada(a.aba);
                            setConfirmacaoSobreescreverImportacao(false);
                          }}
                          className={`flex items-center gap-2 rounded-xl px-4 py-2 font-mono text-xs font-bold transition-all cursor-pointer ${
                            sel
                              ? "bg-utfpr-500 text-zinc-950 shadow-xs font-black"
                              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-400 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <span>Grade {a.aba}</span>
                          <span className={`rounded-md px-1.5 py-0.5 text-[10px] ${sel ? "bg-zinc-950/15 text-zinc-950 font-black" : "bg-zinc-200/80 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"}`}>
                            {a.selecao.length} matérias
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Preview Lateral da Grade Selecionada */}
              {semestreObjOrigem && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="font-display text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                      3. Preview das Matérias ({itensPreviewImportacao.length})
                    </label>
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      {itensPreviewImportacao.filter((x) => x.compativel).length} de {itensPreviewImportacao.length} prontas para importar
                    </span>
                  </div>
                  <div className="max-h-64 overflow-y-auto rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-3 space-y-2 dark:border-zinc-800/80 dark:bg-zinc-900/60 divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
                    {itensPreviewImportacao.length === 0 ? (
                      <p className="py-8 text-center text-xs text-zinc-400 italic">Nenhuma matéria encontrada nesta grade.</p>
                    ) : (
                      itensPreviewImportacao.map((item, idx) => (
                        <div key={idx} className="pt-2 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-zinc-500 dark:text-zinc-400 shrink-0">
                                {item.codDisciplina}
                              </span>
                              <span className="font-display text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                {item.nomeDisciplina}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                              <span>Turma: <strong className="font-mono text-zinc-700 dark:text-zinc-300">{item.codTurmaOrigem}</strong></span>
                              <span>·</span>
                              <span>Horário: <strong className="font-mono text-zinc-700 dark:text-zinc-300">{item.horariosStr}</strong></span>
                              <span>·</span>
                              <span className="truncate max-w-[180px]" title={item.professoresStr}>
                                👤 {item.professoresStr}
                              </span>
                            </div>
                          </div>
                          <div className="shrink-0 flex items-center">
                            {item.compativel ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                                <span>✓ Compatível</span>
                              </span>
                            ) : item.existeNoAlvo ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" title={`Esta turma ou matéria mudou de horário/professor no semestre ${props.semestreAtivo || "2026-2"}`}>
                                <span>⚠️ Mudou no atual</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-1 text-[11px] font-bold text-red-700 dark:bg-red-500/20 dark:text-red-300" title="Matéria não está sendo ofertada no semestre atual">
                                <span>⛔ Não Ofertada</span>
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer com botão de confirmação ou sobreescrita */}
            <div className="border-t border-zinc-200/80 bg-zinc-50/80 px-6 py-4 dark:border-zinc-800/80 dark:bg-zinc-900/80">
              {props.selecao.length > 0 && !confirmacaoSobreescreverImportacao ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5">
                  <div className="flex items-start gap-2.5">
                    <span className="text-amber-600 dark:text-amber-400 text-lg">⚠️</span>
                    <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 leading-snug">
                      O seu período atual possui matérias preenchidas. Você tem certeza de que quer sobreescrevê-las com a importação?
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setModalImportarAberto(false)}
                      className="rounded-xl px-3 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => setConfirmacaoSobreescreverImportacao(true)}
                      className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2 font-display text-xs font-black shadow-sm transition-all cursor-pointer"
                    >
                      Sim, Sobreescrever
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      setModalImportarAberto(false);
                      setConfirmacaoSobreescreverImportacao(false);
                    }}
                    className="rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleExecutarImportacao}
                    disabled={itensPreviewImportacao.filter((x) => x.compativel).length === 0}
                    className={`flex items-center gap-2 rounded-xl px-5 py-2.5 font-display text-xs font-black transition-all ${
                      itensPreviewImportacao.filter((x) => x.compativel).length === 0
                        ? "bg-zinc-200 text-zinc-400 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-600"
                        : "bg-utfpr-500 text-zinc-950 hover:bg-utfpr-400 shadow-sm cursor-pointer"
                    }`}
                  >
                    <span>Confirmar Importação ({itensPreviewImportacao.filter((x) => x.compativel).length} matérias)</span>
                  </button>
                </div>
              )}
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
              Você está prestes a remover todas as <strong className="text-zinc-900 dark:text-white">{itens.length} disciplinas</strong> selecionadas na Grade <strong>{props.gradeAtiva || "A"}</strong>. Esta ação limpa os horários da aba, mas você poderá recriá-los ou utilizar as abas alternativas (B ou C).
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
                  setSelecao([]);
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
    </>
  );

  if (itens.length === 0) {
    return (
      <div className="space-y-6">
        {barraAbas}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-200/80 bg-white/80 p-4 shadow-2xs backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-900/80">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Dica: você pode gerar uma grade ideal automaticamente ou adicionar matérias na aba Matérias Abertas.
          </p>
          <Botao
            variante="primario"
            onClick={props.onAbrirGradeMagica || (() => setModalGradeMagica(true))}
            classe="!bg-gradient-to-r !from-amber-500 !to-utfpr-500 !text-zinc-950 !border-amber-600/30 hover:!brightness-105 transition-all shadow-md font-bold cursor-pointer"
          >
            ✨ Sugestão de Grade
          </Botao>
        </div>
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
        {modaisJSX}
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
            variante="neutro"
            onClick={async () => {
              if (!gradeTableRef.current) return;
              try {
                setBaixandoImagem(true);
                const ehEscuro = document.documentElement.classList.contains("dark");
                const dataUrl = await toPng(gradeTableRef.current, {
                  backgroundColor: ehEscuro ? "#18181b" : "#ffffff",
                  pixelRatio: 2,
                  style: {
                    padding: "16px",
                    borderRadius: "16px",
                  },
                });
                const a = document.createElement("a");
                a.href = dataUrl;
                a.download = `grade-horaria-${props.oferta.semestre}-${props.gradeAtiva || "A"}.png`;
                a.click();
              } catch (err) {
                console.error("Erro ao gerar imagem PNG:", err);
              } finally {
                setBaixandoImagem(false);
              }
            }}
            classe="hover:!border-utfpr-500/80 transition-all font-semibold cursor-pointer text-xs"
            title="Baixar imagem PNG da sua grade horária montada"
          >
            <span>{baixandoImagem ? "⏳ Gerando PNG..." : "🖼️ Baixar Imagem (PNG)"}</span>
          </Botao>
          <Botao
            variante="primario"
            onClick={props.onAbrirGradeMagica || (() => setModalGradeMagica(true))}
            classe="!bg-gradient-to-r !from-amber-500 !to-utfpr-500 !text-zinc-950 !border-amber-600/30 hover:!brightness-105 transition-all shadow-md font-bold cursor-pointer"
          >
            ✨ Sugestão de Grade
          </Botao>
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
          <Botao
            variante="perigo"
            onClick={() => {
              if (itens.length > 1) {
                setModalConfirmarLimpar(true);
              } else {
                setSelecao([]);
                props.onLimparExclusoes?.();
              }
            }}
          >
            <IconTrash className="h-4 w-4" />
            <span>Limpar grade</span>
          </Botao>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Filtrar Turno:</span>
          <div className="flex gap-1.5">
            {(["TODOS", "M", "T", "N"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTurnoFiltro(t)}
                className={`rounded-lg px-3 py-1 font-display text-xs font-bold transition-all cursor-pointer ${
                  turnoFiltro === t
                    ? "bg-utfpr-500 text-zinc-950 shadow-xs"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                }`}
              >
                {t === "TODOS" ? "Todos os Turnos" : t === "M" ? "Manhã" : t === "T" ? "Tarde" : "Noite"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div ref={gradeTableRef} className="overflow-x-auto rounded-2xl border border-zinc-200/80 shadow-xs dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-2 sm:p-4">
        <table className="w-full min-w-[680px] border-collapse bg-white text-xs dark:bg-zinc-900">
          <thead>
            <tr className="bg-zinc-50/80 dark:bg-zinc-800/50">
              <th className="w-12 border-b border-r border-zinc-200/80 p-2.5 text-center font-mono text-zinc-400 dark:border-zinc-800/80 sticky left-0 z-10 bg-zinc-50 dark:bg-zinc-800">
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
            {SLOTS.filter(([turno]) => turnoFiltro === "TODOS" || turno === turnoFiltro).map(([turno, aula]) => {
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
                    className="border-r border-zinc-100 bg-zinc-50/90 p-1.5 text-center font-mono font-semibold text-zinc-500 dark:border-zinc-800/60 dark:bg-zinc-900/90 dark:text-zinc-400 sticky left-0 z-10 shadow-xs"
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
                          {ocupantes.map((o, i) => {
                            const codIdentificador = o.item.selecaoOriginal?.codDisciplina ?? o.item.disciplina.codigo;
                            const isHovered =
                              disciplinaHoverId === o.item.disciplina.codigo ||
                              disciplinaHoverId === codIdentificador;

                            return (
                              <div
                                key={i}
                                onMouseEnter={() => iniciarHover(codIdentificador)}
                                onMouseLeave={cancelarHover}
                                className={`group relative flex items-center justify-between gap-1 rounded-lg px-2 py-1 text-xs transition-all ${o.cor} ${
                                  isHovered
                                    ? "ring-2 ring-zinc-950 dark:ring-white scale-[1.03] shadow-md z-40 brightness-105 overflow-visible"
                                    : "hover:scale-[1.01]"
                                }`}
                                title={`${o.item.disciplina.nome} — ${o.item.turma.codigo}${o.sala ? ` (${o.sala})` : ""}`}
                              >
                                <div className="truncate min-w-0">
                                  <span className="font-mono font-bold">{o.item.disciplina.codigo}</span>
                                  {o.sala ? ` · ${o.sala}` : ""}
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelecao(selecao.filter((s) => s.codDisciplina !== codIdentificador));
                                  }}
                                  className={`h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-red-600 font-mono text-[9px] font-bold text-white shadow-2xs hover:bg-red-700 cursor-pointer ${
                                    isHovered ? "flex" : "hidden group-hover:flex"
                                  }`}
                                  title={`Remover ${codIdentificador}`}
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
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

      {props.exclusoesSugestao &&
        ((props.exclusoesSugestao.disciplinas && props.exclusoesSugestao.disciplinas.length > 0) ||
          (props.exclusoesSugestao.professores && props.exclusoesSugestao.professores.length > 0) ||
          (props.exclusoesSugestao.trilhas && props.exclusoesSugestao.trilhas.length > 0) ||
          (props.exclusoesSugestao.outrosFiltros && props.exclusoesSugestao.outrosFiltros.length > 0)) && (
          <div className="rounded-2xl border border-amber-400/60 bg-amber-50/90 p-4 text-xs text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/70 dark:text-amber-200 shadow-sm space-y-1.5 animate-in fade-in">
            <div className="font-display text-sm font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span>ℹ️</span> Observação: Itens excluídos ou filtros na geração via Sugestão de Grade
              </span>
              {props.onLimparExclusoes && (
                <button
                  type="button"
                  onClick={props.onLimparExclusoes}
                  className="text-[11px] font-normal text-amber-700 hover:underline dark:text-amber-300 cursor-pointer"
                >
                  ocultar observação
                </button>
              )}
            </div>
            {props.exclusoesSugestao.disciplinas && props.exclusoesSugestao.disciplinas.length > 0 && (
              <div className="leading-relaxed">
                <strong className="font-semibold text-amber-950 dark:text-amber-100">Matérias excluídas: </strong>
                {props.exclusoesSugestao.disciplinas.map((d) => `${d.codigo} (${d.nome})`).join("; ")}
              </div>
            )}
            {props.exclusoesSugestao.professores && props.exclusoesSugestao.professores.length > 0 && (
              <div className="leading-relaxed">
                <strong className="font-semibold text-amber-950 dark:text-amber-100">Professores excluídos: </strong>
                {props.exclusoesSugestao.professores.join("; ")}
              </div>
            )}
            {props.exclusoesSugestao.trilhas && props.exclusoesSugestao.trilhas.length > 0 && (
              <div className="leading-relaxed">
                <strong className="font-semibold text-amber-950 dark:text-amber-100">Trilhas excluídas: </strong>
                {props.exclusoesSugestao.trilhas.map((t) => t.nome).join("; ")}
              </div>
            )}
            {props.exclusoesSugestao.outrosFiltros && props.exclusoesSugestao.outrosFiltros.length > 0 && (
              <div className="leading-relaxed">
                <strong className="font-semibold text-amber-950 dark:text-amber-100">Filtros/Prioridades aplicados: </strong>
                {props.exclusoesSugestao.outrosFiltros.join("; ")}
              </div>
            )}
          </div>
        )}

      <div className="space-y-2">
        <h3 className="font-display text-sm font-bold tracking-tight text-zinc-500 uppercase dark:text-zinc-400">
          Disciplinas selecionadas ({itens.length})
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {itens.map((item, i) => {
            const discMatriz = props.matriz?.disciplinas.find(
              (x) => x.codigo === item.disciplina.codigo || (x.equivalentes || []).some((eq) => eq.codigo === item.disciplina.codigo) || normNome(x.nome) === normNome(item.disciplina.nome)
            );
            const catRaw = discMatriz && props.matriz ? categoriaDe(discMatriz, props.matriz) : "eletiva";
            const catNome =
              catRaw === "obrigatória"
                ? "Obrigatória"
                : catRaw === "2º estrato"
                ? "2º Estrato"
                : catRaw === "humanidades"
                ? "Optativa de Humanidades"
                : catRaw === "eletiva"
                ? "Eletiva"
                : catRaw
                ? catRaw.charAt(0).toUpperCase() + catRaw.slice(1)
                : "Eletiva";

            const nomesProfessores =
              item.turma.professores && item.turma.professores.length > 0
                ? item.turma.professores.join(", ")
                : item.turma.professores_raw || "Professor a definir";

            const codIdentificador = item.selecaoOriginal?.codDisciplina ?? item.disciplina.codigo;
            const chaveElemento = `card-${codIdentificador}-${item.turma.codigo}-${i}`;
            const isHovered = disciplinaHoverId === item.disciplina.codigo || disciplinaHoverId === codIdentificador;
            const isEsteElemento = elementoHoverKey === chaveElemento;
            const progressoPronto = progressoCarregadoKey === chaveElemento;

            return (
              <div
                key={item.selecaoOriginal ? `${item.selecaoOriginal.codDisciplina}-${item.selecaoOriginal.codTurma}` : item.disciplina.codigo}
                onMouseEnter={() => iniciarHover(codIdentificador, chaveElemento)}
                onMouseLeave={cancelarHover}
                className={`relative flex flex-col justify-between gap-3 rounded-xl border p-3.5 shadow-2xs transition-all ${
                  isHovered
                    ? "border-utfpr-500 bg-utfpr-500/5 ring-1 ring-utfpr-500 dark:border-utfpr-400 dark:bg-utfpr-500/10 scale-[1.01] z-40 overflow-visible"
                    : "border-zinc-200/80 bg-white dark:border-zinc-800/80 dark:bg-zinc-900"
                }`}
              >
                {isEsteElemento && (
                  <BalaoProgressoHover
                    codigoDisciplina={item.disciplina.codigo}
                    nomeDisciplina={item.disciplina.nome}
                    cargaHoraria={obterCargaHoraria(item.disciplina, props.matriz)}
                    perfil={props.perfil}
                    matriz={props.matriz}
                    posicao="superior"
                    carregando={!progressoPronto}
                  />
                )}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${CORES[i % CORES.length].split(" ")[0]}`} />
                    <div className="min-w-0">
                      <div className="font-display text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                        {item.disciplina.nome}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {item.disciplina.codigo}
                        </span>
                        <span>·</span>
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          Turma {item.turma.codigo}
                        </span>
                        <span className="rounded-full bg-utfpr-500/10 px-2 py-0.5 font-sans text-[10px] font-bold text-utfpr-600 dark:bg-utfpr-500/20 dark:text-utfpr-400">
                          {catNome}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300 font-medium">
                        <span className="text-zinc-400">👤</span>
                        <span className="truncate" title={nomesProfessores}>
                          {nomesProfessores}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Botao
                    variante="perigo"
                    onClick={() =>
                      setSelecao(selecao.filter((s) => s.codDisciplina !== codIdentificador))
                    }
                  >
                    <IconTrash className="h-3.5 w-3.5" />
                    <span>remover</span>
                  </Botao>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resumo visual do Impacto da Grade nas Categorias do Curso */}
      <SecaoResumoImpactoGrade itens={itens} perfil={props.perfil} matriz={props.matriz} />

      {modaisJSX}
    </div>
  );
}

export { TelaGrade as Grade };
