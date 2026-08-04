// Painel lateral de avaliações por professor (Estrategia.md §6.4 e RF17).
//
// Abre a partir do nome do docente no planejamento de matrícula e mostra o que a
// comunidade registrou sobre ele — na disciplina em questão e no geral.
import { useEffect, useMemo } from "react";
import { criarConsulta, agregar } from "../../domain/reviews/acervo";
import {
  FaixaFiltro,
  ListaReviews,
  PainelDistribuicoes,
  Resumo,
  aplicarFiltro,
  useFiltroNota,
} from "./reviewsComuns";
import type { Review } from "../../domain/reviews/tipos";
import { construirRoster, idDaUnidade, slugProfessor } from "../../domain/reviews/professores";
import { criarMapaIdentidade } from "../../domain/motor/identidade";
import { CURSOS } from "../../domain/dadosCurso";
import type { Matriz } from "../../domain/tipos";
import acervo from "../../../data/reviews.json";

export interface AlvoPainelProfessor {
  /**
   * Docentes da turma, como aparecem na oferta. Mais de um quando a turma é
   * dividida: nesse caso a unidade avaliada é a dupla, não cada pessoa.
   */
  nomes: string[];
  /** Quando informado, o painel abre focado nesta disciplina. */
  codigo?: string;
  nomeDisciplina?: string;
}

export function PainelProfessor(props: {
  alvo: AlvoPainelProfessor | null;
  matriz: Matriz;
  onFechar: () => void;
}) {
  const { alvo, matriz, onFechar } = props;
  const [filtro, setFiltro] = useFiltroNota();

  // trocar de professor com filtro ativo mostraria a lista recortada por um
  // critério que a pessoa escolheu para outro alvo
  useEffect(() => setFiltro(null), [alvo?.nomes?.join("|"), alvo?.codigo, setFiltro]);

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
    const id = idDaUnidade(alvo.nomes);
    const unidade = construirRoster(CURSOS).porId(id);

    const daUnidade = consulta.doProfessor(id);
    const naDisciplina = alvo.codigo ? consulta.doParProfessorDisciplina(id, alvo.codigo) : [];
    const outrasDaUnidade = daUnidade.filter((r) => !naDisciplina.some((d) => d.id === r.id));

    // turmas em que algum destes docentes lecionou em OUTRA formação — sozinho ou
    // com outra pessoa. É contexto legítimo, mas não se mistura com a média da
    // unidade: a experiência avaliada ali foi outra.
    const idsDaUnidade = new Set(daUnidade.map((r) => r.id));
    const emOutrasFormacoes = alvo.nomes
      .flatMap((n) => consulta.doDocenteIndividual(slugProfessor(n)))
      .filter((r) => !idsDaUnidade.has(r.id))
      .filter((r, i, arr) => arr.findIndex((o) => o.id === r.id) === i);

    return {
      nomeCanonico: unidade?.nome ?? alvo.nomes.join(" / "),
      dupla: alvo.nomes.length > 1,
      naDisciplina: agregar(naDisciplina),
      personalidade: agregar(daUnidade),
      outrasDaUnidade,
      emOutrasFormacoes,
      total: daUnidade.length,
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
            {dados.dupla && (
              <p className="mt-1 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                Turma dividida entre os dois docentes — as avaliações são da dupla,
                não de cada um separadamente.
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
                <div className="border-t border-zinc-200/70 pt-4 dark:border-zinc-800/70">
                  <h4 className="mb-3 font-display text-sm font-bold text-zinc-800 dark:text-zinc-100">
                    Como as notas se distribuem
                  </h4>
                  <PainelDistribuicoes
                    reviews={dados.naDisciplina.reviews}
                    filtro={filtro}
                    onFiltrar={setFiltro}
                  />
                </div>
                {filtro && (
                  <FaixaFiltro
                    filtro={filtro}
                    n={aplicarFiltro(dados.naDisciplina.reviews, filtro).length}
                    onLimpar={() => setFiltro(null)}
                  />
                )}
                <ListaReviews reviews={aplicarFiltro(dados.naDisciplina.reviews, filtro)} />
              </>
            )}

            {alvo.codigo && dados.naDisciplina.n === 0 && (
              <p className="rounded-2xl border border-zinc-200/70 bg-white p-3 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800/70 dark:bg-zinc-900 dark:text-zinc-300">
                Nenhuma avaliação deste professor nesta disciplina específica. Abaixo, o que
                a comunidade registrou sobre ele em outras.
              </p>
            )}

            {dados.outrasDaUnidade.length > 0 && (
              <div className="border-t border-zinc-200/70 pt-4 dark:border-zinc-800/70">
                <Resumo
                  titulo={dados.dupla ? "Em todas as disciplinas da dupla" : "Em todas as disciplinas"}
                  ag={dados.personalidade}
                />
                <div className="mt-2">
                  <ListaReviews reviews={dados.outrasDaUnidade} />
                </div>
              </div>
            )}

            {dados.emOutrasFormacoes.length > 0 && (
              <div className="border-t border-zinc-200/70 pt-4 dark:border-zinc-800/70">
                <h4 className="font-display text-sm font-bold text-zinc-800 dark:text-zinc-100">
                  Em turmas com outra composição
                </h4>
                <p className="mb-2 mt-0.5 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                  Estes docentes também lecionaram em turmas de composição diferente. É
                  outro contexto, então essas avaliações não entram na média acima.
                </p>
                <ListaReviews reviews={dados.emOutrasFormacoes} />
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
