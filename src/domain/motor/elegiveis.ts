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

function normNome(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/** aluno cumpre `codigo`? (aprovação direta ou por equivalente declarada na matriz) */
export function cumpre(codigo: string, perfil: PerfilAluno | null, matriz: Matriz): boolean {
  if (!perfil) return false;
  if (perfil.aprovadas.has(codigo)) return true;
  const d = matriz.disciplinas.find((x) => x.codigo === codigo);
  if (!d) return false;
  if (d.equivalentes.some((e) => perfil.aprovadas.has(e.codigo))) return true;

  // Regra Automática: Equivalência por nome exatamente igual no histórico
  const nomeNorm = normNome(d.nome);
  for (const cursada of perfil.aprovadas) {
    const discCursada = matriz.disciplinas.find((x) => x.codigo === cursada);
    if (discCursada && normNome(discCursada.nome) === nomeNorm) return true;
  }
  for (const c of perfil.cursadas) {
    if ((c.situacao === "aprovado" || c.situacao === "consignado" || c.situacao === "dispensado") && c.nome) {
      if (normNome(c.nome) === nomeNorm) return true;
    }
  }
  return false;
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

/**
 * Busca a oferta de turmas para o Planejamento de Grade, aplicando as regras essenciais:
 * 1. Apenas turmas COM HORÁRIOS DEFINIDOS (horarios.length > 0) são adicionadas no planejamento.
 * 2. Anexa automaticamente turmas de disciplinas equivalentes (declaradas na matriz ou por nome exatamente igual).
 */
export function buscarOfertaParaPlanejamento(
  d: DisciplinaMatriz,
  ofertadas: Map<string, DisciplinaOfertada>,
): DisciplinaOfertada | null {
  const direta = ofertadas.get(d.codigo);
  const turmasEquivs: any[] = [];
  const codigosEquivsConhecidos = new Set<string>();

  if (d.equivalentes && d.equivalentes.length > 0) {
    for (const eq of d.equivalentes) {
      codigosEquivsConhecidos.add(eq.codigo);
      const ofEq = ofertadas.get(eq.codigo);
      if (ofEq) {
        for (const t of ofEq.turmas) {
          if (t.horarios && t.horarios.length > 0) {
            turmasEquivs.push({
              ...t,
              codigo: `${t.codigo} (${eq.codigo})`,
            });
          }
        }
      }
    }
  }

  // Regra Automática: Matérias com nomes exatamente iguais no mesmo curso/campus são automaticamente equivalentes no planejamento
  const nomeDNorm = normNome(d.nome);
  for (const [codOf, of] of ofertadas.entries()) {
    if (codOf !== d.codigo && !codigosEquivsConhecidos.has(codOf)) {
      if (normNome(of.nome) === nomeDNorm) {
        codigosEquivsConhecidos.add(codOf);
        for (const t of of.turmas) {
          if (t.horarios && t.horarios.length > 0) {
            turmasEquivs.push({
              ...t,
              codigo: `${t.codigo} (${codOf})`,
            });
          }
        }
      }
    }
  }

  const turmasDiretas = direta
    ? direta.turmas.filter((t) => t.horarios && t.horarios.length > 0)
    : [];
  const todasTurmas = [...turmasDiretas, ...turmasEquivs];
  if (todasTurmas.length === 0) return null;
  return {
    codigo: d.codigo,
    nome: direta?.nome ?? d.nome,
    aulas_semanais_presenciais:
      direta?.aulas_semanais_presenciais ?? d.aulas_semanais.teoricas + d.aulas_semanais.praticas,
    aulas_semanais_assincronas: direta?.aulas_semanais_assincronas ?? 0,
    horas_semestrais_extensionistas: direta?.horas_semestrais_extensionistas ?? d.horas.chext,
    turmas: todasTurmas,
  };
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
      oferta: buscarOfertaParaPlanejamento(d, ofertadas),
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
