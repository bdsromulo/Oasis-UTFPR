// Roster de docentes e elenco por disciplina (Estrategia.md §6.4 e §6.10).
//
// O professor NÃO é lido do PDF do histórico: é escolhido pelo aluno numa lista
// montada a partir das ofertas oficiais, que já passaram pelo validador (RNF03).
//
// O roster é GLOBAL — construído sobre as ofertas de todos os cursos cobertos, e
// não só o do aluno. Isso não é preferência de estilo: medido nos históricos de
// referência, o elenco global derruba a falha de seleção de 17% para 11% no caso
// mais adiantado, porque docentes lecionam em mais de um curso.
import type { DadosCurso } from "../dadosCurso";
import type { Turma } from "../tipos";

/**
 * Extrai os docentes de uma turma.
 *
 * A fonte primária é `professores_raw`, uma string com os nomes separados por
 * vírgula — presente em 2575 das 2618 turmas versionadas. O campo `professores`
 * já parseado só existe em 1197 delas, e usá-lo como primário deixa quase metade
 * do elenco de fora (foi o que inflou uma medição anterior desta arquitetura).
 */
export function docentesDaTurma(turma: Turma): string[] {
  const bruto = turma.professores_raw;
  if (typeof bruto === "string" && bruto.trim()) {
    return bruto
      .split(/\s*,\s*/)
      .map((n) => n.trim())
      .filter(Boolean);
  }
  return (turma.professores ?? []).map((n) => n.trim()).filter(Boolean);
}

/**
 * Identificador estável de um docente: minúsculas, sem acento, sem pontuação,
 * espaços viram hífen. Mesmo princípio de normalização que `motor/identidade.ts`
 * aplica a códigos de disciplina.
 */
export function slugProfessor(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface Docente {
  id: string;
  /** Grafia canônica — a mais completa vista nas ofertas. */
  nome: string;
  /** Códigos de disciplina em que o docente aparece, em qualquer curso. */
  disciplinas: string[];
}

export interface Roster {
  /** Todos os docentes conhecidos, ordenados por nome. */
  docentes: Docente[];
  /** Busca por slug. */
  porId(id: string): Docente | undefined;
  /**
   * Elenco de uma disciplina: docentes que a ofertaram em QUALQUER semestre
   * coberto e em QUALQUER curso. União ampla de propósito — coleta-se largo e
   * filtra-se na exibição, para não perder o docente que ficou um semestre fora.
   */
  elencoDaDisciplina(codigo: string): Docente[];
}

/**
 * Constrói o roster a partir das ofertas dos cursos informados.
 *
 * Quando o mesmo docente aparece com grafias de comprimento diferente entre
 * ofertas, vence a mais longa: nomes truncados na fonte são subconjunto do nome
 * completo, e o slug já os une quando a diferença é só de acento ou caixa.
 */
export function construirRoster(cursos: DadosCurso[]): Roster {
  const porSlug = new Map<string, { nome: string; disciplinas: Set<string> }>();
  const porDisciplina = new Map<string, Set<string>>();

  for (const curso of cursos) {
    for (const oferta of Object.values(curso.ofertas)) {
      for (const disciplina of oferta.disciplinas) {
        for (const turma of disciplina.turmas) {
          for (const nome of docentesDaTurma(turma)) {
            const id = slugProfessor(nome);
            if (!id) continue;
            const atual = porSlug.get(id);
            if (!atual) {
              porSlug.set(id, { nome, disciplinas: new Set([disciplina.codigo]) });
            } else {
              if (nome.length > atual.nome.length) atual.nome = nome;
              atual.disciplinas.add(disciplina.codigo);
            }
            if (!porDisciplina.has(disciplina.codigo)) porDisciplina.set(disciplina.codigo, new Set());
            porDisciplina.get(disciplina.codigo)!.add(id);
          }
        }
      }
    }
  }

  const docentes: Docente[] = [...porSlug]
    .map(([id, v]) => ({ id, nome: v.nome, disciplinas: [...v.disciplinas].sort() }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const indice = new Map(docentes.map((d) => [d.id, d]));

  return {
    docentes,
    porId: (id) => indice.get(id),
    elencoDaDisciplina: (codigo) =>
      [...(porDisciplina.get(codigo) ?? [])]
        .map((id) => indice.get(id)!)
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
  };
}
