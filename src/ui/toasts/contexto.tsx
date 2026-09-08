import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import {
  dispensar as dispensarNaPilha,
  ESTADO_INICIAL,
  pausar as pausarNaPilha,
  publicar as publicarNaPilha,
  publicarUmaVez as publicarUmaVezNaPilha,
  retomar as retomarNaPilha,
  varrer,
  type EstadoToasts,
  type PedidoToast,
  type Toast,
} from "./pilha";

/**
 * Contexto fino sobre `pilha.ts`: guarda o estado e bate o relógio. Toda a
 * regra (deduplicação, teto, expiração) mora no módulo puro; aqui só há React.
 */

type Acao =
  | { tipo: "publicar"; pedido: PedidoToast; agora: number }
  | { tipo: "publicarUmaVez"; pedido: PedidoToast; agora: number }
  | { tipo: "dispensar"; chave: string; agora: number }
  | { tipo: "pausar"; chave: string; agora: number }
  | { tipo: "retomar"; chave: string; agora: number }
  | { tipo: "varrer"; agora: number };

function reduzir(estado: EstadoToasts, acao: Acao): EstadoToasts {
  switch (acao.tipo) {
    case "publicar":
      return publicarNaPilha(estado, acao.pedido, acao.agora);
    case "publicarUmaVez":
      return publicarUmaVezNaPilha(estado, acao.pedido, acao.agora);
    case "dispensar":
      return dispensarNaPilha(estado, acao.chave, acao.agora);
    case "pausar":
      return pausarNaPilha(estado, acao.chave, acao.agora);
    case "retomar":
      return retomarNaPilha(estado, acao.chave, acao.agora);
    case "varrer":
      return varrer(estado, acao.agora);
  }
}

export interface ApiToasts {
  toasts: Toast[];
  /** publica sempre; se a chave já está na tela, reinicia o relógio dela */
  publicar: (pedido: PedidoToast) => void;
  /** publica só na primeira vez que a chave aparece nesta sessão */
  publicarUmaVez: (pedido: PedidoToast) => void;
  dispensar: (chave: string) => void;
  pausar: (chave: string) => void;
  retomar: (chave: string) => void;
}

const SEM_TOASTS: ApiToasts = {
  toasts: [],
  publicar: () => {},
  publicarUmaVez: () => {},
  dispensar: () => {},
  pausar: () => {},
  retomar: () => {},
};

const ContextoToasts = createContext<ApiToasts>(SEM_TOASTS);

/** Intervalo do relógio. Fino o bastante para o fade não engasgar, grosso o
 *  bastante para não custar render a cada quadro. */
const TICK_MS = 250;

export function ProvedorToasts(props: { children: ReactNode }) {
  const [estado, despachar] = useReducer(reduzir, ESTADO_INICIAL);

  useEffect(() => {
    if (estado.pilha.length === 0) return;
    const id = window.setInterval(
      () => despachar({ tipo: "varrer", agora: Date.now() }),
      TICK_MS,
    );
    return () => window.clearInterval(id);
  }, [estado.pilha.length]);

  const publicar = useCallback(
    (pedido: PedidoToast) => despachar({ tipo: "publicar", pedido, agora: Date.now() }),
    [],
  );
  const publicarUmaVez = useCallback(
    (pedido: PedidoToast) =>
      despachar({ tipo: "publicarUmaVez", pedido, agora: Date.now() }),
    [],
  );
  const dispensar = useCallback(
    (chave: string) => despachar({ tipo: "dispensar", chave, agora: Date.now() }),
    [],
  );
  const pausar = useCallback(
    (chave: string) => despachar({ tipo: "pausar", chave, agora: Date.now() }),
    [],
  );
  const retomar = useCallback(
    (chave: string) => despachar({ tipo: "retomar", chave, agora: Date.now() }),
    [],
  );

  const api = useMemo<ApiToasts>(
    () => ({ toasts: estado.pilha, publicar, publicarUmaVez, dispensar, pausar, retomar }),
    [estado.pilha, publicar, publicarUmaVez, dispensar, pausar, retomar],
  );

  return <ContextoToasts.Provider value={api}>{props.children}</ContextoToasts.Provider>;
}

/**
 * Fora do provedor devolve uma API muda em vez de estourar: telas de material
 * do projeto são renderizadas isoladas nos testes e não precisam de avisos.
 */
export function useToasts(): ApiToasts {
  return useContext(ContextoToasts);
}
