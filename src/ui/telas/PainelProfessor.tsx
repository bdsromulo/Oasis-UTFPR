// Painel lateral de avaliações por professor (Estrategia.md §6.4 e RF17).
//
// Abre a partir do nome do docente no planejamento de matrícula e mostra o que a
// comunidade registrou sobre ele — na disciplina em questão e no geral.
import { useEffect, useMemo } from "react";
import { Badge } from "../componentes";
import { criarConsulta, agregar, LIMIAR_ESTATISTICA } from "../../domain/reviews/acervo";
import { construirRoster, slugProfessor } from "../../domain/reviews/professores";
import { DESCRICAO_TAG, type AgregadoReviews, type Review } from "../../domain/reviews/tipos";
import { criarMapaIdentidade } from "../../domain/motor/identidade";
import { CURSOS } from "../../domain/dadosCurso";
import type { Matriz } from "../../domain/tipos";
import acervo from "../../../data/reviews.json";

export interface AlvoPainelProfessor {
  /** Nome como aparece na oferta; o slug é derivado dele. */
  nome: string;
  /** Quando informado, o painel abre focado nesta disciplina. */
  codigo?: string;
  nomeDisciplina?: string;
}

/** Converte um nome de professor da oferta no identificador do acervo. */
export function idDoProfessor(nome: string): string {
  return slugProfessor(nome);
}

function Nota(props: { rotulo: string; valor: number | null; escala: string }) {
  return (
    <div className="rounded-xl border border-zinc-200/70 px-3 py-2 dark:border-zinc-800/70">
      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {props.rotulo}
      </div>
      <div className="font-display text-lg font-black text-zinc-900 dark:text-zinc-100">
        {props.valor === null ? "—" : props.valor.toFixed(1).replace(".", ",")}
        <span className="ml-1 font-sans text-[10px] font-normal text-zinc-400">/ 5</span>
      </div>
      <div className="text-[10px] text-zinc-400">{props.escala}</div>
    </div>
  );
}

function ListaReviews(props: { reviews: Review[] }) {
  if (!props.reviews.length) return null;
  return (
    <div className="space-y-2">
      {props.reviews.map((r) => (
        <div
          key={r.id}
          className="rounded-2xl border border-zinc-200/70 bg-white p-3 dark:border-zinc-800/70 dark:bg-zinc-900"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{r.autor}</span>
            <span className="font-mono text-[10px] text-zinc-400">
              {r.codigo} · {r.semestre}
              {r.situacao === "reprovado" && " · reprovou"}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
            <span>Geral {r.geral}/5</span>
            <span>· Didática {r.didatica}/5</span>
            <span>· Dificuldade {r.dificuldade}/5</span>
            <span>· Carga {r.cargaTrabalho}/5</span>
          </div>
          {r.tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {r.tags.map((t) => (
                <span
                  key={t}
                  title={DESCRICAO_TAG[t].comportamento}
                  className="cursor-help rounded-md border border-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
                >
                  {DESCRICAO_TAG[t].rotulo}
                </span>
              ))}
            </div>
          )}
          {r.comentario && (
            <p className="mt-2 text-xs leading-relaxed text-zinc-700 dark:text-zinc-200">
              {r.comentario}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function Resumo(props: { titulo: string; ag: AgregadoReviews }) {
  const { ag } = props;
  if (ag.n === 0) return null;
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h4 className="font-display text-sm font-bold text-zinc-800 dark:text-zinc-100">
          {props.titulo}
        </h4>
        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
          {ag.n} avaliação{ag.n > 1 ? "ões" : ""}
        </span>
      </div>

      {ag.estatisticaExibivel ? (
        <div className="grid grid-cols-2 gap-2">
          <Nota rotulo="Geral" valor={ag.geral} escala="1 ruim · 5 excelente" />
          <Nota rotulo="Didática" valor={ag.didatica} escala="1 ruim · 5 excelente" />
          <Nota rotulo="Dificuldade" valor={ag.dificuldade} escala="1 fácil · 5 difícil" />
          <Nota rotulo="Carga" valor={ag.cargaTrabalho} escala="1 pouca · 5 muita" />
        </div>
      ) : (
        // com n baixo a média mente: 1 de 1 vira "5,0" e soa como consenso
        <p className="rounded-xl border border-zinc-200/70 bg-zinc-50 p-2.5 text-[11px] leading-relaxed text-zinc-600 dark:border-zinc-800/70 dark:bg-zinc-950/50 dark:text-zinc-300">
          Ainda são poucas avaliações para uma média confiável — são precisas ao menos{" "}
          {LIMIAR_ESTATISTICA}. Os relatos abaixo continuam valendo como leitura individual.
        </p>
      )}

      {ag.estatisticaExibivel && ag.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {ag.tags.slice(0, 6).map((t) => (
            <Badge key={t.tag} tom="neutro">
              <span title={DESCRICAO_TAG[t.tag].comportamento} className="cursor-help">
                {DESCRICAO_TAG[t.tag].rotulo} · {t.n}
              </span>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function PainelProfessor(props: {
  alvo: AlvoPainelProfessor | null;
  matriz: Matriz;
  onFechar: () => void;
}) {
  const { alvo, matriz, onFechar } = props;

  useEffect(() => {
    if (!alvo) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [alvo, onFechar]);

  const dados = useMemo(() => {
    if (!alvo) return null;
    // a identidade é a do curso de quem lê: uma avaliação submetida sob código
    // equivalente de outra matriz aparece aqui do mesmo jeito (§6.10)
    const consulta = criarConsulta(acervo.reviews as Review[], criarMapaIdentidade(matriz));
    const id = idDoProfessor(alvo.nome);
    const docente = construirRoster(CURSOS).porId(id);
    const naDisciplina = alvo.codigo ? consulta.doParProfessorDisciplina(id, alvo.codigo) : [];
    const todas = consulta.doProfessor(id);
    const outras = todas.filter((r) => !naDisciplina.some((d) => d.id === r.id));
    return {
      nomeCanonico: docente?.nome ?? alvo.nome,
      naDisciplina: agregar(naDisciplina),
      geral: agregar(todas),
      outras,
      total: todas.length,
    };
  }, [alvo, matriz]);

  if (!alvo || !dados) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex animate-in justify-end bg-black/50 fade-in backdrop-blur-xs duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-painel-professor"
      onClick={onFechar}
    >
      <aside
        className="h-full w-full max-w-md animate-in overflow-y-auto border-l border-zinc-200/80 bg-zinc-50 p-5 shadow-2xl slide-in-from-right duration-200 dark:border-zinc-800/80 dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3
              id="titulo-painel-professor"
              className="font-display text-lg font-black leading-tight tracking-tight text-zinc-900 dark:text-white"
            >
              {dados.nomeCanonico}
            </h3>
            {alvo.nomeDisciplina && (
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                em {alvo.nomeDisciplina}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="shrink-0 cursor-pointer rounded-xl border border-zinc-200 px-2.5 py-1 text-sm font-bold text-zinc-500 hover:text-zinc-800 dark:border-zinc-800 dark:hover:text-zinc-200"
          >
            ✕
          </button>
        </div>

        {dados.total === 0 ? (
          <p className="rounded-2xl border border-zinc-200/70 bg-white p-4 text-sm leading-relaxed text-zinc-600 dark:border-zinc-800/70 dark:bg-zinc-900 dark:text-zinc-300">
            Ainda não há avaliações deste professor. Quem já cursou pode avaliar pela tela
            de progresso, nas disciplinas concluídas.
          </p>
        ) : (
          <div className="space-y-5">
            {alvo.codigo && dados.naDisciplina.n > 0 && (
              <>
                <Resumo titulo="Nesta disciplina" ag={dados.naDisciplina} />
                <ListaReviews reviews={dados.naDisciplina.reviews} />
              </>
            )}

            {alvo.codigo && dados.naDisciplina.n === 0 && (
              <p className="rounded-2xl border border-zinc-200/70 bg-white p-3 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800/70 dark:bg-zinc-900 dark:text-zinc-300">
                Nenhuma avaliação deste professor nesta disciplina específica. Abaixo, o que
                a comunidade registrou sobre ele em outras.
              </p>
            )}

            {dados.outras.length > 0 && (
              <div className="border-t border-zinc-200/70 pt-4 dark:border-zinc-800/70">
                <Resumo titulo="Em todas as disciplinas" ag={dados.geral} />
                <div className="mt-2">
                  <ListaReviews reviews={dados.outras} />
                </div>
              </div>
            )}
          </div>
        )}

        <p className="mt-5 text-[10px] leading-relaxed text-zinc-400">
          Avaliações são relatos individuais de estudantes, publicados após curadoria. Não são
          posição institucional da UTFPR nem do Oásis.
        </p>
      </aside>
    </div>
  );
}
