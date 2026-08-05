import { useEffect } from "react";
import { Botao } from "../componentes";
import { IconCheck, IconDownload, IconFileText, IconStar } from "../icons";

/** Destaques da versão atual. A leitura é lembrada apenas depois de fechar o modal. */
export function ModalNovidades(props: {
  aberto: boolean;
  onFechar: () => void;
  onVerAvaliacoes: () => void;
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
        className="max-h-[88vh] w-full overflow-y-auto rounded-t-3xl border-zinc-200 bg-white shadow-2xl sm:max-w-xl sm:rounded-3xl sm:border dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-zinc-200 bg-gradient-to-br from-utfpr-500/25 via-utfpr-500/10 to-transparent p-6 dark:border-zinc-800">
          <h2 className="font-display text-3xl font-black uppercase tracking-[0.14em] text-zinc-950 dark:text-white">
            Novidades
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            Avaliações da comunidade, savefile portátil e novos cursos atendidos pelo Oásis.
          </p>
        </div>

        <div className="space-y-4 p-5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">
          <section className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-800/30">
            <div className="flex items-center gap-2">
              <IconStar className="h-5 w-5 text-utfpr-600 dark:text-utfpr-400" />
              <h3 className="font-display text-base font-black text-zinc-900 dark:text-zinc-100">
                Avaliações da Comunidade
              </h3>
            </div>
            <p className="mt-2 text-[13px] text-zinc-600 dark:text-zinc-300">
              Veja relatos de quem já cursou a matéria antes de escolher a turma. Nas listas do
              Planejamento, o nome do professor e o botão de avaliações abrem a experiência da
              comunidade naquela disciplina.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-utfpr-500/50 bg-utfpr-500/10 px-2.5 py-1 text-xs font-bold text-utfpr-700 shadow-2xs dark:border-utfpr-500/40 dark:text-utfpr-300">
                <span aria-hidden className="text-sm leading-none">★</span>
                <span>3 avaliações</span>
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                procure por um botão como este ao lado da turma
              </span>
            </div>
            {onAvaliar && (
              <p className="mt-3 text-[13px] text-zinc-600 dark:text-zinc-300">
                Para contribuir, use <strong>Avaliar uma disciplina</strong> no topo da página
                ou no Menu do celular. A lista traz as matérias aprovadas e as concluídas por
                consignação; reprovações não entram.
              </p>
            )}
            <ul className="mt-3 space-y-1.5 text-[13px] text-zinc-600 dark:text-zinc-300">
              <li className="flex gap-2"><IconCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-utfpr-600" />Quatro notas independentes: personalidade, didática, dificuldade e carga. Dificuldade alta não significa aula ruim.</li>
              <li className="flex gap-2"><IconCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-utfpr-600" />Uma avaliação por pessoa em cada disciplina; reenviar atualiza a anterior.</li>
              <li className="flex gap-2"><IconCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-utfpr-600" />Com poucas respostas, os relatos aparecem sem transformar uma opinião isolada em média.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-800/30">
            <div className="flex items-center gap-2">
              <IconFileText className="h-5 w-5 text-utfpr-600 dark:text-utfpr-400" />
              <h3 className="font-display text-base font-black text-zinc-900 dark:text-zinc-100">
                Matriz 806 de Sistemas de Informação
              </h3>
            </div>
            <p className="mt-2 text-[13px] text-zinc-600 dark:text-zinc-300">
              O Oásis agora reconhece também a matriz 806. O histórico identifica a matriz certa e
              aplica as regras curriculares correspondentes, sem confundir seu progresso com a matriz 981.
            </p>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-800/30">
            <div className="flex items-center gap-2">
              <IconFileText className="h-5 w-5 text-utfpr-600 dark:text-utfpr-400" />
              <h3 className="font-display text-base font-black text-zinc-900 dark:text-zinc-100">
                Engenharia de Controle e Automação — matriz 978
              </h3>
            </div>
            <p className="mt-2 text-[13px] text-zinc-600 dark:text-zinc-300">
              O curso passa a funcionar de ponta a ponta: leitura do histórico, situação curricular,
              catálogo, planejamento, grades e simulador. As cinco trilhas de formação são conferidas
              separadamente, inclusive as quatro subáreas da trilha de Formação Complementar, e o
              Planejamento usa as ofertas próprias de 2025/2, 2026/1 e 2026/2.
            </p>
          </section>

          <section className="rounded-2xl border border-utfpr-500/40 bg-utfpr-500/10 p-4 dark:bg-utfpr-500/5">
            <div className="flex items-center gap-2">
              <IconDownload className="h-5 w-5 text-utfpr-700 dark:text-utfpr-300" />
              <h3 className="font-display text-base font-black text-zinc-900 dark:text-zinc-100">
                Savefile: leve seu planejamento
              </h3>
            </div>
            <p className="mt-2 text-[13px] text-zinc-700 dark:text-zinc-200">
              Em Configurações, baixe um arquivo com o perfil que o navegador já extraiu do seu
              histórico e as grades que você montou. Depois, importe esse arquivo em outro navegador.
              O PDF original não é salvo nem enviado.
            </p>
          </section>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-200 p-4 dark:border-zinc-800">
          <Botao variante="sutil" onClick={onFechar}>Fechar</Botao>
          {onAvaliar && (
            <Botao variante="neutro" onClick={() => { onFechar(); onAvaliar(); }}>
              <IconStar className="h-4 w-4 shrink-0" />
              Avaliar uma disciplina
            </Botao>
          )}
          <Botao variante="primario" onClick={() => { onFechar(); onVerAvaliacoes(); }}>
            Ver avaliações
          </Botao>
        </div>
      </div>
    </div>
  );
}
