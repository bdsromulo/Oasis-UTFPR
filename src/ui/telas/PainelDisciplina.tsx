// Painel de avaliações de uma DISCIPLINA (ou de uma turma específica dela).
//
// Existe porque o caminho pelo professor, no planejamento, só alcança o que ainda
// está por cursar. Quem mais avalia é justamente quem já concluiu, e sem este
// painel essas pessoas não conseguiam ler nem o que elas mesmas escreveram.
//
// O recorte também é diferente: lá se pergunta "como é esse professor?", aqui se
// pergunta "como é essa matéria?" — e por isso o resumo de todas as turmas vem
// primeiro, e a quebra por docente depois.
import { useEffect, useMemo } from "react";
import { criarConsulta, agregar } from "../../domain/reviews/acervo";
import { construirRoster } from "../../domain/reviews/professores";
import { criarMapaIdentidade } from "../../domain/motor/identidade";
import { CURSOS } from "../../domain/dadosCurso";
import type { Matriz } from "../../domain/tipos";
import {
  CascaPainel,
  FaixaFiltro,
  ListaReviews,
  PainelDistribuicoes,
  Resumo,
  aplicarFiltro,
  useFiltroNota,
} from "./reviewsComuns";
import acervo from "../../../data/reviews.json";
import type { AcervoReviews, Review } from "../../domain/reviews/tipos";

export interface AlvoPainelDisciplina {
  codigo: string;
  nome: string;
  /**
   * Quando informado, recorta o painel a uma turma: só as avaliações desta
   * unidade docente nesta disciplina. É o que o planejamento abre a partir de um
   * card de turma, onde a pergunta é sobre aquela combinação, não sobre a matéria.
   */
  professorId?: string;
  nomeProfessor?: string;
}

export function PainelDisciplina(props: {
  alvo: AlvoPainelDisciplina | null;
  matriz: Matriz;
  onFechar: () => void;
}) {
  const { alvo, matriz, onFechar } = props;
  const [filtro, setFiltro] = useFiltroNota();

  useEffect(() => {
    if (!alvo) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [alvo, onFechar]);

  // trocar de alvo com filtro ativo mostraria uma lista recortada por um critério
  // escolhido para outra disciplina
  useEffect(() => setFiltro(null), [alvo?.codigo, alvo?.professorId, setFiltro]);

  const dados = useMemo(() => {
    if (!alvo) return null;
    // a identidade é a do curso de quem lê: avaliação escrita sob o código de
    // outra matriz aparece aqui quando é a mesma exigência curricular
    const consulta = criarConsulta(
      (acervo as AcervoReviews).reviews,
      criarMapaIdentidade(matriz),
    );
    const todas = alvo.professorId
      ? consulta.doParProfessorDisciplina(alvo.professorId, alvo.codigo)
      : consulta.daDisciplina(alvo.codigo);
    if (!todas.length) {
      return { todas, porProfessor: [] as { id: string; nome: string; reviews: Review[] }[] };
    }

    const roster = construirRoster(CURSOS);
    const grupos = new Map<string, Review[]>();
    for (const r of todas) {
      const id = r.professorId!;
      if (!grupos.has(id)) grupos.set(id, []);
      grupos.get(id)!.push(r);
    }
    const porProfessor = [...grupos]
      .map(([id, reviews]) => ({ id, nome: roster.porId(id)?.nome ?? id, reviews }))
      // mais avaliados primeiro: é onde a leitura tem mais sustentação
      .sort((a, b) => b.reviews.length - a.reviews.length || a.nome.localeCompare(b.nome, "pt-BR"));

    return { todas, porProfessor };
  }, [alvo, matriz]);

  if (!alvo || !dados) return null;

  const filtradas = aplicarFiltro(dados.todas, filtro);

  return (
    <CascaPainel
      aberto
      titulo={alvo.nome}
      subtitulo={
        alvo.nomeProfessor
          ? `${alvo.codigo} · ${alvo.nomeProfessor}`
          : `${alvo.codigo} · avaliações da comunidade`
      }
      onFechar={onFechar}
    >
      {dados.todas.length === 0 ? (
        <p className="rounded-xl border border-zinc-200/70 bg-white p-3 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800/70 dark:bg-zinc-900 dark:text-zinc-300">
          Ainda não há avaliações {alvo.nomeProfessor ? "desta turma" : "desta disciplina"}. Se
          você já cursou, pode ser a primeira pessoa a avaliar.
        </p>
      ) : (
        <div className="space-y-5">
          <Resumo titulo={alvo.nomeProfessor ?? "Todas as turmas"} ag={agregar(dados.todas)} />

          <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <h4 className="mb-3 font-display text-sm font-bold text-zinc-800 dark:text-zinc-100">
              Como as notas se distribuem
            </h4>
            <PainelDistribuicoes reviews={dados.todas} filtro={filtro} onFiltrar={setFiltro} />
          </div>

          {filtro && (
            <FaixaFiltro filtro={filtro} n={filtradas.length} onLimpar={() => setFiltro(null)} />
          )}

          {/* Com filtro ativo a lista é plana: agrupar por docente uma seleção já
              estreita fragmentaria em seções de uma linha cada. */}
          {filtro || dados.porProfessor.length <= 1 ? (
            <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
              {!filtro && dados.porProfessor.length === 1 && !alvo.nomeProfessor && (
                <h4 className="mb-2 font-display text-sm font-bold text-zinc-800 dark:text-zinc-100">
                  {dados.porProfessor[0].nome}
                </h4>
              )}
              <ListaReviews reviews={filtradas} mostrarCodigo={false} />
              {filtradas.length === 0 && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Nenhuma avaliação com esse critério.
                </p>
              )}
            </div>
          ) : (
            dados.porProfessor.map((g) => (
              <div key={g.id} className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
                <Resumo titulo={g.nome} ag={agregar(g.reviews)} />
                <div className="mt-2">
                  <ListaReviews reviews={g.reviews} mostrarCodigo={false} />
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </CascaPainel>
  );
}
