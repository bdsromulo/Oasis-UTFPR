import type { Matriz, OfertaSemestre } from "./tipos";
import {
  chaveSemestre,
  ofertaReferenciaDoSemestre,
  SEMESTRE_CORRENTE,
  SEMESTRE_PLANEJAMENTO,
} from "./semestres";
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
import matriz823Json from "../../data/eng-mecatronica/matriz-823.json";

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
  /**
   * Semestre aberto por padrão ao entrar no curso.
   *
   * É o de planejamento, não o corrente: quem abre o Oásis está montando a
   * grade do período que vem: a matrícula do corrente já passou, e a oferta
   * dele serve de consulta.
   */
  semestrePadrao: string;
  /**
   * Semestres sem PDF de Turmas Abertas publicado, que a plataforma projeta
   * sobre a oferta real de mesma paridade.
   *
   * Eles NÃO entram em `ofertas`: `oferta.semestre` significa "de onde estas
   * turmas vieram", e reescrevê-lo faria o Oásis afirmar que tem um quadro
   * oficial de 2027.1 que a UTFPR ainda não publicou — justamente o que a
   * etiqueta de provisoriedade precisa poder negar. A resolução acontece em
   * `ofertaDoSemestre`, em tempo de leitura.
   */
  semestresProjetados: string[];
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
  semestrePadrao: SEMESTRE_PLANEJAMENTO,
  semestresProjetados: [SEMESTRE_PLANEJAMENTO],
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
  semestrePadrao: SEMESTRE_PLANEJAMENTO,
  semestresProjetados: [SEMESTRE_PLANEJAMENTO],
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
  semestrePadrao: SEMESTRE_PLANEJAMENTO,
  semestresProjetados: [SEMESTRE_PLANEJAMENTO],
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
  semestrePadrao: SEMESTRE_PLANEJAMENTO,
  semestresProjetados: [SEMESTRE_PLANEJAMENTO],
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
  semestrePadrao: SEMESTRE_PLANEJAMENTO,
  semestresProjetados: [SEMESTRE_PLANEJAMENTO],
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
  semestrePadrao: SEMESTRE_PLANEJAMENTO,
  semestresProjetados: [SEMESTRE_PLANEJAMENTO],
};

// Mecatrônica tem uma das maiores ofertas do Portal. As três versões entram em
// um chunk sob demanda logo depois da primeira renderização; este placeholder
// mantém o contrato síncrono das telas durante os poucos instantes do download.
const OFERTA_MECATRONICA_CARREGANDO: OfertaSemestre = {
  curso: "ENG MECATRÔNICA",
  semestre: SEMESTRE_CORRENTE,
  fonte: "Turmas de Engenharia Mecatrônica em carregamento",
  disciplinas: [],
};

export const ENG_MECATRONICA: DadosCurso = {
  id: "eng-mecatronica-973",
  rotulo: "Engenharia Mecatrônica (973)",
  rotuloCurto: "Eng. Mecatrônica",
  matriz: matriz973Json as unknown as Matriz,
  ofertas: {
    "2026-2": OFERTA_MECATRONICA_CARREGANDO,
  },
  semestrePadrao: SEMESTRE_PLANEJAMENTO,
  semestresProjetados: [SEMESTRE_PLANEJAMENTO],
};

// As matrizes 823 e 973 pertencem ao mesmo curso e consultam a mesma lista de
// Turmas Abertas. O casamento dos códigos atuais com a grade antiga acontece
// pelas 264 equivalências publicadas na própria matriz 823.
export const ENG_MECATRONICA_823: DadosCurso = {
  id: "eng-mecatronica-823",
  rotulo: "Engenharia Mecatrônica (823)",
  rotuloCurto: "Eng. Mecatrônica (823)",
  matriz: matriz823Json as unknown as Matriz,
  ofertas: {
    "2026-2": OFERTA_MECATRONICA_CARREGANDO,
  },
  semestrePadrao: SEMESTRE_PLANEJAMENTO,
  semestresProjetados: [SEMESTRE_PLANEJAMENTO],
};

/** Carrega as três ofertas de Mecatrônica sem bloquear o bundle inicial. */
export async function carregarOfertasHistoricasMecatronica(): Promise<void> {
  const { OFERTAS_MECATRONICA_HISTORICAS } = await import("./ofertasMecatronicaHistoricas");
  Object.assign(ENG_MECATRONICA.ofertas, OFERTAS_MECATRONICA_HISTORICAS);
  Object.assign(ENG_MECATRONICA_823.ofertas, OFERTAS_MECATRONICA_HISTORICAS);
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
  ENG_MECATRONICA_823,
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

/**
 * Semestres navegáveis, do mais recente para o mais antigo: os projetados vêm
 * junto dos que têm oferta própria, porque para quem planeja os dois são
 * períodos possíveis. "2027-1" ordena naturalmente acima de "2026-2".
 */
export function semestresDoCurso(curso: DadosCurso): string[] {
  return [...new Set([...curso.semestresProjetados, ...Object.keys(curso.ofertas)])]
    .sort()
    .reverse();
}

/**
 * Só os semestres com PDF publicado. É o conjunto que `oferta.semestre` pode
 * legitimamente assumir, e a base do espelho de paridade.
 */
export function semestresReaisDoCurso(curso: DadosCurso): string[] {
  return Object.keys(curso.ofertas).sort().reverse();
}

/**
 * Oferta a exibir para um semestre: a própria, quando existe; senão a real de
 * mesma paridade. Resolver aqui, e não guardar uma cópia em `ofertas`, é o que
 * mantém Mecatrônica correta — as ofertas dela chegam por chunk assíncrono, e
 * um espelho materializado na carga do módulo nasceria do placeholder vazio.
 */
export function ofertaDoSemestre(curso: DadosCurso, semestre: string): OfertaSemestre {
  const alvo = chaveSemestre(semestre);
  const conhecidas = semestresReaisDoCurso(curso).map((s) => curso.ofertas[s]);
  return (
    curso.ofertas[alvo] ??
    ofertaReferenciaDoSemestre(alvo, conhecidas) ??
    // Último recurso: a oferta mais recente que existir. Não pode se apoiar em
    // `semestrePadrao`, que é o semestre de planejamento e por definição não tem
    // entrada própria — e um curso pode ter só uma paridade disponível, como
    // Mecatrônica nos instantes antes de o chunk de ofertas chegar.
    conhecidas[0]
  );
}
