// Seletor de disciplina para avaliar, alcançável pelo menu do topo (RF15).
//
// Diferente da seção da tela de progresso, que convida a avaliar só o último
// semestre (RF16), aqui aparece TODA disciplina concluída, agrupada por semestre.
// É o caminho para quem quer avaliar uma matéria antiga sem esperar convite.
import { useEffect, useMemo, useState } from "react";
import { Botao } from "../componentes";
import { ModalEnvioForms } from "./ModalEnvioForms";
import { podeSerAvaliada, type AlvoAvaliacao } from "../../domain/reviews/forms";
import { nomeDeEletiva } from "../../domain/eletivas";
import { codigosJaAvaliadosPor } from "../../domain/reviews/acervo";
import { criarMapaIdentidade } from "../../domain/motor/identidade";
import type { AcervoReviews } from "../../domain/reviews/tipos";
import acervoReviews from "../../../data/reviews.json";
import type { Matriz, PerfilAluno } from "../../domain/tipos";

export function ModalMinhasAvaliacoes(props: {
  aberto: boolean;
  perfil: PerfilAluno | null;
  matriz: Matriz;
  onFechar: () => void;
}) {
  const { aberto, perfil, matriz, onFechar } = props;
  const [avaliando, setAvaliando] = useState<AlvoAvaliacao | null>(null);
  const [busca, setBusca] = useState("");

  /**
   * O que esta pessoa já avaliou, casado pelo nome público do autor.
   *
   * Orienta a interface e não a autoriza: homônimo colide, e quem editou o nome
   * no formulário não casa. Nos dois casos o erro é para o lado seguro — no
   * máximo convida a avaliar de novo.
   */
  const jaAvaliadas = useMemo(() => {
    if (!perfil?.nome) return new Set<string>();
    return codigosJaAvaliadosPor(
      (acervoReviews as AcervoReviews).reviews,
      perfil.nome,
      criarMapaIdentidade(matriz),
    );
  }, [perfil?.nome, matriz]);

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => {
      // com o formulário aberto por cima, o Esc é dele
      if (e.key === "Escape" && !avaliando) onFechar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto, avaliando, onFechar]);

  /** Concluídas agrupadas por semestre, do mais recente para o mais antigo. */
  const porSemestre = useMemo(() => {
    if (!perfil) return [];
    const avaliaveis = perfil.cursadas.filter(podeSerAvaliada);
    const mapa = new Map<string, AlvoAvaliacao[]>();
    for (const c of avaliaveis) {
      const sem = `${c.ano}/${c.semestre}`;
      const nome =
        matriz.disciplinas.find((d) => d.codigo === c.codigo)?.nome ??
        nomeDeEletiva(c.codigo) ??
        c.codigo;
      if (!mapa.has(sem)) mapa.set(sem, []);
      mapa.get(sem)!.push({ codigo: c.codigo, nome, semestre: sem, situacao: "aprovado" });
    }
    const termo = busca.trim().toLowerCase();
    return [...mapa]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([semestre, itens]) => ({
        semestre,
        itens: itens
          .filter((i) => !termo || `${i.codigo} ${i.nome}`.toLowerCase().includes(termo))
          .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
      }))
      .filter((g) => g.itens.length > 0);
  }, [perfil, matriz, busca]);

  if (!aberto) return null;

  const total = porSemestre.reduce((s, g) => s + g.itens.length, 0);

  return (
    <>
      <div
        className="fixed inset-0 z-40 flex animate-in items-center justify-center bg-black/60 p-4 fade-in backdrop-blur-xs duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-minhas-avaliacoes"
        onClick={onFechar}
      >
        <div
          className="flex max-h-[85vh] w-full max-w-lg animate-in flex-col overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-2xl zoom-in-95 duration-150 dark:border-zinc-800/80 dark:bg-zinc-900"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-zinc-200/80 p-5 dark:border-zinc-800/80">
            <h3
              id="titulo-minhas-avaliacoes"
              className="font-display text-lg font-black tracking-tight text-zinc-900 dark:text-white"
            >
              Avaliar uma disciplina
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Sua experiência ajuda quem vai escolher turma. A avaliação é pública e
              assinada com o seu nome; seu RA não é publicado.
            </p>
            {/* Dito aqui e repetido na hora de abrir o formulário: quem lê rápido
                pula um dos dois, e o campo editado só cobra o preço dias depois. */}
            <p className="mt-1.5 text-xs font-semibold leading-relaxed text-amber-700 dark:text-amber-400">
              O formulário abre com disciplina, semestre, professor e seu nome já
              preenchidos. Não altere esses campos.
            </p>
            {!perfil ? null : (
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por código ou nome…"
                className="mt-3 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
              />
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {!perfil ? (
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                Carregue seu histórico para avaliar as disciplinas que já cursou.
              </p>
            ) : total === 0 ? (
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                {busca.trim()
                  ? "Nenhuma disciplina concluída corresponde à busca."
                  : "Não encontrei disciplinas concluídas no seu histórico."}
              </p>
            ) : (
              <div className="space-y-4">
                {porSemestre.map((grupo) => (
                  <div key={grupo.semestre}>
                    <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      {grupo.semestre}
                    </div>
                    <div className="space-y-1.5">
                      {grupo.itens.map((d) => (
                        <div
                          key={`${d.codigo}-${d.semestre}`}
                          className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200/70 px-3 py-2 dark:border-zinc-800/70"
                        >
                          {/* Duas linhas fixas, código acima e nome abaixo: com o
                              código inline o item quebrava em uma ou duas linhas
                              conforme o comprimento do nome, e a lista ficava
                              serrilhada. O `truncate` precisa de bloco para valer —
                              inline ele é ignorado e o nome longo passava por baixo
                              do botão. */}
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-bold text-zinc-500 dark:text-zinc-400">
                                {d.codigo}
                              </span>
                            </span>
                            <span className="block truncate text-sm text-zinc-700 dark:text-zinc-200">
                              {d.nome}
                            </span>
                          </span>
                          {jaAvaliadas.has(d.codigo) ? (
                            <span
                              title="Você já avaliou esta disciplina. Para mudar, edite sua resposta no formulário."
                              className="shrink-0 cursor-help rounded-lg bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400"
                            >
                              ✓ avaliada
                            </span>
                          ) : (
                          <Botao
                            onClick={() => setAvaliando(d)}
                            variante="sutil"
                            classe="shrink-0 !px-3 !py-1.5 !text-xs"
                          >
                            Avaliar
                          </Botao>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end border-t border-zinc-200/80 p-4 dark:border-zinc-800/80">
            <Botao onClick={onFechar} variante="sutil">
              Fechar
            </Botao>
          </div>
        </div>
      </div>

      {perfil && (
        <ModalEnvioForms
          alvo={avaliando}
          autor={perfil.nome}
          onFechar={() => setAvaliando(null)}
        />
      )}
    </>
  );
}
