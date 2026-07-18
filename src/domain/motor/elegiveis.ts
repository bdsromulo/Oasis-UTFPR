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

export function normNome(nome: string): string {
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
  if (d.conjunto === 1199) return "eletiva";
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
  if (!direta) return null;
  const turmasDiretas = direta.turmas
    .filter((t) => t.horarios && t.horarios.length > 0)
    .map((t) => ({ ...t, codDisciplinaOriginal: d.codigo, codTurmaOriginal: t.codigo }));
  if (turmasDiretas.length === 0) return null;
  return {
    ...direta,
    turmas: turmasDiretas,
  };
}

/** Todas as disciplinas da matriz ainda não cumpridas e disciplinas ofertadas no semestre, com estado de liberação e oferta. */
export function listarElegiveis(
  perfil: PerfilAluno | null,
  matriz: Matriz,
  oferta: OfertaSemestre,
): Elegivel[] {
  const ofertadas = new Map(oferta.disciplinas.map((d) => [d.codigo, d]));
  const matriculadas = new Set(perfil?.matriculadas.map((m) => m.codigo) ?? []);
  const out: Elegivel[] = [];
  const codigosAdicionados = new Set<string>();

  for (const d of matriz.disciplinas) {
    if (d.codigo.startsWith("ENADE")) continue;
    if (cumpre(d.codigo, perfil, matriz)) continue;
    codigosAdicionados.add(d.codigo);
    out.push({
      disciplina: d,
      oferta: buscarOfertaParaPlanejamento(d, ofertadas),
      categoria: categoriaDe(d, matriz),
      motivoBloqueio: bloqueio(d, perfil, matriz),
      jaMatriculada: matriculadas.has(d.codigo),
    });
  }

  // Adicionar disciplinas ofertadas no semestre que não estão diretamente na matriz (por equivalência ou optativas/eletivas)
  for (const [codOf, of] of ofertadas.entries()) {
    if (codigosAdicionados.has(codOf) || codOf.startsWith("ENADE")) continue;
    if (cumpre(codOf, perfil, matriz)) continue;

    const turmasComHorario = of.turmas
      .filter((t) => t.horarios && t.horarios.length > 0)
      .map((t) => ({ ...t, codDisciplinaOriginal: codOf, codTurmaOriginal: t.codigo }));
    if (turmasComHorario.length === 0) continue;

    // Verificar se esta disciplina ofertada é equivalente a alguma disciplina da matriz para herdar categoria, período e bloqueios
    let discRef: DisciplinaMatriz | undefined;
    for (const d of matriz.disciplinas) {
      const equivs = d.equivalentes || [];
      if (equivs.some((eq) => eq.codigo === codOf) || normNome(d.nome) === normNome(of.nome)) {
        discRef = d;
        break;
      }
    }

    if (discRef && cumpre(discRef.codigo, perfil, matriz)) continue;

    const aulasPresenciais = of.aulas_semanais_presenciais ?? 4;
    const aulasAssincronas = of.aulas_semanais_assincronas ?? 0;
    const chext = of.horas_semestrais_extensionistas ?? 0;

    const discSimulada: DisciplinaMatriz = {
      codigo: codOf,
      nome: of.nome,
      periodo: discRef?.periodo ?? 0,
      conjunto: discRef?.conjunto ?? null,
      modelo: discRef?.modelo ?? "padrão",
      horas: {
        ad: discRef?.horas.ad ?? (aulasPresenciais * 15),
        chext: chext,
        chead: discRef?.horas.chead ?? (aulasAssincronas * 15),
        total: (aulasPresenciais + aulasAssincronas) * 15,
      },
      aulas_semanais: {
        teoricas: aulasPresenciais,
        praticas: 0,
        total: aulasPresenciais + aulasAssincronas,
        aps: 0,
        apcc: 0,
      },
      prerequisitos: discRef?.prerequisitos ?? [],
      equivalentes: [],
    };

    codigosAdicionados.add(codOf);
    out.push({
      disciplina: discSimulada,
      oferta: {
        ...of,
        turmas: turmasComHorario,
      },
      categoria: discRef ? categoriaDe(discRef, matriz) : "eletiva",
      motivoBloqueio: discRef ? bloqueio(discRef, perfil, matriz) : null,
      jaMatriculada: matriculadas.has(codOf),
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
