// Tabela de horários dos slots de aula (M1..M6, T1..T6, N1..N5).
//
// ATENÇÃO: valores PROVISÓRIOS obtidos de página não institucional
// (paginapessoal.utfpr.edu.br/giuvaneconti/horarios) — aguardando o gabarito
// oficial do dono do projeto para confirmação. Os intervalos entre blocos
// (ex.: M3→M4, T3→T4) são implícitos nas descontinuidades dos horários.
export interface FaixaHorario {
  inicio: string;
  fim: string;
}

export const HORARIOS_SLOTS: Record<string, FaixaHorario> = {
  M1: { inicio: "07:30", fim: "08:20" },
  M2: { inicio: "08:20", fim: "09:10" },
  M3: { inicio: "09:10", fim: "10:00" },
  M4: { inicio: "10:20", fim: "11:10" },
  M5: { inicio: "11:10", fim: "12:00" },
  M6: { inicio: "12:00", fim: "12:50" },
  T1: { inicio: "13:00", fim: "13:50" },
  T2: { inicio: "13:50", fim: "14:40" },
  T3: { inicio: "14:40", fim: "15:30" },
  T4: { inicio: "15:50", fim: "16:40" },
  T5: { inicio: "16:40", fim: "17:30" },
  T6: { inicio: "17:50", fim: "18:40" },
  N1: { inicio: "18:40", fim: "19:30" },
  N2: { inicio: "19:30", fim: "20:20" },
  N3: { inicio: "20:20", fim: "21:10" },
  N4: { inicio: "21:20", fim: "22:10" },
  N5: { inicio: "22:10", fim: "23:00" },
};

export function faixaDoSlot(turno: string, aula: number): FaixaHorario | null {
  return HORARIOS_SLOTS[`${turno}${aula}`] ?? null;
}

/** rótulo "T4 · 15:50–16:40" */
export function rotuloComHora(turno: string, aula: number): string {
  const f = faixaDoSlot(turno, aula);
  return f ? `${turno}${aula} · ${f.inicio}–${f.fim}` : `${turno}${aula}`;
}
