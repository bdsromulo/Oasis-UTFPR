import type { DadosCurso } from "../dadosCurso";
import type { DisciplinaCursada, Matriz } from "../tipos";
import { criarMapaIdentidade } from "../motor/identidade";
import { podeSerAvaliada, type AlvoAvaliacao } from "./forms";

/** Procura o nome público de um código em matrizes e ofertas versionadas. */
export function nomeDaDisciplinaParaAvaliacao(
  codigo: string,
  matrizDoAluno: Matriz,
  cursos: DadosCurso[],
): string | undefined {
  const naMatrizDoAluno = matrizDoAluno.disciplinas.find((d) => d.codigo === codigo)?.nome;
  if (naMatrizDoAluno) return naMatrizDoAluno;

  for (const curso of cursos) {
    const naMatriz = curso.matriz.disciplinas.find((d) => d.codigo === codigo)?.nome;
    if (naMatriz) return naMatriz;
  }
  for (const curso of cursos) {
    for (const oferta of Object.values(curso.ofertas)) {
      const naOferta = oferta.disciplinas.find((d) => d.codigo === codigo)?.nome;
      if (naOferta) return naOferta;
    }
  }
  return undefined;
}

/**
 * Converte uma linha do histórico no alvo usado pela coleta.
 *
 * A experiência é identificada pelo código efetivamente cursado; o código da
 * matriz continua ao lado para o acervo e o Planejamento resolverem equivalência.
 */
export function criarAlvoAvaliacao(
  cursada: DisciplinaCursada,
  matrizDoAluno: Matriz,
  cursos: DadosCurso[],
  codigosDeEstagio: readonly string[] = [],
): AlvoAvaliacao | null {
  const mapa = criarMapaIdentidade(matrizDoAluno);
  const codigoReal = cursada.codigoOriginal ?? cursada.codigo;
  const nome =
    nomeDaDisciplinaParaAvaliacao(codigoReal, matrizDoAluno, cursos) ??
    nomeDaDisciplinaParaAvaliacao(cursada.codigo, matrizDoAluno, cursos) ??
    (cursada.nome?.trim() || codigoReal);

  if (!podeSerAvaliada({ ...cursada, nome }, codigosDeEstagio)) return null;

  return {
    codigo: codigoReal,
    codigoCanonico: mapa.resolver(cursada.codigo),
    nome,
    semestre: `${cursada.ano}/${cursada.semestre}`,
    situacao: cursada.situacao as "aprovado" | "consignado",
    professoresHistorico: cursada.professores,
  };
}
