// Apresentação do sistema de avaliações da comunidade.
//
// Existe porque a feature é discreta por natureza: ela mora em botões dentro de
// listas, e quem não sabe que existe não tem por que clicar. O modal é o único
// lugar do produto que explica a régua antes de a pessoa topar com um número.
//
// Não é um changelog. Quando houver uma segunda novidade, este arquivo vira uma
// lista de itens — não um texto maior sobre avaliações.
import { useEffect } from "react";
import { Botao } from "../componentes";
import { IconStar, IconCheck } from "../icons";

export function ModalNovidades(props: {
  aberto: boolean;
  onFechar: () => void;
  /** leva ao Planejamento, onde os botões de avaliação aparecem por turma */
  onVerAvaliacoes: () => void;
  /** abre o seletor de disciplina para avaliar; ausente sem histórico importado */
  onAvaliar?: () => void;
}) {
  const { aberto, onFechar, onVerAvaliacoes, onAvaliar } = props;

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto, onFechar]);

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Novidades"
      onClick={onFechar}
    >
      <div
        className="max-h-[88vh] w-full overflow-y-auto rounded-t-3xl border-zinc-200 bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl sm:border dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-zinc-200 bg-gradient-to-r from-utfpr-500/15 via-utfpr-500/5 to-transparent p-5 dark:border-zinc-800">
          <span className="font-display text-[11px] font-black uppercase tracking-wider text-utfpr-700 dark:text-utfpr-400">
            Novidades
          </span>
          <h2 className="mt-1 font-display text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
            Avaliações da comunidade
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            Quem já cursou uma matéria conta como ela foi. Você lê antes de escolher a turma.
          </p>
        </div>

        <div className="space-y-4 p-5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">
          <div>
            <h3 className="font-display text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Onde encontrar
            </h3>
            <p className="mt-1 text-[13px] text-zinc-600 dark:text-zinc-300">
              Nas listas de turmas do Planejamento e do Posso Cursar, cada linha ganhou um botão
              ao lado de "Status". Ele abre os relatos daquela turma, com aquele professor.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-utfpr-500/50 bg-utfpr-500/10 px-2.5 py-1 text-xs font-bold text-utfpr-700 shadow-2xs dark:border-utfpr-500/40 dark:text-utfpr-300">
                <span aria-hidden className="text-sm leading-none">
                  ★
                </span>
                <span>3 avaliações</span>
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                é este botão que você procura
              </span>
            </div>
          </div>

          {/* Só quando o botão existe de fato: ele depende de histórico
              importado, e apontar para um canto vazio da tela é pior que não
              apontar. */}
          {onAvaliar && (
            <div>
              <h3 className="font-display text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Onde avaliar
              </h3>
              <p className="mt-1 text-[13px] text-zinc-600 dark:text-zinc-300">
                A estrela abre a lista das disciplinas que você já concluiu. Dá para avaliar
                qualquer uma delas, não só as do último semestre.
              </p>
              {/* O caminho muda com a largura da tela, e citar só o do computador
                  mandaria quem está no celular procurar um canto vazio. */}
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  <IconStar className="h-4 w-4" />
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  <span className="hidden sm:inline">
                    no topo da página, à direita, ao lado do botão Novidades
                  </span>
                  <span className="sm:hidden">no topo da página, dentro do Menu</span>
                </span>
              </div>
            </div>
          )}

          <div>
            <h3 className="font-display text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Como ler as notas
            </h3>
            <p className="mt-1 text-[13px] text-zinc-600 dark:text-zinc-300">
              São quatro perguntas separadas: personalidade, didática, dificuldade e carga de
              trabalho. Dificuldade e carga altas não são defeito — uma matéria pode ser difícil
              e muito bem dada. Cada relato também diz como a nota é cobrada, se por provas,
              trabalhos ou os dois.
            </p>
          </div>

          <div>
            <h3 className="font-display text-sm font-bold text-zinc-900 dark:text-zinc-100">
              O que impede a média de mentir
            </h3>
            <ul className="mt-1 space-y-1 text-[13px] text-zinc-600 dark:text-zinc-300">
              <li className="flex gap-2">
                <IconCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-utfpr-600 dark:text-utfpr-400" />
                <span>
                  Com poucas respostas a média não aparece. Uma nota isolada viraria "5,0" e soaria
                  como consenso.
                </span>
              </li>
              <li className="flex gap-2">
                <IconCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-utfpr-600 dark:text-utfpr-400" />
                <span>
                  Uma avaliação por pessoa em cada matéria. Reenviar corrige a anterior em vez de
                  pesar em dobro.
                </span>
              </li>
              <li className="flex gap-2">
                <IconCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-utfpr-600 dark:text-utfpr-400" />
                <span>
                  Só entra quem cursou, e o que é publicado passa por checagem antes de ir ao ar.
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-200 p-4 dark:border-zinc-800">
          <Botao variante="sutil" onClick={onFechar}>
            Fechar
          </Botao>
          {onAvaliar && (
            <Botao
              variante="neutro"
              onClick={() => {
                onFechar();
                onAvaliar();
              }}
            >
              <IconStar className="h-4 w-4 shrink-0" />
              <span>Avaliar uma disciplina</span>
            </Botao>
          )}
          <Botao
            variante="primario"
            onClick={() => {
              onFechar();
              onVerAvaliacoes();
            }}
          >
            Ver avaliações
          </Botao>
        </div>
      </div>
    </div>
  );
}
