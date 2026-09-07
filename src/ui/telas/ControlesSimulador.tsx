// Alavancas de modelagem do Simulador de Formatura (TASK-47).
//
// Separadas da tela porque são três camadas de visibilidade distintas e cada
// uma tem regra própria de quando aparecer:
//
//   Camada 1 — trilhas-alvo, junto do ritmo. É a escolha que todo aluno de
//              curso com trilha entende de imediato.
//   Camada 3 — ritmo por semestre, janela de aulas e disciplinas fixadas, no
//              painel avançado. São ajustes finos que confundem quem só quer
//              uma projeção rápida.
//
// A camada 2 (botão "trocar" na linha do tempo) vive na própria tela, porque é
// contextual à disciplina projetada.
import type { Matriz } from "../../domain/tipos";
import { descricaoDoCurso, ehTrilha } from "../../domain/cursos";
import { PRIMEIRO_SLOT, rotuloDoSlot, SLOTS_ORDENADOS, ULTIMO_SLOT } from "../../domain/horarios";
import { formatarSemestre } from "../../domain/motor/simuladorFormatura";

/** O que o aluno modelou, à parte das exclusões. */
export interface ValorModelagem {
  /** conjuntos de trilha escolhidos; vazio devolve a escolha ao motor */
  trilhasAlvo: string[];
  /** códigos que ele quer cursar */
  disciplinasFixadas: string[];
  /** ritmo específico por semestre, sobrepondo o global */
  ritmoPorSemestre: Record<string, number>;
  aulaInicial: string;
  aulaFinal: string;
  /** disciplinas presas a um semestre: chave = semestre, valor = códigos */
  fixacoesPorSemestre: Record<string, string[]>;
}

export const MODELAGEM_VAZIA: ValorModelagem = {
  trilhasAlvo: [],
  disciplinasFixadas: [],
  ritmoPorSemestre: {},
  aulaInicial: PRIMEIRO_SLOT,
  aulaFinal: ULTIMO_SLOT,
  fixacoesPorSemestre: {},
};

/**
 * Prende uma disciplina a um semestre, tirando-a de qualquer outro (TASK-50).
 *
 * Uma disciplina presa a dois semestres ao mesmo tempo não significa nada, e o
 * motor leria só a última — por isso a limpeza vem antes da inserção.
 */
export function fixarNoSemestre(
  valor: ValorModelagem,
  codigo: string,
  semestre: string | null,
): ValorModelagem {
  const limpo: Record<string, string[]> = {};
  for (const [sem, codigos] of Object.entries(valor.fixacoesPorSemestre)) {
    const restantes = codigos.filter((c) => c !== codigo);
    if (restantes.length > 0) limpo[sem] = restantes;
  }
  if (semestre !== null) limpo[semestre] = [...(limpo[semestre] ?? []), codigo];
  return { ...valor, fixacoesPorSemestre: limpo };
}

/** Quantos ajustes o aluno fez — alimenta o contador do painel avançado. */
export function totalModelagem(v: ValorModelagem): number {
  return (
    v.disciplinasFixadas.length +
    Object.keys(v.ritmoPorSemestre).length +
    Object.values(v.fixacoesPorSemestre).reduce((a, c) => a + c.length, 0) +
    (v.aulaInicial !== PRIMEIRO_SLOT || v.aulaFinal !== ULTIMO_SLOT ? 1 : 0)
  );
}

/** Trilhas do curso com o progresso do aluno em cada uma. */
export interface TrilhaDisponivel {
  conjunto: string;
  nome: string;
  cursada: number;
  exigida: number;
}

export function listarTrilhasDisponiveis(
  matriz: Matriz,
  progresso: Map<string, { cursada: number; exigida: number }>,
): TrilhaDisponivel[] {
  const curso = descricaoDoCurso(matriz);
  return Object.entries(matriz.conjuntos)
    .filter(([cod]) => ehTrilha(curso, cod))
    .map(([cod, conj]) => ({
      conjunto: cod,
      nome: conj.nome,
      cursada: progresso.get(cod)?.cursada ?? 0,
      exigida: progresso.get(cod)?.exigida ?? conj.ch,
    }))
    .sort((a, b) => b.cursada - a.cursada || a.nome.localeCompare(b.nome, "pt-BR"));
}

/**
 * Camada 1: em quais trilhas o aluno quer investir.
 *
 * Nenhuma marcada devolve a escolha ao motor — é o padrão, e o texto diz isso,
 * para o aluno não ler a ausência de marcação como erro. Marcar menos que o
 * exigido também é legítimo: o motor completa o resto.
 */
export function SeletorTrilhasAlvo(props: {
  trilhas: TrilhaDisponivel[];
  exigidas: number;
  valor: string[];
  onChange: (v: string[]) => void;
}) {
  const { trilhas, exigidas, valor, onChange } = props;
  if (trilhas.length === 0 || exigidas === 0) return null;

  const alternar = (conjunto: string) =>
    onChange(
      valor.includes(conjunto)
        ? valor.filter((c) => c !== conjunto)
        : [...valor, conjunto],
    );

  return (
    <div>
      <label className="block font-display text-[11px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        Trilhas que quero cursar
      </label>
      <p className="mt-1 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
        {valor.length === 0
          ? `Nenhuma marcada: o Oásis escolhe as ${exigidas} mais baratas de fechar.`
          : `${valor.length} de ${exigidas} escolhida(s)${
              valor.length < exigidas ? " — o Oásis completa o resto." : "."
            }`}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {trilhas.map((t) => {
          const marcada = valor.includes(t.conjunto);
          const completa = t.cursada >= t.exigida;
          return (
            <button
              key={t.conjunto}
              type="button"
              onClick={() => alternar(t.conjunto)}
              title={`${t.nome} — ${t.cursada}h de ${t.exigida}h`}
              className={`cursor-pointer rounded-xl border px-3 py-2 text-left text-xs font-bold transition-all ${
                marcada
                  ? "border-utfpr-500 bg-utfpr-500/15 text-utfpr-900 dark:text-utfpr-200"
                  : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-300"
              }`}
            >
              <span className="block max-w-[16rem] truncate">{t.nome}</span>
              <span
                className={`mt-0.5 block font-mono text-[10px] ${
                  completa ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-500"
                }`}
              >
                {t.cursada}/{t.exigida}h{completa ? " · completa" : ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Camada 3: os ajustes finos.
 *
 * Ficam atrás de um painel fechado de propósito. Quem abre o simulador quer a
 * data da formatura; quem quer modelar ritmo semestre a semestre e janela de
 * horário vai atrás — e para esse não custa um clique.
 */
export function ControlesAvancados(props: {
  valor: ValorModelagem;
  onChange: (v: ValorModelagem) => void;
  /** semestres que a projeção atual produziu, para o ritmo por semestre */
  semestres: string[];
  ritmoGlobal: number;
}) {
  const { valor, onChange, semestres, ritmoGlobal } = props;
  const patch = (p: Partial<ValorModelagem>) => onChange({ ...valor, ...p });

  const idxInicial = SLOTS_ORDENADOS.indexOf(valor.aulaInicial);
  const idxFinal = SLOTS_ORDENADOS.indexOf(valor.aulaFinal);
  const janelaInvertida = idxInicial > idxFinal;

  return (
    <div className="space-y-5">
      {/* ---- ritmo por semestre ---- */}
      <div>
        <label className="block font-display text-[11px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Ritmo de um semestre específico
        </label>
        <p className="mt-1 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
          Semestre sem ajuste próprio segue o ritmo geral ({ritmoGlobal} matérias).
          Útil no semestre de TCC ou estágio.
        </p>
        <div className="mt-2 space-y-1.5">
          {semestres.slice(0, 8).map((s) => {
            const atual = valor.ritmoPorSemestre[s];
            return (
              <div key={s} className="flex items-center gap-2">
                <span className="w-24 font-mono text-xs font-bold text-zinc-600 dark:text-zinc-300">
                  {formatarSemestre(s)}
                </span>
                <select
                  value={atual ?? ""}
                  onChange={(e) => {
                    const proximo = { ...valor.ritmoPorSemestre };
                    if (e.target.value === "") delete proximo[s];
                    else proximo[s] = Number(e.target.value);
                    patch({ ritmoPorSemestre: proximo });
                  }}
                  className="h-9 cursor-pointer rounded-xl border border-zinc-200 bg-zinc-50 px-2 text-xs font-bold outline-none focus:border-utfpr-500 dark:border-zinc-700 dark:bg-zinc-800"
                >
                  <option value="">geral ({ritmoGlobal})</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>
                      {n} matéria{n > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---- janela de aulas ---- */}
      <div>
        <label className="block font-display text-[11px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Janela de aulas
        </label>
        <p className="mt-1 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
          A projeção prefere turmas dentro da janela. Obrigatória sem alternativa
          entra assim mesmo — sem ela não há formatura.
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <select
            value={valor.aulaInicial}
            onChange={(e) => patch({ aulaInicial: e.target.value })}
            className="h-9 cursor-pointer rounded-xl border border-zinc-200 bg-zinc-50 px-2 text-xs font-bold outline-none focus:border-utfpr-500 dark:border-zinc-700 dark:bg-zinc-800"
          >
            {SLOTS_ORDENADOS.map((s) => (
              <option key={s} value={s}>
                A partir de {rotuloDoSlot(s)}
              </option>
            ))}
          </select>
          <select
            value={valor.aulaFinal}
            onChange={(e) => patch({ aulaFinal: e.target.value })}
            className="h-9 cursor-pointer rounded-xl border border-zinc-200 bg-zinc-50 px-2 text-xs font-bold outline-none focus:border-utfpr-500 dark:border-zinc-700 dark:bg-zinc-800"
          >
            {SLOTS_ORDENADOS.map((s) => (
              <option key={s} value={s}>
                Até {rotuloDoSlot(s)}
              </option>
            ))}
          </select>
        </div>
        {janelaInvertida && (
          <p className="mt-1.5 text-[11px] font-bold text-red-600 dark:text-red-400">
            A aula final vem antes da inicial — a janela está sendo ignorada.
          </p>
        )}
      </div>

      {/* ---- disciplinas fixadas ---- */}
      {valor.disciplinasFixadas.length > 0 && (
        <div>
          <label className="block font-display text-[11px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Matérias que eu quero cursar
          </label>
          <p className="mt-1 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
            Escolhidas pelo botão <strong>trocar</strong> na linha do tempo. Elas
            entram no lugar do que o Oásis escolheria, sem somar carga extra.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {valor.disciplinasFixadas.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() =>
                  patch({ disciplinasFixadas: valor.disciplinasFixadas.filter((x) => x !== c) })
                }
                title="Deixar o Oásis escolher de novo"
                className="cursor-pointer rounded-lg border border-utfpr-500/60 bg-utfpr-500/15 px-2 py-1 font-mono text-[11px] font-bold text-utfpr-900 hover:border-red-400 hover:bg-red-50 hover:text-red-700 dark:text-utfpr-200 dark:hover:bg-red-950/40 dark:hover:text-red-300"
              >
                {c} ✕
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
