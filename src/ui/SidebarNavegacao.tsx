import { useState } from "react";
import { IconBookOpen, IconUser } from "./icons";

export type AbaPrincipal = "situacao" | "planejamento" | "simulador" | "match";

interface SidebarNavegacaoProps {
  abaAtiva: AbaPrincipal;
  onSelecionarAba: (aba: AbaPrincipal) => void;
  temPerfil: boolean;
  qtdTurmasSelecao: number;
  /** curso escolhido no check-in; define quais abas fazem sentido */
  curso?: string;
}

/** Mensagem única para tudo que depende do Histórico Escolar. */
const EXIGE_HISTORICO =
  "Requer o seu Histórico Escolar. Importe o PDF nas Configurações para liberar.";

export function SidebarNavegacao({
  abaAtiva,
  onSelecionarAba,
  temPerfil,
  qtdTurmasSelecao,
  curso,
}: SidebarNavegacaoProps) {
  const [colapsado, setColapsado] = useState(false);
  // O leitor de histórico ainda só entende o formato da BSI: em Eng. Comp. as
  // telas que dependem dele ficam de fora até o parser cobrir o curso.
  const historicoSuportado = curso !== "eng-comp";

  type ItemNav = {
    id: AbaPrincipal;
    rotulo: string;
    subrotulo?: string;
    bloqueado: boolean;
    motivoBloqueio?: string;
    icone: React.ReactNode;
    badge?: string | number;
  };

  const itens: ItemNav[] = [
        {
          id: "situacao",
          rotulo: "Minha Situação",
          subrotulo: "Resumo, Catálogo e Trilhas",
          bloqueado: !temPerfil || !historicoSuportado,
          motivoBloqueio: historicoSuportado
            ? EXIGE_HISTORICO
            : "A leitura do Histórico Escolar de Eng. de Computação ainda está em desenvolvimento.",
          icone: !temPerfil ? <span>🔒</span> : <IconUser className="h-5 w-5 shrink-0" />,
        },
        {
          id: "planejamento",
          rotulo: "Planejamento",
          subrotulo: "Grade & Matérias Abertas",
          bloqueado: false,
          icone: <IconBookOpen className="h-5 w-5 shrink-0" />,
          badge: qtdTurmasSelecao > 0 ? qtdTurmasSelecao : undefined,
        },
        {
          // a projeção parte das horas já cumpridas: sem histórico ela apenas
          // reprojetaria o curso inteiro do zero, o que não informa nada
          id: "simulador",
          rotulo: "Simulador de Formatura",
          subrotulo: "Previsão & Linha do Tempo",
          bloqueado: !temPerfil || !historicoSuportado,
          motivoBloqueio: historicoSuportado
            ? EXIGE_HISTORICO
            : "A projeção depende do histórico, cuja leitura para Eng. de Computação ainda está em desenvolvimento.",
          icone: !temPerfil || !historicoSuportado ? <span>🔒</span> : <span>🎓</span>,
        },
    {
      id: "match",
      rotulo: "Oásis Match",
      subrotulo: "Grade com Amigos",
      bloqueado: false,
      icone: <span>🤝</span>,
      badge: "P2P",
    },
  ];

  return (
    <>
      {/* Sidebar Desktop (visível em telas sm/lg em diante) */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 transition-all duration-300 rounded-3xl border-2 border-zinc-200/90 bg-white/95 shadow-md backdrop-blur-md dark:border-zinc-800/90 dark:bg-zinc-900/95 sticky top-6 self-start ${
          colapsado ? "w-20 p-2.5" : "w-64 p-4"
        }`}
      >
        <div className="flex items-center justify-between gap-2 pb-4 mb-4 border-b border-zinc-200/80 dark:border-zinc-800/80">
          {!colapsado && (
            <span className="font-display text-xs font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 pl-2">
              Navegação
            </span>
          )}
          <button
            type="button"
            onClick={() => setColapsado(!colapsado)}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 hover:bg-utfpr-500 hover:text-zinc-950 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-utfpr-400 dark:hover:text-zinc-950 transition-colors ml-auto cursor-pointer"
            title={colapsado ? "Expandir Menu" : "Colapsar Menu"}
          >
            {colapsado ? "▶" : "◀"}
          </button>
        </div>

        <nav className="flex flex-col gap-2">
          {itens.map((item) => {
            const ativo = abaAtiva === item.id;
            return (
              <button
                key={item.id}
                type="button"
                disabled={item.bloqueado}
                onClick={() => {
                  if (!item.bloqueado) onSelecionarAba(item.id);
                }}
                title={
                  item.bloqueado
                    ? item.motivoBloqueio ??
                      "Carregue seu histórico escolar em PDF nas configurações para acessar esta funcionalidade."
                    : colapsado
                      ? item.rotulo
                      : undefined
                }
                className={`flex items-center gap-3.5 rounded-2xl p-3 text-left font-display transition-all duration-200 cursor-pointer ${
                  item.bloqueado
                    ? "opacity-50 cursor-not-allowed bg-transparent text-zinc-400 dark:text-zinc-600"
                    : ativo
                      ? "bg-zinc-900 text-utfpr-400 shadow-lg ring-2 ring-utfpr-500/40 dark:bg-zinc-800 dark:text-utfpr-400 scale-[1.02]"
                      : "bg-zinc-100/60 text-zinc-700 hover:bg-utfpr-50 hover:text-zinc-950 hover:border-utfpr-300 dark:bg-zinc-800/40 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white border border-transparent"
                } ${colapsado ? "justify-center !p-3.5" : ""}`}
              >
                <div className={`shrink-0 flex items-center justify-center text-xl ${ativo ? "text-utfpr-400" : ""}`}>
                  {item.icone}
                </div>
                {!colapsado && (
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate font-black text-sm">{item.rotulo}</span>
                      {item.badge !== undefined && (
                        <span
                          className={`shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                            ativo
                              ? "bg-utfpr-500 text-zinc-950"
                              : "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                    {item.subrotulo && (
                      <p className="truncate text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {item.subrotulo}
                      </p>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Navegação Mobile (Barra Superior / Bottom Drawer nas Telas < lg) */}
      <nav className="flex lg:hidden flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-zinc-200/90 bg-white/95 p-2 shadow-md backdrop-blur-md dark:border-zinc-800/90 dark:bg-zinc-900/95 mb-6">
        {itens.map((item) => {
          const ativo = abaAtiva === item.id;
          return (
            <button
              key={item.id}
              type="button"
              disabled={item.bloqueado}
              onClick={() => {
                if (!item.bloqueado) onSelecionarAba(item.id);
              }}
              className={`flex flex-1 min-w-[120px] items-center justify-center gap-2 rounded-xl p-2.5 font-display text-xs font-black transition-all cursor-pointer ${
                item.bloqueado
                  ? "opacity-50 cursor-not-allowed text-zinc-400 dark:text-zinc-600"
                  : ativo
                    ? "bg-zinc-900 text-utfpr-400 shadow-md ring-2 ring-utfpr-500/40 dark:bg-zinc-800 dark:text-utfpr-400"
                    : "bg-zinc-100/80 text-zinc-700 hover:bg-utfpr-50 dark:bg-zinc-800/50 dark:text-zinc-300"
              }`}
            >
              <span className="text-base">{item.icone}</span>
              <span className="truncate">{item.rotulo}</span>
              {item.badge !== undefined && (
                <span className="rounded bg-utfpr-500/20 px-1 py-0.2 font-mono text-[9px] text-utfpr-700 dark:text-utfpr-300 font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}
