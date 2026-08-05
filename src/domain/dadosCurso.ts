import type { Matriz, OfertaSemestre } from "./tipos";
import matriz981Json from "../../data/matriz-981.json";
import matriz806Json from "../../data/matriz-806.json";
import turmasBsi20262 from "../../data/turmas/2026-2.json";
import turmasBsi20261 from "../../data/turmas/2026-1.json";
import turmasBsi20252 from "../../data/turmas/2025-2.json";
import matriz844Json from "../../data/eng-comp/matriz-844.json";
import matriz962Json from "../../data/eng-comp/matriz-962.json";
import turmasEng20262 from "../../data/eng-comp/turmas/2026-2.json";
import turmasEng20261 from "../../data/eng-comp/turmas/2026-1.json";
import turmasEng20252 from "../../data/eng-comp/turmas/2025-2.json";
import matriz968Json from "../../data/eng-eletronica/matriz-968.json";
import turmasEletronica20262 from "../../data/eng-eletronica/turmas/2026-2.json";
import turmasEletronica20261 from "../../data/eng-eletronica/turmas/2026-1.json";
import turmasEletronica20252 from "../../data/eng-eletronica/turmas/2025-2.json";
import matriz978Json from "../../data/eng-controle/matriz-978.json";
import turmasControle20262 from "../../data/eng-controle/turmas/2026-2.json";
import turmasControle20261 from "../../data/eng-controle/turmas/2026-1.json";
import turmasControle20252 from "../../data/eng-controle/turmas/2025-2.json";
import matriz973Json from "../../data/eng-mecatronica/matriz-973.json";
import turmasMecatronica20262 from "../../data/eng-mecatronica/turmas/2026-2.json";

/**
 * Reúne, por curso, a matriz e as ofertas de turma que a interface consome.
 *
 * Sem isto o App importava a matriz 981 e as turmas de BSI direto, no topo do
 * arquivo — o que amarrava toda a tela de Planejamento a um curso só.
 */

export interface DadosCurso {
  id: string;
  rotulo: string;
  rotuloCurto: string;
  matriz: Matriz;
  /** ofertas por semestre, da mais recente para a mais antiga */
  ofertas: Record<string, OfertaSemestre>;
  /** semestre aberto por padrão ao entrar no curso */
  semestrePadrao: string;
  /**
   * Semestres em fase de Pré-Matrícula: a oferta já é oficial (PDF de Turmas
   * Abertas do Portal), mas o período ainda não começou — vagas, horários e a
   * própria lista de turmas ainda podem mudar até a matrícula. NÃO são dados
   * simulados; a etiqueta serve para o aluno saber que o quadro é provisório.
   */
  semestresPreMatricula: string[];
}

const bsi20262 = turmasBsi20262 as unknown as OfertaSemestre;
const eng20262 = turmasEng20262 as unknown as OfertaSemestre;

export const BSI: DadosCurso = {
  id: "bsi-981",
  rotulo: "Bacharelado em Sistemas de Informação",
  rotuloCurto: "BSI",
  matriz: matriz981Json as unknown as Matriz,
  ofertas: {
    "2026-2": bsi20262,
    "2026-1": turmasBsi20261 as unknown as OfertaSemestre,
    "2025-2": turmasBsi20252 as unknown as OfertaSemestre,
  },
  semestrePadrao: "2026-2",
  semestresPreMatricula: ["2026-2"],
};

// A BSI tem uma oferta só por semestre, publicada com os códigos da matriz nova.
// A 806 lê a mesma oferta pela camada de equivalências — 66 das 77 disciplinas
// ofertadas em 2026-1 resolvem para ela, 8 pelo código direto e 58 por
// equivalência. As 11 restantes existem apenas na 981, o que é esperado numa
// oferta compartilhada entre matrizes.
export const BSI_806: DadosCurso = {
  id: "bsi-806",
  rotulo: "Bacharelado em Sistemas de Informação (806)",
  rotuloCurto: "BSI (806)",
  matriz: matriz806Json as unknown as Matriz,
  ofertas: {
    "2026-2": bsi20262,
    "2026-1": turmasBsi20261 as unknown as OfertaSemestre,
    "2025-2": turmasBsi20252 as unknown as OfertaSemestre,
  },
  semestrePadrao: "2026-2",
  semestresPreMatricula: ["2026-2"],
};

// Eng. Comp. tem uma única oferta de Turmas Abertas por semestre (curso "ENG DE
// COMPUTAÇÃO"); as matrizes 844 e 962 apenas a leem por códigos distintos. Por
// isso ambas apontam para o mesmo arquivo de turmas — que é o de Eng. Comp., e
// não o de BSI.
export const ENG_COMP: DadosCurso = {
  id: "eng-comp",
  rotulo: "Engenharia de Computação (844)",
  rotuloCurto: "Eng. Comp. (844)",
  matriz: matriz844Json as unknown as Matriz,
  ofertas: {
    "2026-2": eng20262,
    "2026-1": turmasEng20261 as unknown as OfertaSemestre,
    "2025-2": turmasEng20252 as unknown as OfertaSemestre,
  },
  semestrePadrao: "2026-2",
  semestresPreMatricula: ["2026-2"],
};

export const ENG_COMP_962: DadosCurso = {
  id: "eng-comp-962",
  rotulo: "Engenharia de Computação (962)",
  rotuloCurto: "Eng. Comp. (962)",
  matriz: matriz962Json as unknown as Matriz,
  ofertas: {
    "2026-2": eng20262,
    "2026-1": turmasEng20261 as unknown as OfertaSemestre,
    "2025-2": turmasEng20252 as unknown as OfertaSemestre,
  },
  semestrePadrao: "2026-2",
  semestresPreMatricula: ["2026-2"],
};

// Eng. Eletrônica tem PDF de Turmas Abertas próprio (curso "ENG ELETRÔNICA"),
// separado do de Eng. Comp. 2026-2 vem do PDF oficial do Portal; 2026-1 e
// 2025-2 vêm do backup do Grade na Hora, que é a fonte das ofertas passadas.
// As duas paridades importam: o Simulador de Formatura espelha cada semestre
// futuro na oferta real de mesma paridade, e sem 2026-1 os semestres ímpares
// eram projetados sobre a oferta de um semestre par.
export const ENG_ELETRONICA: DadosCurso = {
  id: "eng-eletronica-968",
  rotulo: "Engenharia Eletrônica (968)",
  rotuloCurto: "Eng. Eletrônica",
  matriz: matriz968Json as unknown as Matriz,
  ofertas: {
    "2026-2": turmasEletronica20262 as unknown as OfertaSemestre,
    "2026-1": turmasEletronica20261 as unknown as OfertaSemestre,
    "2025-2": turmasEletronica20252 as unknown as OfertaSemestre,
  },
  semestrePadrao: "2026-2",
  semestresPreMatricula: ["2026-2"],
};

// Controle e Automação tem oferta própria do Portal. 2026-2 é a fonte oficial
// vigente; as duas ofertas anteriores vêm dos backups HTML do Grade na Hora e
// preservam as duas paridades usadas pelo Simulador de Formatura.
export const ENG_CONTROLE: DadosCurso = {
  id: "eng-controle-978",
  rotulo: "Engenharia de Controle e Automação (978)",
  rotuloCurto: "Eng. Controle",
  matriz: matriz978Json as unknown as Matriz,
  ofertas: {
    "2026-2": turmasControle20262 as unknown as OfertaSemestre,
    "2026-1": turmasControle20261 as unknown as OfertaSemestre,
    "2025-2": turmasControle20252 as unknown as OfertaSemestre,
  },
  semestrePadrao: "2026-2",
  semestresPreMatricula: ["2026-2"],
};

// Mecatrônica tem oferta própria por semestre. 2026-2 vem do PDF oficial de
// Turmas Abertas; 2026-1 e 2025-2 vêm dos backups HTML do Grade na Hora e
// preservam as duas paridades usadas pelo Simulador de Formatura.
export const ENG_MECATRONICA: DadosCurso = {
  id: "eng-mecatronica-973",
  rotulo: "Engenharia Mecatrônica (973)",
  rotuloCurto: "Eng. Mecatrônica",
  matriz: matriz973Json as unknown as Matriz,
  ofertas: {
    "2026-2": turmasMecatronica20262 as unknown as OfertaSemestre,
  },
  semestrePadrao: "2026-2",
  semestresPreMatricula: ["2026-2"],
};

/** Carrega as ofertas passadas de Mecatrônica sem bloquear o bundle inicial. */
export async function carregarOfertasHistoricasMecatronica(): Promise<void> {
  const { OFERTAS_MECATRONICA_HISTORICAS } = await import("./ofertasMecatronicaHistoricas");
  Object.assign(ENG_MECATRONICA.ofertas, OFERTAS_MECATRONICA_HISTORICAS);
}

/**
 * Todos os cursos cobertos. Exportado porque o roster de docentes das avaliações
 * é global — ele varre as ofertas de todos os cursos, não só o do aluno (§6.10),
 * e manter uma segunda lista lá dentro daria drift assim que um curso novo entrar.
 */
export const CURSOS = [
  BSI,
  BSI_806,
  ENG_COMP,
  ENG_COMP_962,
  ENG_ELETRONICA,
  ENG_CONTROLE,
  ENG_MECATRONICA,
];

/** Dados do curso escolhido no check-in, com a BSI como padrão. */
export function dadosDoCurso(id: string | undefined | null): DadosCurso {
  return CURSOS.find((c) => c.id === id) ?? BSI;
}

/** Curso coberto correspondente à matriz detectada no histórico. */
export function dadosDoCursoPorMatriz(matriz: number | null | undefined): DadosCurso | null {
  if (matriz === null || matriz === undefined) return null;
  return CURSOS.find((c) => c.matriz.matriz === matriz) ?? null;
}

/** Semestres que o curso oferece, do mais recente para o mais antigo. */
export function semestresDoCurso(curso: DadosCurso): string[] {
  return Object.keys(curso.ofertas).sort().reverse();
}
