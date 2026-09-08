// Ponte entre o que o domínio apura e o que a pilha de avisos publica.
//
// Cada fonte de conflito da plataforma entra por aqui, e não montando o pedido
// na própria tela: a chave de deduplicação é o que impede o Simulador de
// reciclar o mesmo aviso a cada recálculo, e chave montada em dois lugares vira
// duas chaves diferentes.
import { descreverChoque, type ConflitoBloqueado } from "../../domain/motor/grade";
import type { ExclusaoImpossivel, TipoExclusao } from "../../domain/motor/simuladorFormatura";
import type { ApiToasts } from "./contexto";

/** Como o pedido do aluno é nomeado no aviso; espelha os rótulos da tela. */
const ROTULO_PEDIDO: Record<TipoExclusao, string> = {
  disciplina: "não cursar",
  professor: "evitar docente",
  trilha: "evitar trilha",
  "trilha-alvo": "trilha escolhida",
  "disciplina-fixada": "quero cursar",
  "semestre-fixado": "semestre escolhido",
};

/**
 * Choque de horário ao tentar adicionar turma.
 *
 * Usa `publicar` e não `publicarUmaVez` de propósito: clicar duas vezes na
 * mesma turma barrada precisa avisar duas vezes, senão o segundo clique parece
 * ter funcionado. E `duracaoMs: 0` porque este aviso substitui um modal
 * bloqueante — some só quando a pessoa fechar.
 */
export function avisarChoque(toasts: ApiToasts, bloqueio: ConflitoBloqueado): void {
  const { titulo, descricao, detalhes } = descreverChoque(bloqueio);
  toasts.publicar({
    chave: `choque:${bloqueio.codigo}:${bloqueio.codTurma}`,
    tom: "alerta",
    titulo,
    descricao,
    detalhes,
    duracaoMs: 0,
  });
}

/**
 * Avisos e pedidos negados de uma projeção de formatura.
 *
 * O texto de cada aviso já é único e estável no motor, então serve de chave sem
 * precisar de hash; os pedidos negados usam a mesma tupla `(tipo, alvo)` que o
 * simulador já emprega para deduplicar internamente.
 */
export function avisarProjecao(
  toasts: ApiToasts,
  avisos: string[],
  impossiveis: ExclusaoImpossivel[],
): void {
  for (const aviso of avisos) {
    toasts.publicarUmaVez({
      chave: `sim:aviso:${aviso}`,
      tom: "aviso",
      titulo: "Aviso da projeção",
      descricao: aviso,
    });
  }
  for (const x of impossiveis) {
    toasts.publicarUmaVez({
      chave: `sim:impossivel:${x.tipo}:${x.alvo}`,
      tom: "alerta",
      titulo: `Não deu para ${ROTULO_PEDIDO[x.tipo]}: ${x.rotulo}`,
      descricao: x.motivo,
      detalhes: x.disciplinas,
      duracaoMs: 0,
    });
  }
}
