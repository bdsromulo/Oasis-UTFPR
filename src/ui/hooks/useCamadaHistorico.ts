import { useEffect, useRef } from "react";
import { pilhaDeCamadas } from "./pilhaCamadas";

/**
 * Hook para interceptar o botão voltar do Android e usá-lo para fechar
 * camadas sobrepostas (como Modais, Drawers ou Telas Auxiliares) sem
 * sair da aplicação.
 *
 * Quem está no topo é decidido por `pilhaDeCamadas`, e não por `history.state`.
 * O motivo está documentado lá: o WebKit reflete o `pushState` só na volta
 * seguinte do event loop, e a leitura atrasada fazia o iPhone fechar a camada
 * recém aberta.
 *
 * @param aberto Se a camada está atualmente visível/aberta.
 * @param fechar Função para fechar a camada programaticamente.
 * @param id Identificador único da camada.
 */
export function useCamadaHistorico(aberto: boolean, fechar: () => void, id: string) {
  const fecharRef = useRef(fechar);
  fecharRef.current = fechar;

  useEffect(() => {
    if (!aberto) return;

    pilhaDeCamadas.abrir(id);

    const handler = () => {
      // Todas as camadas abertas escutam o mesmo evento; só a de cima responde,
      // senão um único toque no voltar fecharia a pilha inteira.
      if (!pilhaDeCamadas.ehTopo(id)) return;
      pilhaDeCamadas.removerSemVoltar(id);
      fecharRef.current();
    };

    window.addEventListener("popstate", handler);

    return () => {
      window.removeEventListener("popstate", handler);

      // Adiado para depois do commit: quando esta camada fecha no mesmo evento
      // em que OUTRA abre — o menu do celular fechando e "Sobre" abrindo —, o
      // React roda esta limpeza ANTES do efeito da camada nova. Sem o adiamento,
      // a pilha ainda não conhece a camada de cima, esta se veria no topo e
      // desfaria uma entrada de histórico que passou a ser da outra.
      queueMicrotask(() => pilhaDeCamadas.fechar(id));
    };
  }, [aberto, id]);
}
