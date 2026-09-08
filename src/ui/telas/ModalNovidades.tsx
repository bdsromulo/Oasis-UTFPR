import { useEffect, type ReactNode } from "react";
import { Botao } from "../componentes";
import {
  IconCalendar,
  IconCheck,
  IconCheckCircle,
  IconDownload,
  IconFileText,
  IconStar,
  IconWarning,
} from "../icons";
import { NOVIDADES, type IconeNovidade } from "../novidades";

/**
 * Destaques da versão atual. A leitura é lembrada apenas depois de fechar o
 * modal; o conteúdo em si vem de `ui/novidades.ts`, junto da versão que dispara
 * a exibição.
 */

const ICONES: Record<IconeNovidade, (p: { className?: string }) => ReactNode> = {
  aviso: IconWarning,
  calendario: IconCalendar,
  check: IconCheckCircle,
  download: IconDownload,
  estrela: IconStar,
  arquivo: IconFileText,
};

export function ModalNovidades(props: {
  aberto: boolean;
  onFechar: () => void;
  onAvaliar?: () => void;
}) {
  const { aberto, onFechar, onAvaliar } = props;

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
          <h2 className="font-display text-3xl font-black tracking-[0.14em] text-zinc-950 uppercase dark:text-white">
            Novidades
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            O Oásis virou de semestre: já dá para planejar 2027.1, contar as matérias que você
            está cursando e acompanhar os avisos sem perder a projeção de vista.
          </p>
        </div>

        <div className="space-y-4 p-5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">
          {NOVIDADES.map((item) => {
            const Icone = ICONES[item.icone];
            return (
              <section
                key={item.id}
                data-novidade={item.id}
                className={`rounded-2xl border p-4 ${
                  item.destaque
                    ? "border-utfpr-500/40 bg-utfpr-500/10 dark:bg-utfpr-500/5"
                    : "border-zinc-200 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-800/30"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icone className="h-5 w-5 shrink-0 text-utfpr-600 dark:text-utfpr-400" />
                  <h3 className="font-display text-base font-black text-zinc-900 dark:text-zinc-100">
                    {item.titulo}
                  </h3>
                </div>
                <p className="mt-2 text-[13px] text-zinc-600 dark:text-zinc-300">{item.resumo}</p>
                {item.detalhes && item.detalhes.length > 0 && (
                  <ul className="mt-3 space-y-1.5 text-[13px] text-zinc-600 dark:text-zinc-300">
                    {item.detalhes.map((d) => (
                      <li key={d} className="flex gap-2">
                        <IconCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-utfpr-600" />
                        {d}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-200 p-4 dark:border-zinc-800">
          <Botao variante="sutil" onClick={onFechar}>
            Fechar
          </Botao>
          {/* Só aparece para quem tem avaliações habilitadas: o modal em si não
              depende disso, e por isso o botão do cabeçalho também não depende. */}
          {onAvaliar && (
            <Botao
              variante="primario"
              onClick={() => {
                onFechar();
                onAvaliar();
              }}
            >
              <IconStar className="h-4 w-4 shrink-0" />
              Avaliar uma disciplina
            </Botao>
          )}
        </div>
      </div>
    </div>
  );
}
