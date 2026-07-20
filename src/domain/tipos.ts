// Tipos canônicos da plataforma. Espelham data/matriz-981.json e data/turmas/*.json.

// ---------- matriz ----------
export interface Matriz {
  matriz: number;
  curso: string;
  campus: string;
  cargas: {
    obrigatorias: number;
    optativas: number;
    extensao: number;
    eletiva: number;
    soma: number;
    soma_sem_ext: number;
    chext_disc_obrigatorias: number;
    chext_disc_optativas: number;
    ch_total_ppc: number;
  };
  conjuntos: Record<string, Conjunto>;
  eletiva: { ch: number; periodo_inicial: number; periodo_final: number; prereq_periodo: number };
  disciplinas: DisciplinaMatriz[];
}

export interface Conjunto {
  nome: string;
  periodo_inicial: number;
  periodo_final: number;
  ch: number;
  ch_semanal: number | null;
}

export interface DisciplinaMatriz {
  codigo: string;
  nome: string;
  periodo: number;
  /** null = obrigatória do 1º estrato; 1159 = 2º estrato; 1161 = humanidades; 1162..1173 = trilhas */
  conjunto: number | null;
  modelo: string;
  aulas_semanais: { teoricas: number; praticas: number; total: number; aps: number; apcc: number };
  horas: { ad: number; chext: number; chead: number; total: number };
  /** códigos de disciplina ou "Período:N" */
  prerequisitos: string[];
  equivalentes: { codigo: string; cht: number | null; grupo: string | null }[];
}

// ---------- turmas do semestre ----------
export interface OfertaSemestre {
  curso: string;
  semestre: string;
  fonte: string;
  disciplinas: DisciplinaOfertada[];
}

export interface DisciplinaOfertada {
  codigo: string;
  nome: string;
  aulas_semanais_presenciais: number | null;
  aulas_semanais_assincronas: number | null;
  horas_semestrais_extensionistas: number | null;
  turmas: Turma[];
}

export interface Turma {
  codigo: string;
  enquadramento: string;
  vagas_total: number | null;
  vagas_calouros: number | null;
  reserva: string;
  prioridade_cursos: { ordem: number; curso: string }[];
  horarios: Horario[];
  professores?: string[];
  professores_raw: string;
  optativa_matrizes: string[];
  optativa: boolean;
  /** Se criada via equivalência/agrupamento no catálogo, indica o código original da disciplina onde a turma existe (ex: "IF69D") */
  codDisciplinaOriginal?: string;
  /** Se criada via equivalência/agrupamento no catálogo, indica o código original da turma (ex: "S11") */
  codTurmaOriginal?: string;
}

export interface Horario {
  /** 2=segunda .. 7=sábado */
  dia: number;
  turno: "M" | "T" | "N";
  /** 1..6 */
  aula: number;
  sala: string | null;
  sede: "Centro" | "Ecoville" | "Neoville";
}

// ---------- perfil do aluno (derivado do Histórico Escolar; nunca sai do navegador) ----------
export type Situacao =
  | "aprovado"
  | "reprovado"
  | "consignado"
  | "cancelado"
  | "cursando"
  | "dispensado";

export interface DisciplinaCursada {
  codigo: string;
  nome: string;
  situacao: Situacao;
  /** "obrigatoria" | "optativa" (2º estrato/trilhas/humanidades) | "eletiva" */
  origem: "obrigatoria" | "optativa" | "eletiva";
  /**
   * Só para origem "eletiva": coluna "Validado" da tabela de eletivas. O parser
   * guarda apenas as validadas — uma eletiva não validada é reprovação ou teve o
   * crédito consumido por convalidação numa obrigatória, e em nenhum dos casos
   * conta como eletiva.
   */
  validado?: boolean;
  media: number | null;
  frequencia: number | null;
  cht: number | null;
  ano: number | null;
  semestre: number | null;
}

export interface ResumoConjunto {
  conjunto: string;
  nome: string;
  chObrigatoria: number;
  chCursadaAprovada: number;
  chFaltante: number | "faltantes";
  chValidada: number;
}

export interface PerfilAluno {
  nome: string;
  matricula: string | null;
  curso: string;
  matriz: number | null;
  periodo: number | null;
  coefAbsoluto: number | null;
  coefNormalizado: number | null;
  ingresso: string | null;
  cursadas: DisciplinaCursada[];
  /** códigos com aprovação/consignação (contam para pré-requisito) */
  aprovadas: Set<string>;
  matriculadas: { codigo: string; nome: string; turma: string; situacao: string }[];
  obrigatoriasFaltantes: { periodo: number; codigo: string; nome: string }[];
  dependencias: { codigo: string; nome: string }[];
  resumoConjuntos: ResumoConjunto[];
  eletivas: {
    chCursadaAprovada: number;
    chFaltante: number;
    chValidada: number;
    chTotal: number;
  } | null;
  extensao: { chTotal: number; chCursada: number; chFaltante: number } | null;
  resumoGeral: {
    obrigatorias: { total: number; aprovada: number; faltante: number };
    optativas: { total: number; aprovada: number; faltante: number };
    eletivas: { total: number; aprovada: number; faltante: number };
  } | null;
  dataEmissao?: string | null;
  periodoDocumento?: string | null;
  avisos: string[];
}

export interface SelecaoTurma {
  codDisciplina: string;
  codTurma: string;
}
