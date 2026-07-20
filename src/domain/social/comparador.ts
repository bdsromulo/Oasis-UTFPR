import type { DisciplinaOfertada, Matriz, OfertaSemestre, PerfilAluno, Turma } from "../tipos";
import type { SelecaoTurma } from "../../ui/App";
import type { OasisSharePayload } from "./compartilhamento";
import { haveriaConflito, itensDaSelecao } from "../motor/grade";

export interface TurmaEmComum {
  disciplina: DisciplinaOfertada;
  turma: Turma;
}

export interface OportunidadeDeOuro {
  disciplina: DisciplinaOfertada;
  turmaAtualA?: string;
  turmaAtualB?: string;
  turmasSugeridasLivreParaAmbos: Turma[];
}

export interface ResultadoComparacaoSocial {
  amigoNome: string;
  amigoCurso: string;
  amigoPeriodo?: number;
  compatibilidadePercentual: number;
  matchPerfeito: TurmaEmComum[];
  oportunidadesDeOuro: OportunidadeDeOuro[];
  comparativo: {
    concluidasEmComum: number;
    aPodeMentorarB: DisciplinaOfertada[];
    bPodeMentorarA: DisciplinaOfertada[];
  };
}

/**
 * Realiza o cruzamento completo entre a grade e histórico do Aluno A e do Amigo (Payload B).
 */
export function calcularMatchSocial(
  perfilA: PerfilAluno | null,
  selecaoA: SelecaoTurma[],
  amigoB: OasisSharePayload,
  oferta: OfertaSemestre,
  _matriz: Matriz,
): ResultadoComparacaoSocial {
  const itensA = itensDaSelecao(oferta, selecaoA);
  const selecaoB: SelecaoTurma[] = amigoB.selecao.map((s) => ({
    codDisciplina: s.d,
    codTurma: s.t,
  }));
  const itensB = itensDaSelecao(oferta, selecaoB);

  // 1. Match Perfeito: exatamente a mesma disciplina e a mesma turma na prévia
  const matchPerfeito: TurmaEmComum[] = [];
  const codigosEmComum = new Set<string>();

  for (const itemA of itensA) {
    const itemB = itensB.find(
      (b) =>
        b.disciplina.codigo === itemA.disciplina.codigo &&
        b.turma.codigo === itemA.turma.codigo,
    );
    if (itemB) {
      matchPerfeito.push({
        disciplina: itemA.disciplina,
        turma: itemA.turma,
      });
      codigosEmComum.add(itemA.disciplina.codigo);
    }
  }

  // 2. Oportunidade de Ouro: ambos registraram A MESMA DISCIPLINA na prévia de grade do semestre,
  // mas escolheram turmas diferentes ou ainda precisam alinhar qual turma cursar juntos sem conflito.
  const oportunidadesDeOuro: OportunidadeDeOuro[] = [];

  for (const itemA of itensA) {
    if (codigosEmComum.has(itemA.disciplina.codigo)) continue;

    // Verifica se o Amigo B também registrou essa disciplina na seleção/prévia dele
    const itemB = itensB.find((b) => b.disciplina.codigo === itemA.disciplina.codigo);
    if (itemB) {
      // Ambos registraram a matéria! Vamos checar todas as turmas ofertadas dessa disciplina
      // para encontrar as que não conflitam com a grade do Aluno A nem com a do Amigo B.
      const itensAOutros = itensA.filter((i) => i.disciplina.codigo !== itemA.disciplina.codigo);
      const itensBOutros = itensB.filter((i) => i.disciplina.codigo !== itemB.disciplina.codigo);

      const turmasLivreAmbos = itemA.disciplina.turmas.filter((t) => {
        const conflitaA = haveriaConflito(itensAOutros, itemA.disciplina, t);
        const conflitaB = haveriaConflito(itensBOutros, itemB.disciplina, t);
        return !conflitaA && !conflitaB;
      });

      oportunidadesDeOuro.push({
        disciplina: itemA.disciplina,
        turmaAtualA: itemA.turma.codigo,
        turmaAtualB: itemB.turma.codigo,
        turmasSugeridasLivreParaAmbos: turmasLivreAmbos,
      });
      codigosEmComum.add(itemA.disciplina.codigo);
    }
  }

  // 3. Comparativo de Mentoria e Histórico
  const aprovadasA = new Set<string>(perfilA ? perfilA.aprovadas : []);
  const aprovadasB = new Set<string>(amigoB.aprovadas);

  let concluidasEmComum = 0;
  for (const cod of aprovadasA) {
    if (aprovadasB.has(cod)) concluidasEmComum++;
  }

  const aPodeMentorarB: DisciplinaOfertada[] = [];
  const bPodeMentorarA: DisciplinaOfertada[] = [];

  // Se A já fez e B colocou no seu planejamento atual
  for (const itemB of itensB) {
    if (aprovadasA.has(itemB.disciplina.codigo) && !aprovadasB.has(itemB.disciplina.codigo)) {
      if (!aPodeMentorarB.some((d) => d.codigo === itemB.disciplina.codigo)) {
        aPodeMentorarB.push(itemB.disciplina);
      }
    }
  }

  // Se B já fez e A colocou no seu planejamento atual
  for (const itemA of itensA) {
    if (aprovadasB.has(itemA.disciplina.codigo) && !aprovadasA.has(itemA.disciplina.codigo)) {
      if (!bPodeMentorarA.some((d) => d.codigo === itemA.disciplina.codigo)) {
        bPodeMentorarA.push(itemA.disciplina);
      }
    }
  }

  // Índice de compatibilidade geral baseado no total de matérias em comum e oportunidades
  const totalDisciplinasNaPrevia = Math.max(itensA.length, itensB.length, 1);
  const compatibilidadePercentual = Math.min(
    100,
    Math.round(
      ((matchPerfeito.length * 1.0 + oportunidadesDeOuro.filter((o) => o.turmasSugeridasLivreParaAmbos.length > 0).length * 0.75) /
        totalDisciplinasNaPrevia) *
        100,
    ),
  );

  return {
    amigoNome: amigoB.nome || "Amigo",
    amigoCurso: amigoB.curso || "Sistemas de Informação",
    amigoPeriodo: amigoB.periodo,
    compatibilidadePercentual,
    matchPerfeito,
    oportunidadesDeOuro,
    comparativo: {
      concluidasEmComum,
      aPodeMentorarB: aPodeMentorarB.slice(0, 6),
      bPodeMentorarA: bPodeMentorarA.slice(0, 6),
    },
  };
}
