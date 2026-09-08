// Montagem de grade: seleção de turmas, detecção de conflitos e relatório.
import type { DisciplinaOfertada, Horario, OfertaSemestre, SelecaoTurma, Turma } from "../tipos";

export interface ItemGrade {
  disciplina: DisciplinaOfertada;
  turma: Turma;
  /** Se veio de uma disciplina equivalente/agrupada no catálogo, armazena a seleção original que gerou o item */
  selecaoOriginal?: SelecaoTurma;
}

export interface Conflito {
  a: ItemGrade;
  b: ItemGrade;
  tipo: "choque" | "sedes";
  detalhe: string;
}

const DIAS = ["", "", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function chaveSlot(h: Horario): string {
  return `${h.dia}${h.turno}${h.aula}`;
}

export function rotuloSlot(h: Horario): string {
  return `${DIAS[h.dia]} ${h.turno}${h.aula}`;
}

export function rotuloSlotComSede(h: Horario): string {
  return `${DIAS[h.dia]} ${h.turno}${h.aula} (${h.sede})`;
}

/** horários únicos da turma (a fonte repete o bloco por professor) */
export function horariosUnicos(t: Turma): Horario[] {
  const vistos = new Set<string>();
  const out: Horario[] = [];
  for (const h of t.horarios) {
    const k = chaveSlot(h) + (h.sala ?? "");
    if (!vistos.has(k)) {
      vistos.add(k);
      out.push(h);
    }
  }
  return out;
}

export function detectarConflitos(itens: ItemGrade[]): Conflito[] {
  const conflitos: Conflito[] = [];
  for (let i = 0; i < itens.length; i++) {
    for (let j = i + 1; j < itens.length; j++) {
      const ha = horariosUnicos(itens[i].turma);
      const hb = horariosUnicos(itens[j].turma);
      const slotsB = new Map(hb.map((h) => [chaveSlot(h), h]));
      const choques = ha.filter((h) => slotsB.has(chaveSlot(h)));
      if (choques.length) {
        conflitos.push({
          a: itens[i],
          b: itens[j],
          tipo: "choque",
          detalhe: choques.map(rotuloSlot).join(", "),
        });
        continue;
      }
      // sedes diferentes no mesmo dia+turno ou em turnos sequenciais imediatos (M6->T1, T6->N1) = deslocamento inviável
      for (const h of ha) {
        const mesmoTurno = hb.find(
          (x) => x.dia === h.dia && x.turno === h.turno && x.sede !== h.sede,
        );
        if (mesmoTurno) {
          conflitos.push({
            a: itens[i],
            b: itens[j],
            tipo: "sedes",
            detalhe: `${DIAS[h.dia]} ${h.turno}: ${h.sede} × ${mesmoTurno.sede} (mesmo turno)`,
          });
          break;
        }

        const sequencial = hb.find(
          (x) =>
            x.dia === h.dia &&
            x.sede !== h.sede &&
            ((h.turno === x.turno && Math.abs(h.aula - x.aula) === 1) ||
              (h.turno === "M" && h.aula >= 5 && x.turno === "T" && x.aula <= 2) ||
              (x.turno === "M" && x.aula >= 5 && h.turno === "T" && h.aula <= 2) ||
              (h.turno === "T" && h.aula >= 5 && x.turno === "N" && x.aula <= 2) ||
              (x.turno === "T" && x.aula >= 5 && h.turno === "N" && h.aula <= 2)),
        );
        if (sequencial) {
          conflitos.push({
            a: itens[i],
            b: itens[j],
            tipo: "sedes",
            detalhe: `${DIAS[h.dia]} ${rotuloSlot(h)} (${h.sede}) seguida de ${rotuloSlot(sequencial)} (${sequencial.sede})`,
          });
          break;
        }
      }
    }
  }
  return conflitos;
}

/** Verifica se a turma candidata entraria em conflito com os itens atuais da seleção */
export function haveriaConflito(
  itensAtual: ItemGrade[],
  disciplina: DisciplinaOfertada,
  turma: Turma,
): boolean {
  if (
    itensAtual.some(
      (i) =>
        (i.disciplina.codigo === disciplina.codigo && i.turma.codigo === turma.codigo) ||
        (i.selecaoOriginal?.codDisciplina === disciplina.codigo && i.selecaoOriginal?.codTurma === turma.codigo),
    )
  ) {
    return false;
  }
  return detectarConflitos([...itensAtual, { disciplina, turma }]).length > 0;
}

/**
 * Conflitos que a entrada desta turma criaria — só os que envolvem a turma nova.
 *
 * `haveriaConflito` responde sim/não, e isso basta para filtrar lista. Para
 * barrar o clique, a tela precisa dizer COM QUEM bate e em QUAL horário, senão o
 * aviso vira um "não pode" sem explicação.
 *
 * Os itens da mesma disciplina devem ficar fora de `itensAtuais`: trocar de
 * turma dentro da mesma matéria substitui a anterior, não soma.
 */
export function conflitosDaAdicao(
  itensAtuais: ItemGrade[],
  disciplina: DisciplinaOfertada,
  turma: Turma,
): Conflito[] {
  const novo: ItemGrade = { disciplina, turma };
  return detectarConflitos([...itensAtuais, novo]).filter((c) => c.a === novo || c.b === novo);
}

/** total de aulas semanais da seleção */
export function aulasSemanais(itens: ItemGrade[]): number {
  return itens.reduce((s, i) => s + horariosUnicos(i.turma).length, 0);
}

/** lista concisa no formato do Grade na Hora para colar na matrícula */
export function relatorioTexto(itens: ItemGrade[]): string {
  return itens.map((i) => `${i.disciplina.codigo} — ${i.turma.codigo}`).join("\n");
}

export function itensDaSelecao(oferta: OfertaSemestre, selecao: SelecaoTurma[]): ItemGrade[] {
  const out: ItemGrade[] = [];
  for (const s of selecao) {
    const d = oferta.disciplinas.find((x) => x.codigo === s.codDisciplina);
    const t = d?.turmas.find((x) => x.codigo === s.codTurma);
    if (d && t) {
      out.push({ disciplina: d, turma: t, selecaoOriginal: s });
      continue;
    }
    const match = s.codTurma.match(/^(.+?)\s*\(([A-Z0-9]+)\)$/);
    if (match) {
      const codTurmaReal = match[1].trim();
      const codDiscReal = match[2].trim();
      const dReal = oferta.disciplinas.find((x) => x.codigo === codDiscReal);
      const tReal = dReal?.turmas.find((x) => x.codigo === codTurmaReal);
      if (dReal && tReal) {
        out.push({
          disciplina: dReal,
          turma: {
            ...tReal,
            codDisciplinaOriginal: codDiscReal,
            codTurmaOriginal: codTurmaReal,
          },
          selecaoOriginal: s,
        });
      }
    }
  }
  return out;
}

/**
 * Bloqueio de adição por choque de horário, no espírito do Grade na Hora: o
 * clique não entra na grade e um aviso explica com quem bateu.
 *
 * Só choque de horário barra. Divergência de sede entre turnos vizinhos segue
 * como alerta na grade montada, porque é heurística de deslocamento — apertado,
 * mas possível —, e não uma sobreposição real de aula.
 */
export interface ConflitoBloqueado {
  nome: string;
  codigo: string;
  codTurma: string;
  /** referência da turma nova, para saber qual lado do conflito é o outro */
  turma: Turma;
  disciplina: DisciplinaOfertada;
  conflitos: Conflito[];
}

/**
 * Diz se a turma pode entrar. `selecaoSemADisciplina` já deve vir sem as turmas
 * da mesma matéria: trocar de turma substitui a anterior, não soma.
 */
export function verificarChoqueAoAdicionar(
  oferta: OfertaSemestre,
  selecaoSemADisciplina: SelecaoTurma[],
  codDisciplina: string,
  codTurma: string,
): ConflitoBloqueado | null {
  // a mesma resolução da grade, para valer também nas turmas que chegam
  // agrupadas por equivalência ("S71 (IF69D)")
  const alvo = itensDaSelecao(oferta, [{ codDisciplina, codTurma }])[0];
  if (!alvo) return null;

  const itensAtuais = itensDaSelecao(oferta, selecaoSemADisciplina);
  const conflitos = conflitosDaAdicao(itensAtuais, alvo.disciplina, alvo.turma).filter(
    (c) => c.tipo === "choque",
  );
  if (conflitos.length === 0) return null;

  return {
    nome: alvo.disciplina.nome,
    codigo: alvo.disciplina.codigo,
    codTurma: alvo.turma.codigo,
    turma: alvo.turma,
    disciplina: alvo.disciplina,
    conflitos,
  };
}

/**
 * Texto do aviso de choque, no formato da pilha de notificações: o título diz o
 * que foi barrado e cada detalhe nomeia uma matéria adversária com o slot em
 * que bateram. Mora aqui, junto de `rotuloSlot`, para a tela não remontar a
 * frase de dois jeitos diferentes.
 */
export function descreverChoque(bloqueio: ConflitoBloqueado): {
  titulo: string;
  descricao: string;
  detalhes: string[];
} {
  const varios = bloqueio.conflitos.length > 1;
  return {
    titulo: `${bloqueio.nome} não entrou na grade`,
    descricao: `O horário da turma ${bloqueio.codTurma} se sobrepõe ao de ${
      varios ? "matérias que já estão" : "uma matéria que já está"
    } na sua grade. Remova a matéria conflitante ou escolha outra turma.`,
    detalhes: bloqueio.conflitos.map((c) => {
      const outro = c.a.turma === bloqueio.turma ? c.b : c.a;
      const slots = horariosUnicos(outro.turma).map(rotuloSlot);
      return `${outro.disciplina.codigo} ${outro.turma.codigo} · choque em ${c.detalhe}${
        slots.length > 0 ? ` · ${slots.join(" ")}` : ""
      }`;
    }),
  };
}
