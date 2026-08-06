import type { PerfilAluno, SelecaoTurma } from "./tipos";

/** Formato portátil e versionado dos dados que o aluno decide levar consigo. */
export const VERSAO_SAVEFILE = 1;

export interface PerfilSerializado extends Omit<PerfilAluno, "aprovadas"> {
  aprovadas: string[];
}

export interface DadosSavefile {
  perfil: PerfilSerializado | null;
  preferencias: {
    campus?: string;
    curso?: string;
    matriz?: string;
    semestreAtivo?: string;
  };
  cestasPorSemestre: Record<string, Record<string, SelecaoTurma[]>>;
  exclusoesPorSemestre: Record<string, Record<string, unknown>>;
  gradeAtiva: string;
  gradeParaSimulador: { semestre: string; grade: string } | null;
  ritmoSimulador: number;
  exclusoesSimulador: unknown;
}

export interface SavefileOasis {
  formato: "oasis-utfpr-savefile";
  versao: typeof VERSAO_SAVEFILE;
  exportadoEm: string;
  dados: DadosSavefile;
}

function ehRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function validarSelecao(valor: unknown): valor is SelecaoTurma[] {
  return Array.isArray(valor) && valor.every((item) =>
    ehRegistro(item) && typeof item.codDisciplina === "string" && typeof item.codTurma === "string",
  );
}

function validarCestas(valor: unknown): valor is DadosSavefile["cestasPorSemestre"] {
  if (!ehRegistro(valor)) return false;
  return Object.values(valor).every((cestas) =>
    ehRegistro(cestas) && Object.values(cestas).every(validarSelecao),
  );
}

function validarPerfil(valor: unknown): valor is PerfilSerializado | null {
  if (valor === null) return true;
  return ehRegistro(valor) &&
    typeof valor.nome === "string" &&
    typeof valor.curso === "string" &&
    Array.isArray(valor.aprovadas) && valor.aprovadas.every((codigo) => typeof codigo === "string") &&
    Array.isArray(valor.cursadas);
}

/** Gera somente dados já derivados localmente; o PDF original nunca é incluído. */
export function criarSavefile(dados: Omit<DadosSavefile, "perfil"> & { perfil: PerfilAluno | null }): SavefileOasis {
  return {
    formato: "oasis-utfpr-savefile",
    versao: VERSAO_SAVEFILE,
    exportadoEm: new Date().toISOString(),
    dados: {
      ...dados,
      perfil: dados.perfil ? { ...dados.perfil, aprovadas: [...dados.perfil.aprovadas] } : null,
    },
  };
}

/** Rejeita formatos desconhecidos antes que qualquer dado local seja substituído. */
export function lerSavefile(texto: string): SavefileOasis {
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    throw new Error("O arquivo não contém um JSON válido.");
  }

  if (!ehRegistro(bruto) || bruto.formato !== "oasis-utfpr-savefile") {
    throw new Error("Este arquivo não é um savefile do Oásis UTFPR.");
  }
  if (bruto.versao !== VERSAO_SAVEFILE) {
    throw new Error("Esta versão do savefile ainda não é compatível com o Oásis.");
  }
  if (!ehRegistro(bruto.dados)) {
    throw new Error("O savefile não contém dados de perfil e planejamento válidos.");
  }

  const dados = bruto.dados;
  if (!validarPerfil(dados.perfil) || !validarCestas(dados.cestasPorSemestre) ||
      !ehRegistro(dados.preferencias) || !ehRegistro(dados.exclusoesPorSemestre) ||
      typeof dados.gradeAtiva !== "string" || typeof dados.ritmoSimulador !== "number") {
    throw new Error("O savefile está incompleto ou foi alterado.");
  }

  const gradeParaSimulador = dados.gradeParaSimulador;
  if (gradeParaSimulador !== null &&
      (!ehRegistro(gradeParaSimulador) || typeof gradeParaSimulador.semestre !== "string" || typeof gradeParaSimulador.grade !== "string")) {
    throw new Error("A referência de grade do savefile é inválida.");
  }

  return bruto as unknown as SavefileOasis;
}

export function desserializarPerfil(perfil: PerfilSerializado | null): PerfilAluno | null {
  return perfil ? { ...perfil, aprovadas: new Set(perfil.aprovadas) } : null;
}
