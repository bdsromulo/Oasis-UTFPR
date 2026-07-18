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

/** total de aulas semanais da seleção */
export function aulasSemanais(itens: ItemGrade[]): number {
  return itens.reduce((s, i) => s + horariosUnicos(i.turma).length, 0);
}

/** relatório em texto para colar na matrícula do Portal do Aluno */
export function relatorioTexto(itens: ItemGrade[]): string {
  return itens
    .map(
      (i) =>
        `${i.disciplina.codigo} - ${i.disciplina.nome} | Turma ${i.turma.codigo}` +
        ` | ${horariosUnicos(i.turma).map(rotuloSlot).join(" ")}`,
    )
    .join("\n");
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
