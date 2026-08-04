// Painel de avaliações de uma DISCIPLINA, alcançável pelo catálogo.
//
// Existe porque o outro caminho de leitura — clicar no professor, no planejamento
// — só alcança o que ainda está por cursar. Quem mais avalia é justamente quem já
// concluiu, e sem este painel essas pessoas não conseguiam ler o que escreveram.
//
// O recorte também é diferente: lá se pergunta "como é esse professor?", aqui se
// pergunta "como é essa matéria, com quem quer que a dê?" — e por isso o resumo
// geral vem primeiro, e a quebra por docente depois.
import { useEffect, useMemo } from "react";
import { criarConsulta, agregar } from "../../domain/reviews/acervo";
import { construirRoster } from "../../domain/reviews/professores";
import { criarMapaIdentidade } from "../../domain/motor/identidade";
import { CURSOS } from "../../domain/dadosCurso";
import type { Matriz } from "../../domain/tipos";
import { ListaReviews, Resumo } from "./reviewsComuns";
import acervo from "../../../data/reviews.json";
import type { AcervoReviews } from "../../domain/reviews/tipos";

export interface AlvoPainelDisciplina {
  codigo: string;
  nome: string;
}

export function PainelDisciplina(props: {
  alvo: AlvoPainelDisciplina | null;
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
    // a identidade é a do curso de quem lê: avaliação escrita sob o código de
    // outra matriz aparece aqui quando é a mesma exigência curricular
    const mapa = criarMapaIdentidade(matriz);
    const consulta = criarConsulta((acervo as AcervoReviews).reviews, mapa);
    const todas = consulta.daDisciplina(alvo.codigo);
    if (!todas.length) return { todas, porProfessor: [] };

    const roster = construirRoster(CURSOS);
    const grupos = new Map<string, typeof todas>();
    for (const r of todas) {
      const id = r.professorId!;
      if (!grupos.has(id)) grupos.set(id, []);
      grupos.get(id)!.push(r);
    }
    const porProfessor = [...grupos]
      .map(([id, reviews]) => ({
        id,
        nome: roster.porId(id)?.nome ?? id,
        reviews,
      }))
      // mais avaliados primeiro: é onde a leitura tem mais sustentação
      .sort((a, b) => b.reviews.length - a.reviews.length || a.nome.localeCompare(b.nome, "pt-BR"));

    return { todas, porProfessor };
  }, [alvo, matriz]);

  if (!alvo || !dados) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onFechar}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-zinc-200 bg-zinc-50 p-5 shadow-xl sm:rounded-2xl dark:border-zinc-800 dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          {alvo.nome}
        </h2>
        <p className="mt-0.5 font-mono text-xs text-zinc-500 dark:text-zinc-400">
          {alvo.codigo} · avaliações da comunidade
        </p>

        {dados.todas.length === 0 ? (
          <p className="mt-4 rounded-xl border border-zinc-200/70 bg-white p-3 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800/70 dark:bg-zinc-900 dark:text-zinc-300">
            Ainda não há avaliações desta disciplina. Se você já a cursou, pode ser a
            primeira pessoa a avaliar.
          </p>
        ) : (
          <div className="mt-4 space-y-5">
            <Resumo titulo="Todas as turmas" ag={agregar(dados.todas)} />

            {/* A quebra por docente só aparece quando há mais de um: com um só, o
                resumo geral já é o dele, e repetir sugeriria comparação onde não há. */}
            {dados.porProfessor.length > 1 &&
              dados.porProfessor.map((g) => (
                <div key={g.id} className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
                  <Resumo titulo={g.nome} ag={agregar(g.reviews)} />
                  <div className="mt-2">
                    <ListaReviews reviews={g.reviews} mostrarCodigo={false} />
                  </div>
                </div>
              ))}

            {dados.porProfessor.length === 1 && (
              <div>
                <h4 className="mb-2 font-display text-sm font-bold text-zinc-800 dark:text-zinc-100">
                  {dados.porProfessor[0].nome}
                </h4>
                <ListaReviews reviews={dados.todas} mostrarCodigo={false} />
              </div>
            )}
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button
            onClick={onFechar}
            className="rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
