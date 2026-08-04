// Pilha das camadas sobrepostas abertas (modais, gavetas, telas auxiliares).
//
// Existe porque a versão anterior perguntava ao navegador, via `history.state`,
// qual camada estava no topo — e o WebKit não reflete o `pushState` na mesma
// volta do event loop. No iPhone, Chrome e Safari, a leitura devolvia a camada
// ANTERIOR, o código concluía que a entrada do histórico ainda era dela e
// chamava `history.back()`. O `popstate` resultante fechava a camada recém
// aberta: o menu sumia e a tela escolhida não aparecia.
//
// A ordem das camadas é informação nossa, não do navegador. Guardada aqui, a
// decisão fica síncrona e igual em qualquer motor. O histórico continua sendo
// usado para o que só ele faz: receber o botão voltar do Android.

/** O que a pilha precisa do histórico do navegador. Injetado para poder testar. */
export interface AcoesHistorico {
  empilhar(id: string): void;
  voltar(): void;
}

export interface PilhaCamadas {
  abrir(id: string): void;
  /**
   * Fecha por ação da interface (botão X, Esc, troca de camada).
   *
   * Só desfaz a entrada do histórico quando a camada era o topo. Fechando uma
   * camada que já foi coberta por outra, a entrada do topo pertence à de cima —
   * dar `voltar()` ali fecharia a camada errada, que é o bug do iOS.
   */
  fechar(id: string): void;
  /** O `popstate` pertence a quem está no topo; as de baixo o ignoram. */
  ehTopo(id: string): boolean;
  /** Fecha por `popstate`: a entrada já saiu do histórico, então não se volta. */
  removerSemVoltar(id: string): void;
  /** Só para teste e diagnóstico. */
  camadas(): string[];
}

export function criarPilhaCamadas(historico: AcoesHistorico): PilhaCamadas {
  const pilha: string[] = [];

  return {
    abrir(id) {
      pilha.push(id);
      historico.empilhar(id);
    },
    fechar(id) {
      const i = pilha.lastIndexOf(id);
      if (i === -1) return;
      const eraTopo = i === pilha.length - 1;
      pilha.splice(i, 1);
      if (eraTopo) historico.voltar();
    },
    ehTopo(id) {
      return pilha[pilha.length - 1] === id;
    },
    removerSemVoltar(id) {
      const i = pilha.lastIndexOf(id);
      if (i !== -1) pilha.splice(i, 1);
    },
    camadas() {
      return [...pilha];
    },
  };
}

/** Pilha da aplicação. Única por página, como o histórico do navegador. */
export const pilhaDeCamadas = criarPilhaCamadas({
  empilhar: (id) => window.history.pushState({ camada: id }, ""),
  voltar: () => window.history.back(),
});
