import type { DisciplinaMatriz, Matriz, PerfilAluno } from "../tipos";
import { isMateriaGargalo, verificarDisponibilidadeNoSemestre } from "./sazonalidade";

export type RitmoSimulacao = 180 | 240 | 300;

export interface SemestreProjetado {
  semestre: string;
  disciplinas: DisciplinaMatriz[];
  cargaTotal: number;
  temGargalo: boolean;
}

export interface ResultadoSimulacao {
  semestresProjetados: SemestreProjetado[];
  dataEstimadaFormatura: string;
  totalSemestresRestantes: number;
  totalHorasRestantes: number;
  disciplinasGargaloPendentes: DisciplinaMatriz[];
}

/**
 * Avança o identificador de semestre ("2026-1" -> "2026-2", "2026-2" -> "2027-1")
 */
export function proximoSemestre(semAtual: string): string {
  const partes = semAtual.replace(".", "-").split("-");
  const ano = parseInt(partes[0], 10) || 2026;
  const sem = parseInt(partes[1], 10) || 1;

  if (sem === 1) {
    return `${ano}-2`;
  }
  return `${ano + 1}-1`;
}

/**
 * Formata o nome amigável do semestre projetado (ex: "2028-2" -> "2º Semestre de 2028 (2028.2)")
 */
export function formatarSemestreEstendido(sem: string): string {
  const partes = sem.replace(".", "-").split("-");
  const ano = partes[0] || "2026";
  const periodo = partes[1] === "2" ? "2º" : "1º";
  return `${periodo} Semestre de ${ano} (${ano}.${partes[1] || "1"})`;
}

/**
 * Simula a trajetória acadêmica até a conclusão do curso.
 */
export function simularTrajetoria(
  perfil: PerfilAluno | null,
  matriz: Matriz,
  ritmoHoras: number = 240,
  semestreInicial: string = "2026-2",
): ResultadoSimulacao {
  const aprovadas = new Set<string>(perfil ? perfil.aprovadas : []);
  const semestresProjetados: SemestreProjetado[] = [];
  
  // Mapeia disciplinas obrigatórias e de trilha ainda pendentes
  const pendentes = matriz.disciplinas.filter((d) => {
    // Apenas considera matérias obrigatórias (conjunto null) ou trilhas/optativas principais se o aluno não fez ainda
    // Para simplificar a simulação base, focamos nas disciplinas obrigatórias + conjuntos chave
    const isObrigatoriaOuTrilha = d.conjunto === null || (d.conjunto >= 1162 && d.conjunto <= 1173);
    return isObrigatoriaOuTrilha && !aprovadas.has(d.codigo);
  });

  const disciplinasGargaloPendentes = pendentes.filter((d) => isMateriaGargalo(d, matriz));
  const totalHorasRestantes = pendentes.reduce((acc, d) => acc + (d.horas.total || 60), 0);

  let semestreAtual = semestreInicial;
  let maxIteracoes = 16; // Trava de segurança contra loops infinitos (até 8 anos)

  while (aprovadas.size < pendentes.length + (perfil ? perfil.aprovadas.size : 0) && maxIteracoes > 0) {
    maxIteracoes--;

    // Seleciona elegíveis neste semestre
    const elegiveis = pendentes.filter((d) => {
      if (aprovadas.has(d.codigo)) return false;

      // Verifica pré-requisitos
      const prereqsOk = d.prerequisitos.every((prereq) => {
        if (prereq.startsWith("Período:")) {
          const periodoReq = parseInt(prereq.split(":")[1] || "0", 10);
          const periodoAluno = perfil?.periodo ?? 1;
          return periodoAluno >= periodoReq || semestresProjetados.length >= periodoReq - 1;
        }
        return aprovadas.has(prereq);
      });

      if (!prereqsOk) return false;

      // Verifica sazonalidade (impar vs par)
      return verificarDisponibilidadeNoSemestre(d, semestreAtual);
    });

    if (elegiveis.length === 0) {
      // Se nenhuma elegível na sazonalidade deste semestre, avança o semestre e continua
      const temPendenteQualquer = pendentes.some((d) => !aprovadas.has(d.codigo));
      if (!temPendenteQualquer) break;
      semestreAtual = proximoSemestre(semestreAtual);
      continue;
    }

    // Ordena por prioridade de agendamento
    elegiveis.sort((a, b) => {
      const aGargalo = isMateriaGargalo(a, matriz) ? 1 : 0;
      const bGargalo = isMateriaGargalo(b, matriz) ? 1 : 0;
      if (aGargalo !== bGargalo) return bGargalo - aGargalo;

      if (a.periodo !== b.periodo) return a.periodo - b.periodo;
      return b.horas.total - a.horas.total;
    });

    const escolhidas: DisciplinaMatriz[] = [];
    let cargaAcumulada = 0;

    for (const disc of elegiveis) {
      const cargaDisc = disc.horas.total || 60;
      // Se ainda não escolheu nenhuma ou se cabe no ritmo do semestre
      if (escolhidas.length === 0 || cargaAcumulada + cargaDisc <= ritmoHoras + 30) {
        escolhidas.push(disc);
        cargaAcumulada += cargaDisc;
      }
    }

    // Marca como aprovadas para as próximas iterações
    for (const disc of escolhidas) {
      aprovadas.add(disc.codigo);
    }

    const temGargalo = escolhidas.some((d) => isMateriaGargalo(d, matriz));
    semestresProjetados.push({
      semestre: semestreAtual,
      disciplinas: escolhidas,
      cargaTotal: cargaAcumulada,
      temGargalo,
    });

    semestreAtual = proximoSemestre(semestreAtual);
  }

  const ultimoSem = semestresProjetados[semestresProjetados.length - 1]?.semestre || semestreInicial;

  return {
    semestresProjetados,
    dataEstimadaFormatura: formatarSemestreEstendido(ultimoSem),
    totalSemestresRestantes: semestresProjetados.length,
    totalHorasRestantes,
    disciplinasGargaloPendentes,
  };
}
