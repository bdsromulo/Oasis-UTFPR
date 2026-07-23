import type { Matriz, OfertaSemestre } from "./tipos";
import matriz981Json from "../../data/matriz-981.json";
import turmasBsi20261 from "../../data/turmas/2026-1.json";
import turmasBsi20252 from "../../data/turmas/2025-2.json";
import matriz844Json from "../../data/eng-comp/matriz-844.json";
import turmasEng20261 from "../../data/eng-comp/turmas/2026-1.json";
import turmasEng20252 from "../../data/eng-comp/turmas/2025-2.json";

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
  /** semestres cujos dados são simulados, não oficiais */
  semestresPrevia: string[];
}

/**
 * 2026.2 ainda não tem PDF oficial de turmas. A prévia herda a oferta de 2025.2
 * removendo o que sabidamente não abre, e fica marcada como simulada para o
 * aluno não confundir com dado do Portal.
 */
function previaBsi20262(base: OfertaSemestre): OfertaSemestre {
  return {
    ...base,
    semestre: "2026-2",
    fonte: "Simulação prévia (baseada nas ofertas de 2025.2)",
    disciplinas: base.disciplinas.filter(
      (d) =>
        d.codigo !== "ICSH41" &&
        !d.nome.toLowerCase().includes("avaliação em interação humano-computador"),
    ),
  };
}

const bsi20252 = turmasBsi20252 as unknown as OfertaSemestre;

export const BSI: DadosCurso = {
  id: "bsi-981",
  rotulo: "Bacharelado em Sistemas de Informação",
  rotuloCurto: "BSI",
  matriz: matriz981Json as unknown as Matriz,
  ofertas: {
    "2026-2": previaBsi20262(bsi20252),
    "2026-1": turmasBsi20261 as unknown as OfertaSemestre,
    "2025-2": bsi20252,
  },
  semestrePadrao: "2026-2",
  semestresPrevia: ["2026-2"],
};

export const ENG_COMP: DadosCurso = {
  id: "eng-comp",
  rotulo: "Engenharia de Computação",
  rotuloCurto: "Eng. Computação",
  matriz: matriz844Json as unknown as Matriz,
  ofertas: {
    "2026-1": turmasEng20261 as unknown as OfertaSemestre,
    "2025-2": turmasEng20252 as unknown as OfertaSemestre,
  },
  // sem prévia: só há oferta oficial de 2026.1 e o backup do GNH de 2025.2
  semestrePadrao: "2026-1",
  semestresPrevia: [],
};

const CURSOS = [BSI, ENG_COMP];

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
