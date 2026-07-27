import { useEffect, useRef } from "react";

/**
 * Hook para interceptar o botão voltar do Android e usá-lo para fechar
 * camadas sobrepostas (como Modais, Drawers ou Telas Auxiliares) sem
 * sair da aplicação.
 *
 * @param aberto Se a camada está atualmente visível/aberta.
 * @param fechar Função para fechar a camada programaticamente.
 * @param id Identificador único da camada para ser gravado no history.state.
 */
export function useCamadaHistorico(aberto: boolean, fechar: () => void, id: string) {
  const fecharRef = useRef(fechar);
  fecharRef.current = fechar;

  useEffect(() => {
    if (!aberto) return;

    // Empilha a camada atual no histórico do navegador
    window.history.pushState({ camada: id }, "");

    const handler = () => {
      // O usuário pressionou o botão voltar ou chamou history.back()
      fecharRef.current();
    };

    window.addEventListener("popstate", handler);

    return () => {
      window.removeEventListener("popstate", handler);

      // Se o componente foi desmontado ou fechado por meio de um botão "X",
      // precisamos remover o estado do topo da pilha de forma silenciosa.
      if (window.history.state?.camada === id) {
        window.history.back();
      }
    };
  }, [aberto, id]);
}
