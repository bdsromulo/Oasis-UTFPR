import { useEffect } from "react";
import { IconX } from "../icons";

/**
 * Passo a passo com print do Portal do Aluno, para quem nunca gerou o PDF do
 * Histórico Completo. Vive fora do "Como Usar o Site" de propósito: esse é
 * material institucional sobre a plataforma, e este é um tutorial pontual de
 * uma tela da UTFPR — o aluno precisa dele uma vez, no momento exato de subir
 * o arquivo, não numa página de documentação separada.
 */

interface Passo {
  imagem: string;
  titulo: string;
  descricao: string;
}

// import.meta.env.BASE_URL, e não um caminho relativo: o caminho relativo
// resolve contra a URL atual da página, e sob rota aninhada (React Router,
// hash routing) isso quebra. BASE_URL é o `base` do próprio build do Vite.
const BASE = import.meta.env.BASE_URL;

const PASSOS: Passo[] = [
  {
    imagem: `${BASE}ajuda/como-gerar-historico-1.png`,
    titulo: "Abra a aba Histórico Completo",
    descricao: "No Portal do Aluno, acesse o menu e clique em \"Histórico Completo\".",
  },
  {
    imagem: `${BASE}ajuda/como-gerar-historico-2.png`,
    titulo: "Clique em Imprimir",
    descricao: "Com a página do histórico aberta, use o botão \"Imprimir\" no topo.",
  },
  {
    imagem: `${BASE}ajuda/como-gerar-historico-3.png`,
    titulo: "Salve como PDF em papel A3",
    descricao:
      "Na janela de impressão, escolha \"Salvar como PDF\" e, em \"Mais definições\", troque o tamanho do papel para A3 — sem isso o histórico pode cortar informação nas bordas. Esse arquivo salvo é o que você envia aqui na plataforma.",
  },
];

export function ModalComoGerarHistorico(props: { aberto: boolean; onFechar: () => void }) {
  const { aberto, onFechar } = props;

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
      className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 fade-in backdrop-blur-xs duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-como-gerar-historico"
      onClick={onFechar}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-2xl animate-in zoom-in-95 duration-150 dark:border-zinc-800/80 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200/80 px-6 py-5 dark:border-zinc-800/80">
          <div>
            <h2
              id="titulo-como-gerar-historico"
              className="font-display text-lg font-black tracking-tight text-zinc-900 dark:text-white"
            >
              Como gerar seu Histórico Completo
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Três passos no Portal do Aluno para chegar ao PDF que a plataforma lê.
            </p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-900 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-white"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <ol className="space-y-6">
            {PASSOS.map((passo, i) => (
              <li key={passo.imagem}>
                <div className="mb-2.5 flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-utfpr-500 font-mono text-xs font-black text-zinc-950">
                    {i + 1}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <h3 className="font-display text-sm font-black tracking-tight text-zinc-900 dark:text-white">
                      {passo.titulo}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {passo.descricao}
                    </p>
                  </div>
                </div>
                <img
                  src={passo.imagem}
                  alt={passo.titulo}
                  className="ml-10 w-[calc(100%-2.5rem)] rounded-xl border border-zinc-200/80 shadow-sm dark:border-zinc-700/80"
                />
              </li>
            ))}
          </ol>
        </div>

        <div className="border-t border-zinc-200/80 px-6 py-4 dark:border-zinc-800/80">
          <button
            type="button"
            onClick={onFechar}
            className="min-h-11 w-full cursor-pointer rounded-xl bg-utfpr-500 py-2.5 font-display text-sm font-black text-zinc-950 shadow-sm transition-all hover:bg-utfpr-400 active:scale-[0.98]"
          >
            Entendi, voltar para o envio
          </button>
        </div>
      </div>
    </div>
  );
}
