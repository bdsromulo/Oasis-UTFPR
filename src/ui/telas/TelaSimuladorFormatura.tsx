import { useMemo, useState } from "react";
import type { Matriz, PerfilAluno } from "../../domain/tipos";
import {
  formatarSemestreEstendido,
  simularTrajetoria,
  type RitmoSimulacao,
} from "../../domain/motor/simuladorFormatura";
import { isMateriaGargalo, obterSazonalidade, rotuloSazonalidade } from "../../domain/motor/sazonalidade";
import { Badge, Card } from "../componentes";
import { IconCalendar, IconWarning } from "../icons";

interface TelaSimuladorFormaturaProps {
  perfil: PerfilAluno | null;
  matriz: Matriz;
  semestreAtivo: string;
}

export function TelaSimuladorFormatura({
  perfil,
  matriz,
  semestreAtivo,
}: TelaSimuladorFormaturaProps) {
  const [ritmo, setRitmo] = useState<RitmoSimulacao>(240);

  // Define o semestre inicial da simulação: se estiver vendo 2026-1, projeta a partir de 2026-2.
  const semestreInicial = useMemo(() => {
    if (semestreAtivo === "2026-1") return "2026-2";
    if (semestreAtivo === "2025-2") return "2026-1";
    return semestreAtivo; // Se já selecionou 2026-2 (Prévia), começa dele
  }, [semestreAtivo]);

  const resultado = useMemo(
    () => simularTrajetoria(perfil, matriz, ritmo, semestreInicial),
    [perfil, matriz, ritmo, semestreInicial],
  );

  const opRitmos: { valor: RitmoSimulacao; titulo: string; desc: string; icone: string }[] = [
    {
      valor: 180,
      titulo: "Ritmo Leve (180h / sem)",
      desc: "~3 disciplinas por semestre. Ideal se você trabalha ou tem menos tempo.",
      icone: "🐢",
    },
    {
      valor: 240,
      titulo: "Ritmo Padrão (240h / sem)",
      desc: "~4 disciplinas por semestre. Ritmo recomendado do PPC.",
      icone: "🚶",
    },
    {
      valor: 300,
      titulo: "Ritmo Acelerado (300h / sem)",
      desc: "~5 ou 6 disciplinas por semestre. Para adiantar ou recuperar fluxo.",
      icone: "🚀",
    },
  ];

  if (!perfil) {
    return (
      <Card classe="p-8 text-center border-2 border-dashed border-zinc-300 dark:border-zinc-700">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-3xl">
          🔒
        </div>
        <h2 className="mt-4 font-display text-xl font-black text-zinc-800 dark:text-zinc-100">
          Simulador de Formatura Bloqueado
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
          Para projetar a data da sua formatura e calcular a linha do tempo semestral com sazonalidade, carregue o seu histórico escolar em PDF nas configurações.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Cabeçalho explicativo */}
      <div>
        <h2 className="font-display text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-3">
          <span>⏳ Simulador de Formatura & Linha do Tempo</span>
          <Badge tom="ok">Motor Sazonal Inteligente</Badge>
        </h2>
        <p className="mt-1 text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Esta projeção calcula automaticamente a ordem ideal de cumprimento das matérias pendentes, respeitando a abertura sazonal (par/ímpar) e priorizando matérias críticas (gargalo) para evitar atrasos na sua graduação.
        </p>
      </div>

      {/* Destaque de Previsão Global */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border-2 border-emerald-500/60 bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-emerald-500/15 p-6 shadow-lg dark:border-emerald-500/70 dark:from-emerald-950/80 dark:to-emerald-950/90 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            <span>🎓 Previsão de Formatura</span>
            <IconCalendar className="h-4 w-4" />
          </div>
          <div className="mt-3 font-display text-xl sm:text-2xl font-black text-emerald-950 dark:text-emerald-100 leading-tight">
            {resultado.dataEstimadaFormatura}
          </div>
          <p className="mt-2 text-xs font-semibold text-emerald-800/80 dark:text-emerald-300/80">
            A partir de {formatarSemestreEstendido(semestreInicial)}
          </p>
        </div>

        <div className="rounded-3xl border border-zinc-200/80 bg-white/90 p-6 shadow-md dark:border-zinc-800/80 dark:bg-zinc-900/90 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            <span>📅 Trajetória Restante</span>
            <span className="text-base">🕒</span>
          </div>
          <div className="mt-3 font-display text-3xl font-black text-zinc-900 dark:text-white">
            {resultado.totalSemestresRestantes}{" "}
            <span className="text-sm font-bold text-zinc-500">
              {resultado.totalSemestresRestantes === 1 ? "semestre" : "semestres"}
            </span>
          </div>
          <p className="mt-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Carga total pendente: <strong className="text-zinc-800 dark:text-zinc-200">{resultado.totalHorasRestantes}h</strong>
          </p>
        </div>

        <div className="rounded-3xl border border-zinc-200/80 bg-white/90 p-6 shadow-md dark:border-zinc-800/80 dark:bg-zinc-900/90 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
            <span>🔥 Matérias Críticas (Gargalo)</span>
            <IconWarning className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-3 font-display text-3xl font-black text-amber-950 dark:text-amber-200">
            {resultado.disciplinasGargaloPendentes.length}{" "}
            <span className="text-sm font-bold text-amber-700/80 dark:text-amber-400/80">
              {resultado.disciplinasGargaloPendentes.length === 1 ? "matéria" : "matérias"}
            </span>
          </div>
          <p className="mt-2 text-xs font-semibold text-amber-800/80 dark:text-amber-300/80">
            Priorizadas para destravamento na cadeia
          </p>
        </div>
      </div>

      {/* Seletor de Ritmo */}
      <div className="rounded-3xl border-2 border-zinc-200/90 bg-white/90 p-6 shadow-md dark:border-zinc-800/90 dark:bg-zinc-900/90">
        <h3 className="font-display text-sm font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-3">
          ⚡ Escolha o seu Ritmo de Conclusão:
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {opRitmos.map((op) => {
            const ativo = ritmo === op.valor;
            return (
              <button
                key={op.valor}
                type="button"
                onClick={() => setRitmo(op.valor)}
                className={`flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all cursor-pointer ${
                  ativo
                    ? "border-utfpr-500 bg-utfpr-500/10 shadow-md ring-2 ring-utfpr-500/30 scale-[1.01]"
                    : "border-zinc-200/80 bg-zinc-50/80 hover:border-zinc-300 dark:border-zinc-800/80 dark:bg-zinc-800/40 dark:hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-display text-sm font-black text-zinc-900 dark:text-white flex items-center gap-2">
                    <span className="text-lg">{op.icone}</span>
                    <span>{op.titulo}</span>
                  </span>
                  {ativo && <span className="rounded-full bg-utfpr-500 px-2 py-0.5 text-[10px] font-black text-zinc-950">Ativo</span>}
                </div>
                <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {op.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Linha do Tempo Semestral */}
      <div className="space-y-6">
        <h3 className="font-display text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2.5">
          <span>📅 Linha do Tempo Semestral Projetada</span>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
            {resultado.semestresProjetados.length} etapas
          </span>
        </h3>

        {resultado.semestresProjetados.length === 0 ? (
          <Card classe="p-6 text-center text-zinc-600 dark:text-zinc-400">
            <p className="font-semibold">Parabéns! Nenhuma disciplina obrigatória pendente na sua matriz!</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {resultado.semestresProjetados.map((sem, idx) => {
              const semRotulo = formatarSemestreEstendido(sem.semestre);
              const isPrimeiro = idx === 0;

              return (
                <div
                  key={sem.semestre}
                  className={`flex flex-col justify-between rounded-3xl border-2 p-5 shadow-md transition-all ${
                    isPrimeiro
                      ? "border-utfpr-500/80 bg-gradient-to-br from-utfpr-500/10 via-amber-400/5 to-white/90 dark:to-zinc-900/95 shadow-lg ring-1 ring-utfpr-500/30"
                      : "border-zinc-200/80 bg-white/95 dark:border-zinc-800/80 dark:bg-zinc-900/95"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 border-b border-zinc-200/80 pb-3 dark:border-zinc-800/80">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-zinc-900 font-mono text-xs font-black text-utfpr-400 dark:bg-zinc-800">
                          #{idx + 1}
                        </span>
                        <h4 className="font-display text-base font-black text-zinc-900 dark:text-white">
                          {semRotulo}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {sem.temGargalo && (
                          <span title="Este semestre contém matéria crítica">
                            <Badge tom="alerta">Gargalo</Badge>
                          </span>
                        )}
                        <Badge tom="neutro">{sem.cargaTotal}h</Badge>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2.5">
                      {sem.disciplinas.map((disc) => {
                        const gargalo = isMateriaGargalo(disc, matriz);
                        const saz = obterSazonalidade(disc);

                        return (
                          <div
                            key={disc.codigo}
                            className={`flex items-start justify-between gap-3 rounded-2xl p-3 text-xs transition-colors ${
                              gargalo
                                ? "border border-amber-400/80 bg-amber-50/80 dark:border-amber-800/80 dark:bg-amber-950/40"
                                : "border border-zinc-200/60 bg-zinc-50/80 dark:border-zinc-800/60 dark:bg-zinc-800/40"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                                  {disc.codigo}
                                </span>
                                {gargalo && (
                                  <span className="rounded bg-amber-500/20 px-1.5 py-0.2 font-mono text-[9px] font-black text-amber-700 dark:text-amber-300">
                                    CRÍTICA
                                  </span>
                                )}
                              </div>
                              <div className="mt-0.5 truncate font-semibold text-zinc-900 dark:text-white">
                                {disc.nome}
                              </div>
                              <div className="mt-1 flex items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-400">
                                <span>{disc.periodo}º Período</span>
                                <span>•</span>
                                <span className="italic">{rotuloSazonalidade(saz).split(" (")[0]}</span>
                              </div>
                            </div>
                            <div className="shrink-0 font-mono font-bold text-zinc-700 dark:text-zinc-300 self-center">
                              {disc.horas.total}h
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                    <span>Qtd. Disciplinas: <strong>{sem.disciplinas.length}</strong></span>
                    <span>Progresso Simulado</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
