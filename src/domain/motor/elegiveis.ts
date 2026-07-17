// "O que posso cursar": cruza matriz (pré-requisitos e equivalências) com o
// perfil do aluno e a oferta do semestre.
import type { DisciplinaMatriz, DisciplinaOfertada, Matriz, OfertaSemestre, PerfilAluno } from "../tipos";

export interface Elegivel {
  disciplina: DisciplinaMatriz;
  oferta: DisciplinaOfertada | null;
  categoria: "obrigatória" | "2º estrato" | "humanidades" | string; // trilhas usam o nome
  motivoBloqueio: string | null; // null = liberada
  jaMatriculada: boolean;
}

/** aluno cumpre `codigo`? (aprovação direta ou por equivalente declarada na matriz) */
export function cumpre(codigo: string, perfil: PerfilAluno | null, matriz: Matriz): boolean {
  if (!perfil) return false;
  if (perfil.aprovadas.has(codigo)) return true;
  const d = matriz.disciplinas.find((x) => x.codigo === codigo);
  return !!d?.equivalentes.some((e) => perfil.aprovadas.has(e.codigo));
}

function bloqueio(d: DisciplinaMatriz, perfil: PerfilAluno | null, matriz: Matriz): string | null {
  if (!perfil) return null; // Modo livre sem histórico: todas liberadas para simulação de grade
  const pendentes: string[] = [];
  for (const p of d.prerequisitos) {
    const mPer = p.match(/^Período:(\d)$/);
    if (mPer) {
      if ((perfil.periodo ?? 0) < parseInt(mPer[1])) pendentes.push(`estar no ${mPer[1]}º período`);
    } else if (!cumpre(p, perfil, matriz)) {
      const dep = matriz.disciplinas.find((x) => x.codigo === p);
      pendentes.push(dep ? `${p} (${dep.nome})` : p);
    }
  }
  return pendentes.length ? `falta: ${pendentes.join(", ")}` : null;
}

export function categoriaDe(d: DisciplinaMatriz, matriz: Matriz): string {
  if (d.conjunto === null) return "obrigatória";
  if (d.conjunto === 1159) return "2º estrato";
  if (d.conjunto === 1161) return "humanidades";
  return matriz.conjuntos[String(d.conjunto)]?.nome ?? String(d.conjunto);
}

/** Todas as disciplinas da matriz ainda não cumpridas, com estado de liberação e oferta. */
export function listarElegiveis(
  perfil: PerfilAluno | null,
  matriz: Matriz,
  oferta: OfertaSemestre,
): Elegivel[] {
  const ofertadas = new Map(oferta.disciplinas.map((d) => [d.codigo, d]));
  const matriculadas = new Set(perfil?.matriculadas.map((m) => m.codigo) ?? []);
  const out: Elegivel[] = [];
  for (const d of matriz.disciplinas) {
    if (d.codigo.startsWith("ENADE")) continue;
    if (cumpre(d.codigo, perfil, matriz)) continue;
    out.push({
      disciplina: d,
      oferta: ofertadas.get(d.codigo) ?? null,
      categoria: categoriaDe(d, matriz),
      motivoBloqueio: bloqueio(d, perfil, matriz),
      jaMatriculada: matriculadas.has(d.codigo),
    });
  }
  // liberadas e ofertadas primeiro; depois por período na matriz
  out.sort(
    (a, b) =>
      Number(!!b.oferta && !b.motivoBloqueio) - Number(!!a.oferta && !a.motivoBloqueio) ||
      a.disciplina.periodo - b.disciplina.periodo ||
      a.disciplina.codigo.localeCompare(b.disciplina.codigo),
  );
  return out;
}
