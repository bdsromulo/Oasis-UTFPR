import { useEffect, useState } from "react";

/**
 * Menu de navegação entre as seções de uma página longa (Como Usar, Sobre).
 *
 * Fica fixo no topo enquanto a pessoa rola e marca em qual seção ela está, para
 * o menu servir de mapa e não só de atalho. A âncora é rolada com um respiro no
 * topo, senão o título encosta na barra e some atrás dela.
 */

export interface ItemSecao {
  id: string;
  numero: string;
  titulo: string;
}

export function irParaSecao(id: string) {
  const alvo = document.getElementById(id);
  if (!alvo) return;
  const y = alvo.getBoundingClientRect().top + window.scrollY - 88;
  // quem pediu menos animação no sistema recebe o salto direto
  const menosMovimento = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: y, behavior: menosMovimento ? "auto" : "smooth" });
}

export function MenuSecoes(props: { secoes: ItemSecao[]; rotulo?: string }) {
  const { secoes } = props;
  const [ativa, setAtiva] = useState<string | null>(secoes[0]?.id ?? null);

  useEffect(() => {
    const alvos = secoes
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (alvos.length === 0) return;

    const observador = new IntersectionObserver(
      (entradas) => {
        // a seção ativa é a mais alta entre as que estão visíveis
        const visiveis = entradas
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visiveis[0]) setAtiva(visiveis[0].target.id);
      },
      // a faixa começa abaixo da barra e termina no meio da tela: assim a seção
      // só vira "ativa" quando de fato ocupa a leitura
      { rootMargin: "-96px 0px -55% 0px", threshold: 0 },
    );
    alvos.forEach((el) => observador.observe(el));
    return () => observador.disconnect();
  }, [secoes]);

  return (
    <nav
      aria-label={props.rotulo ?? "Seções desta página"}
      className="sticky top-2 z-20 rounded-2xl border border-zinc-200/90 bg-white/85 p-2 shadow-xs backdrop-blur-md dark:border-zinc-800/90 dark:bg-zinc-900/85"
    >
      <ul className="flex flex-wrap items-center gap-1.5">
        <li className="hidden px-2 font-display text-[11px] font-black uppercase tracking-wider text-zinc-400 sm:block">
          Ir para
        </li>
        {secoes.map((s) => {
          const atual = ativa === s.id;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => irParaSecao(s.id)}
                aria-current={atual ? "true" : undefined}
                className={`flex cursor-pointer items-center gap-1.5 rounded-xl px-2.5 py-1.5 font-display text-xs font-bold transition-colors ${
                  atual
                    ? "bg-zinc-900 text-utfpr-400 dark:bg-zinc-800"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/70"
                }`}
              >
                <span className={`font-mono ${atual ? "text-utfpr-400" : "text-zinc-400"}`}>
                  {s.numero}
                </span>
                <span>{s.titulo}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
