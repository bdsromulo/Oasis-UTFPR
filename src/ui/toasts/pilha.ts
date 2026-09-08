// Pilha de avisos flutuantes (canto inferior direito).
//
// Módulo puro, sem React, por dois motivos. Primeiro: a suíte roda em ambiente
// `node` e afere componentes por `renderToStaticMarkup`, que não executa efeitos
// — se o relógio e a deduplicação morassem dentro do componente, não haveria
// como prová-los. Segundo: a regra que impede o spam do Simulador é lógica de
// domínio da notificação, não de apresentação.

export type TomToast = "info" | "ok" | "aviso" | "alerta";

export interface Toast {
  /** identidade estável do aviso; a mesma chave nunca empilha duas vezes */
  chave: string;
  tom: TomToast;
  titulo: string;
  descricao?: string;
  /** linhas auxiliares: disciplinas afetadas, turmas em choque */
  detalhes?: string[];
  /** ms até sumir sozinho; 0 significa "só sai no X" */
  duracaoMs: number;
  criadoEm: number;
  /** instante em que o ponteiro entrou: o relógio para enquanto se lê */
  pausadoEm: number | null;
  /** fase de saída; o cartão fica montado durante o fade e só então some */
  saindo: boolean;
}

export type PedidoToast = Omit<
  Toast,
  "criadoEm" | "pausadoEm" | "saindo" | "duracaoMs"
> & { duracaoMs?: number };

export interface EstadoToasts {
  pilha: Toast[];
  /**
   * Chaves já publicadas nesta sessão. É o que impede o Simulador de reciclar
   * o mesmo aviso: ele recalcula a projeção a cada mexida num controle, e sem
   * esta memória arrastar o slider de ritmo republicaria tudo.
   */
  vistas: string[];
}

/**
 * Vinte segundos. O pedido original falava em "alguns minutos", mas um aviso
 * que sobrevive à troca de tela vira mobília e deixa de ser lido. Quem precisa
 * de permanência usa `duracaoMs: 0`, que só sai no X — é o caso dos tons
 * `alerta`, que substituem um modal bloqueante.
 */
export const DURACAO_PADRAO_MS = 20_000;
/** Tempo do fade de saída; precisa casar com a animação de `index.css`. */
export const DURACAO_SAIDA_MS = 180;
/** Acima disso a pilha cobre a tela; o mais antigo cede a vez. */
export const TETO_PILHA = 4;

export const ESTADO_INICIAL: EstadoToasts = { pilha: [], vistas: [] };

function novoToast(p: PedidoToast, agora: number): Toast {
  return {
    chave: p.chave,
    tom: p.tom,
    titulo: p.titulo,
    descricao: p.descricao,
    detalhes: p.detalhes,
    duracaoMs: p.duracaoMs ?? DURACAO_PADRAO_MS,
    criadoEm: agora,
    pausadoEm: null,
    saindo: false,
  };
}

/** Marca para saída os cartões que excedem o teto, do mais antigo para o mais novo. */
function aplicarTeto(pilha: Toast[], agora: number): Toast[] {
  const vivos = pilha.filter((t) => !t.saindo);
  const excedente = vivos.length - TETO_PILHA;
  if (excedente <= 0) return pilha;
  const aRetirar = new Set(vivos.slice(0, excedente).map((t) => t.chave));
  return pilha.map((t) =>
    aRetirar.has(t.chave) ? { ...t, saindo: true, criadoEm: agora } : t,
  );
}

/**
 * Publica apenas na primeira vez que a chave aparece. Não republica e **não
 * reinicia o relógio** de um cartão que já está na tela: o aviso pertence à
 * projeção, não ao gesto que a recalculou.
 */
export function publicarUmaVez(
  estado: EstadoToasts,
  pedido: PedidoToast,
  agora: number,
): EstadoToasts {
  if (estado.vistas.includes(pedido.chave)) return estado;
  return {
    pilha: aplicarTeto([...estado.pilha, novoToast(pedido, agora)], agora),
    vistas: [...estado.vistas, pedido.chave],
  };
}

/**
 * Publica sempre. Se a chave já está na pilha, reinicia o relógio dela em vez
 * de duplicar o cartão — clicar duas vezes na mesma turma bloqueada precisa
 * avisar duas vezes, senão o segundo clique parece ter funcionado.
 */
export function publicar(
  estado: EstadoToasts,
  pedido: PedidoToast,
  agora: number,
): EstadoToasts {
  const jaNaPilha = estado.pilha.some((t) => t.chave === pedido.chave);
  const vistas = estado.vistas.includes(pedido.chave)
    ? estado.vistas
    : [...estado.vistas, pedido.chave];
  if (jaNaPilha) {
    return {
      pilha: estado.pilha.map((t) =>
        t.chave === pedido.chave ? novoToast(pedido, agora) : t,
      ),
      vistas,
    };
  }
  return {
    pilha: aplicarTeto([...estado.pilha, novoToast(pedido, agora)], agora),
    vistas,
  };
}

/** Entra na fase de saída. A remoção real acontece no `varrer` seguinte. */
export function dispensar(
  estado: EstadoToasts,
  chave: string,
  agora: number,
): EstadoToasts {
  return {
    ...estado,
    pilha: estado.pilha.map((t) =>
      t.chave === chave && !t.saindo ? { ...t, saindo: true, criadoEm: agora } : t,
    ),
  };
}

export function pausar(estado: EstadoToasts, chave: string, agora: number): EstadoToasts {
  return {
    ...estado,
    pilha: estado.pilha.map((t) =>
      t.chave === chave && t.pausadoEm === null ? { ...t, pausadoEm: agora } : t,
    ),
  };
}

/** Devolve ao relógio o tempo parado, em vez de reiniciá-lo do zero. */
export function retomar(estado: EstadoToasts, chave: string, agora: number): EstadoToasts {
  return {
    ...estado,
    pilha: estado.pilha.map((t) =>
      t.chave === chave && t.pausadoEm !== null
        ? { ...t, criadoEm: t.criadoEm + (agora - t.pausadoEm), pausadoEm: null }
        : t,
    ),
  };
}

/**
 * Um tick do relógio: expira o que venceu e remove o que terminou de sair.
 * Cartões pausados e de duração 0 nunca vencem.
 */
export function varrer(estado: EstadoToasts, agora: number): EstadoToasts {
  let mudou = false;
  const pilha: Toast[] = [];
  for (const t of estado.pilha) {
    if (t.saindo) {
      if (agora - t.criadoEm >= DURACAO_SAIDA_MS) {
        mudou = true;
        continue;
      }
      pilha.push(t);
      continue;
    }
    const vencido =
      t.duracaoMs > 0 && t.pausadoEm === null && agora - t.criadoEm >= t.duracaoMs;
    if (vencido) {
      mudou = true;
      pilha.push({ ...t, saindo: true, criadoEm: agora });
      continue;
    }
    pilha.push(t);
  }
  return mudou ? { ...estado, pilha } : estado;
}
