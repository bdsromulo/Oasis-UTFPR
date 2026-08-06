import type { DadosCurso } from "../dadosCurso";
import type { DisciplinaCursada, Matriz } from "../tipos";
import { criarMapaIdentidade } from "../motor/identidade";
import { nomeDeEletiva } from "../eletivas";
import { podeSerAvaliada, type AlvoAvaliacao } from "./forms";

/**
 * Uma eletiva só entra na coleta quando existe uma oferta versionada que também
 * alimenta o roster de docentes. A tabela de eletivas do Histórico Escolar não
 * traz professor; aceitar apenas o nome digitado criaria uma resposta que a
 * ingestão deixaria pendente e que nunca apareceria no acervo público.
 */
function temDocenteVersionado(codigos: readonly string[], cursos: DadosCurso[]): boolean {
  const procurados = new Set(codigos);
  for (const curso of cursos) {
    for (const oferta of Object.values(curso.ofertas)) {
      for (const disciplina of oferta.disciplinas) {
        if (!procurados.has(disciplina.codigo)) continue;
        if (disciplina.turmas.some((turma) =>
          !!turma.professores_raw?.trim() || !!turma.professores?.some((nome) => nome.trim()),
        )) return true;
      }
    }
  }
  return false;
}

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
  return nomeDeEletiva(codigo) ?? undefined;
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
    cursada.nome?.trim();

  // Um código sozinho não identifica publicamente a experiência e fazia o
  // formulário aceitar exatamente os alvos quebrados que esta camada deveria
  // impedir. Eletivas observadas entram pela pool versionada; uma desconhecida
  // fica fora até ter nome confirmado por matriz, oferta, PDF ou curadoria.
  if (!nome || nome === codigoReal || nome === cursada.codigo) return null;

  if (
    cursada.origem === "eletiva" &&
    !temDocenteVersionado([codigoReal, cursada.codigo], cursos)
  ) return null;

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
