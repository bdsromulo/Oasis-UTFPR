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
/**
 * Remove hífens soltos nas pontas do nome.
 *
 * `data/turmas/2026-1.json` traz dezenas de entradas como `"- Juliano Mourao
 * Vieira"`, e uma como `"- Clayton Moura Belo Leandra Ulbricht -"` — resíduo da
 * extração do PDF de Turmas Abertas. O slug já descartava o hífen, então a
 * unidade não se duplicava; mas o RÓTULO exibido saía com ele, e o casamento
 * contra o vocabulário falhava, impedindo partir as duplas dessas linhas.
 */
function limparNome(nome: string): string {
  return nome.replace(/^[\s\-–—]+/, "").replace(/[\s\-–—]+$/, "").trim();
}

export function docentesDaTurma(turma: Turma, vocabulario?: string[]): string[] {
  const bruto = turma.professores_raw;
  if (typeof bruto === "string" && bruto.trim()) {
    const partes = bruto
      .split(/\s*,\s*/)
      .map(limparNome)
      .filter(Boolean);
    // sem vírgula, a string ainda pode ser uma dupla concatenada — ver `partir`
    if (partes.length === 1 && vocabulario) return partir(partes[0], vocabulario) ?? partes;
    return partes;
  }
  return (turma.professores ?? []).map(limparNome).filter(Boolean);
}

/**
 * Vocabulário de docentes individuais confiáveis, extraído das entradas que
 * TÊM vírgula — as únicas em que a fronteira entre nomes é explícita.
 *
 * Descarta o que é claramente concatenação (um nome que começa com outro nome
 * inteiro seguido de espaço), para o vocabulário não se contaminar com os
 * próprios defeitos que ele serve para corrigir.
 */
function vocabularioDeDocentes(brutos: string[]): string[] {
  const individuais = new Set<string>();
  for (const raw of brutos) {
    for (const parte of raw.split(/\s*,\s*/)) {
      const p = limparNome(parte);
      if (p) individuais.add(p);
    }
  }
  const lista = [...individuais];
  return lista
    .filter((n) => !lista.some((o) => o !== n && n.startsWith(o + " ")))
    .sort((a, b) => b.length - a.length); // o mais longo casa primeiro
}

/**
 * Tenta partir uma string sem vírgula em docentes conhecidos.
 *
 * A fonte é inconsistente: a mesma dupla sai como
 * `"Anelise Munaretto Fonseca, Mauro Sergio Pereira Fonseca"` em 2025/2 e como
 * `"Anelise Munaretto Fonseca Mauro Sergio Pereira Fonseca"` em 2026/1 e 2026/2.
 * Sem tratar isso, a mesma dupla vira DUAS unidades e o acervo da turma se parte
 * ao meio — foram 16 duplas fragmentadas nas ofertas versionadas.
 *
 * Cada parte precisa ter ao menos duas palavras: sem essa trava, um docente cujo
 * nome por acaso comece com o nome inteiro de outro seria partido indevidamente.
 * Não casando nada, devolve `null` e a string segue intacta — falhar preservando
 * o dado é melhor do que inventar uma separação.
 */
function partir(raw: string, vocabulario: string[]): string[] | null {
  const duasPalavras = (s: string) => s.trim().split(/\s+/).length >= 2;
  for (const nome of vocabulario) {
    if (raw === nome) return null;
    if (!raw.startsWith(nome + " ")) continue;
    const resto = raw.slice(nome.length + 1).trim();
    if (!duasPalavras(nome) || !duasPalavras(resto)) continue;
    if (vocabulario.includes(resto)) return [nome, resto];
    const adiante = partir(resto, vocabulario);
    if (adiante) return [nome, ...adiante];
  }
  return null;
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

  // Passe 1: vocabulário de docentes individuais, tirado das entradas com vírgula.
  // Passe 2: usa esse vocabulário para partir as entradas em que a fonte perdeu a
  // vírgula. Sem isso a mesma dupla vira duas unidades conforme o semestre.
  const brutos: string[] = [];
  for (const curso of cursos) {
    for (const oferta of Object.values(curso.ofertas)) {
      for (const disciplina of oferta.disciplinas) {
        for (const turma of disciplina.turmas) {
          if (turma.professores_raw?.trim()) brutos.push(turma.professores_raw.trim());
        }
      }
    }
  }
  const vocabulario = vocabularioDeDocentes(brutos);

  for (const curso of cursos) {
    for (const oferta of Object.values(curso.ofertas)) {
      for (const disciplina of oferta.disciplinas) {
        for (const turma of disciplina.turmas) {
          // a unidade é a composição docente DAQUELA turma: turmas diferentes da
          // mesma disciplina, com docentes diferentes, são unidades diferentes
          const nomes = docentesDaTurma(turma, vocabulario);
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
