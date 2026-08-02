// Roster de unidades docentes e elenco por disciplina (Estrategia.md §6.4 e §6.10).
//
// O professor NÃO é lido do PDF do histórico: é escolhido pelo aluno numa lista
// montada a partir das ofertas oficiais, que já passaram pelo validador (RNF03).
//
// A unidade avaliada é a TURMA, não a pessoa. Quando dois docentes dividem a
// mesma turma no mesmo horário, o aluno viveu a dupla: a didática, o sistema de
// avaliação e a carga são da turma como ela foi ministrada, e atribuir a mesma
// nota de didática a cada um separadamente inventaria um dado que ninguém deu.
// Por isso a dupla vira UMA entrada, exibida como "Fulano / Sicrano".
//
// O roster é GLOBAL — construído sobre as ofertas de todos os cursos cobertos, e
// não só o do aluno. Medido nos históricos de referência, o elenco global derruba
// a falha de seleção de 17% para 11%, porque docentes lecionam em mais de um curso.
import type { DadosCurso } from "../dadosCurso";
import type { Turma } from "../tipos";

/** Junta os slugs de uma unidade docente. Não aparece em nome próprio. */
const SEPARADOR_ID = "+";

/** Como a dupla é apresentada a quem lê. */
const SEPARADOR_NOME = " / ";

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

/**
 * Identificador da unidade docente que ministrou uma turma.
 *
 * Os slugs são ordenados antes de juntar: a fonte lista os nomes na ordem que
 * quiser, e sem ordenar a mesma dupla geraria ids diferentes conforme o semestre,
 * fatiando o acervo de uma turma em dois.
 */
export function idDaUnidade(nomes: string[]): string {
  return [...new Set(nomes.map(slugProfessor).filter(Boolean))].sort().join(SEPARADOR_ID);
}

/** Um id de unidade contém este docente individual? */
export function unidadeInclui(idUnidade: string, slugDocente: string): boolean {
  return idUnidade.split(SEPARADOR_ID).includes(slugDocente);
}

/** Uma turma ministrada por uma pessoa ou por uma dupla. */
export interface UnidadeDocente {
  /** Slugs ordenados e unidos — ex.: `"fulano-de-tal+sicrano-da-silva"`. */
  id: string;
  /** Rótulo de exibição — ex.: `"Fulano De Tal / Sicrano Da Silva"`. */
  nome: string;
  /** Nomes individuais, na mesma ordem do id. */
  nomes: string[];
  /** Códigos de disciplina em que a unidade aparece, em qualquer curso. */
  disciplinas: string[];
}

export interface Roster {
  /** Todas as unidades conhecidas, ordenadas por nome de exibição. */
  unidades: UnidadeDocente[];
  porId(id: string): UnidadeDocente | undefined;
  /**
   * Elenco de uma disciplina: unidades que a ofertaram em QUALQUER semestre
   * coberto e em QUALQUER curso. União ampla de propósito — coleta-se largo e
   * filtra-se na exibição, para não perder quem ficou um semestre fora.
   */
  elencoDaDisciplina(codigo: string): UnidadeDocente[];
  /** Unidades das quais este docente individual participa, sozinho ou em dupla. */
  unidadesCom(slugDocente: string): UnidadeDocente[];
}

/**
 * Constrói o roster a partir das ofertas dos cursos informados.
 *
 * Quando a mesma unidade aparece com grafias de comprimento diferente entre
 * ofertas, vence a mais longa: nomes truncados na fonte são subconjunto do nome
 * completo, e o slug já os une quando a diferença é só de acento ou caixa.
 */
export function construirRoster(cursos: DadosCurso[]): Roster {
  const porUnidade = new Map<string, { nomes: string[]; disciplinas: Set<string> }>();
  const porDisciplina = new Map<string, Set<string>>();

  for (const curso of cursos) {
    for (const oferta of Object.values(curso.ofertas)) {
      for (const disciplina of oferta.disciplinas) {
        for (const turma of disciplina.turmas) {
          const nomes = docentesDaTurma(turma);
          const id = idDaUnidade(nomes);
          if (!id) continue;

          // os nomes seguem a ordem dos slugs, para o rótulo casar com o id
          const ordenados = [...nomes].sort((a, b) => slugProfessor(a).localeCompare(slugProfessor(b)));
          const atual = porUnidade.get(id);
          if (!atual) {
            porUnidade.set(id, { nomes: ordenados, disciplinas: new Set([disciplina.codigo]) });
          } else {
            atual.nomes = atual.nomes.map((n, i) =>
              (ordenados[i]?.length ?? 0) > n.length ? ordenados[i] : n,
            );
            atual.disciplinas.add(disciplina.codigo);
          }
          if (!porDisciplina.has(disciplina.codigo)) porDisciplina.set(disciplina.codigo, new Set());
          porDisciplina.get(disciplina.codigo)!.add(id);
        }
      }
    }
  }

  const unidades: UnidadeDocente[] = [...porUnidade]
    .map(([id, v]) => ({
      id,
      nome: v.nomes.join(SEPARADOR_NOME),
      nomes: v.nomes,
      disciplinas: [...v.disciplinas].sort(),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const indice = new Map(unidades.map((u) => [u.id, u]));

  return {
    unidades,
    porId: (id) => indice.get(id),
    elencoDaDisciplina: (codigo) =>
      [...(porDisciplina.get(codigo) ?? [])]
        .map((id) => indice.get(id)!)
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    unidadesCom: (slugDocente) => unidades.filter((u) => unidadeInclui(u.id, slugDocente)),
  };
}
