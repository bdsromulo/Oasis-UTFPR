import { useEffect } from "react";
import {
  IconBookOpen,
  IconHelp,
  IconMoon,
  IconSettings,
  IconStar,
  IconSun,
} from "./icons";

/**
 * Ações secundárias do cabeçalho reunidas num painel de toque, só no celular.
 *
 * No topo elas eram cinco ícones de 32px sem rótulo, ocupando duas linhas —
 * abaixo do mínimo de toque (44px) e, no caso de "Como Usar" e "Sobre", com o
 * rótulo revelado apenas no hover, que no celular simplesmente não existe.
 * Aqui viram linhas grandes e nomeadas, e o topo recupera ~90px de altura.
 */

export type TemaPreferido = "sistema" | "claro" | "escuro";

function LinhaAcao(props: {
  icone: React.ReactNode;
  rotulo: string;
  descricao?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="flex w-full min-h-[56px] cursor-pointer items-center gap-3.5 rounded-2xl border border-zinc-200/80 bg-white px-4 py-3 text-left transition-colors active:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:active:bg-zinc-800"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
        {props.icone}
      </span>
      <span className="min-w-0">
        <span className="block font-display text-sm font-black text-zinc-900 dark:text-zinc-100">
          {props.rotulo}
        </span>
        {props.descricao && (
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">{props.descricao}</span>
        )}
      </span>
    </button>
  );
}

export function PainelMenuMobile(props: {
  aberto: boolean;
  onFechar: () => void;
  temaAtivo: TemaPreferido;
  onMudarTema: (t: "claro" | "escuro") => void;
  /** Configurações só existem depois de entrar na plataforma */
  mostrarConfiguracoes: boolean;
  onAbrirConfiguracoes: () => void;
  onAbrirComoUsar: () => void;
  onAbrirSobre: () => void;
  /**
   * Avaliar depende de histórico importado, que é o que prova ter cursado.
   * No computador este caminho é a estrela do cabeçalho; aqui ele não existia,
   * e quem usa o site pelo celular ficava sem nenhuma porta para avaliar uma
   * matéria antiga — só os convites do último semestre, dentro da tela de
   * situação.
   */
  mostrarAvaliar?: boolean;
  onAvaliar?: () => void;
}) {
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

  const escuroAtivo =
    props.temaAtivo === "escuro" ||
    (props.temaAtivo === "sistema" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const fecharEntao = (fn: () => void) => () => {
    fn();
    onFechar();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex animate-in items-end bg-black/60 fade-in backdrop-blur-xs duration-150 sm:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      onClick={onFechar}
    >
      <div
        className="w-full animate-in rounded-t-3xl border-t border-zinc-200/80 bg-zinc-50 p-4 pb-8 shadow-2xl slide-in-from-bottom duration-200 dark:border-zinc-800 dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        {/* alça, para o painel se ler como gaveta */}
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" />

        <div className="mb-3">
          <span className="mb-2 block font-display text-[11px] font-black uppercase tracking-wider text-zinc-400">
            Aparência
          </span>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: "claro", rotulo: "Claro", icone: <IconSun className="h-4 w-4" /> },
                { id: "escuro", rotulo: "Escuro", icone: <IconMoon className="h-4 w-4" /> },
              ] as const
            ).map((op) => {
              const ativo = op.id === "escuro" ? escuroAtivo : !escuroAtivo;
              return (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => props.onMudarTema(op.id)}
                  className={`flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-2xl border font-display text-sm font-bold transition-colors ${
                    ativo
                      ? "border-utfpr-500 bg-utfpr-500 text-zinc-950"
                      : "border-zinc-200 bg-white text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                  }`}
                >
                  {op.icone}
                  <span>{op.rotulo}</span>
                </button>
              );
            })}
          </div>
        </div>

        <span className="mb-2 block font-display text-[11px] font-black uppercase tracking-wider text-zinc-400">
          Plataforma
        </span>
        <div className="space-y-2">
          {props.mostrarConfiguracoes && (
            <LinhaAcao
              icone={<IconSettings className="h-4 w-4" />}
              rotulo="Configurações"
              descricao="Histórico, curso, semestre e privacidade"
              onClick={fecharEntao(props.onAbrirConfiguracoes)}
            />
          )}
          {props.mostrarAvaliar && props.onAvaliar && (
            <LinhaAcao
              icone={<IconStar className="h-4 w-4" />}
              rotulo="Avaliar uma disciplina"
              descricao="Conte como foi qualquer matéria que você já concluiu"
              onClick={fecharEntao(props.onAvaliar)}
            />
          )}
          <LinhaAcao
            icone={<IconHelp className="h-4 w-4" />}
            rotulo="Como usar o site"
            descricao="O que cada página faz e de onde vêm os dados"
            onClick={fecharEntao(props.onAbrirComoUsar)}
          />
          <LinhaAcao
            icone={<IconBookOpen className="h-4 w-4" />}
            rotulo="Sobre o projeto"
            descricao="Proposta, dados locais e créditos"
            onClick={fecharEntao(props.onAbrirSobre)}
          />
        </div>

        <button
          type="button"
          onClick={onFechar}
          className="mt-4 min-h-[48px] w-full cursor-pointer rounded-2xl bg-zinc-200 font-display text-sm font-black text-zinc-700 transition-colors active:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-200"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
