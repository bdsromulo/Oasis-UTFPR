// Montagem de grade: seleção de turmas, detecção de conflitos e relatório.
import type { DisciplinaOfertada, Horario, Turma } from "../tipos";

export interface ItemGrade {
  disciplina: DisciplinaOfertada;
  turma: Turma;
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
      // sedes diferentes no mesmo dia+turno = deslocamento inviável entre aulas
      for (const h of ha) {
        const mesmoTurno = hb.find(
          (x) => x.dia === h.dia && x.turno === h.turno && x.sede !== h.sede,
        );
        if (mesmoTurno) {
          conflitos.push({
            a: itens[i],
            b: itens[j],
            tipo: "sedes",
            detalhe: `${DIAS[h.dia]} ${h.turno}: ${h.sede} × ${mesmoTurno.sede}`,
          });
          break;
        }
      }
    }
  }
  return conflitos;
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
