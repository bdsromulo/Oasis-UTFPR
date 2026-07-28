import type {
  DisciplinaMatriz,
  DisciplinaOfertada,
  Matriz,
  OfertaSemestre,
  PerfilAluno,
  SelecaoTurma,
  Turma,
} from "../tipos";
import {
  cargaAprovadaBlocoOptativo,
  contaNoBlocoOptativo,
  descricaoDoCurso,
  ehGrupoOpcao,
  ehTrilha,
  categoriaSimples,
  grupoOpcaoDe,
  TETO_CH_SEMESTRE,
} from "../cursos";
import { criarMapaIdentidade, type MapaIdentidade } from "./identidade";
import { buscarOfertaParaPlanejamento, cumpre } from "./elegiveis";
import { haveriaConflito, itensDaSelecao, type ItemGrade } from "./grade";
import {
  calcularPesoPrioridadeTurma,
  disciplinaEstaExcluida,
  turmaViolaProfessores,
} from "./grade-magica";

/**
 * Simulador de formatura.
 *
 * Premissa do planejamento: o aluno cursa **o mínimo necessário** para bater o piso
 * de horas de cada categoria da matriz — não se cursa nada além do exigido. As
 * obrigatórias são a única categoria em que o "mínimo" é o roster inteiro; nas
 * demais o motor escolhe o menor conjunto de disciplinas que fecha a carga.
 *
 * A sazonalidade é **empírica**: sai da oferta real dos semestres conhecidos, e não
 * da paridade do período na matriz. Isso importa porque, na matriz 981, todas as
 * obrigatórias de sala de aula abriram tanto em 2025.2 quanto em 2026.1 — supor que
 * uma obrigatória de período par só abre em semestre par atrasaria a projeção sem
 * respaldo nos dados.
 */

// ---------------------------------------------------------------- sazonalidade

export type Sazonalidade = "ambos" | "primeiro" | "segundo" | "sem_oferta";

export interface MapaSazonalidade {
  de(codigo: string): Sazonalidade;
  /** semestres observados que alimentaram a inferência */
  semestresObservados: string[];
}

function ehSemestrePar(semestre: string): boolean {
  return /[-.]2$/.test(semestre);


}

/**
 * Infere, para cada disciplina, em quais semestres do ano ela costuma abrir,
 * cruzando as ofertas conhecidas. Disciplina nunca vista vira "sem_oferta".
 */
export function inferirSazonalidade(ofertas: OfertaSemestre[], mapa: MapaIdentidade): MapaSazonalidade {
  const emPar = new Set<string>();
  const emImpar = new Set<string>();
  for (const o of ofertas) {
    const alvo = ehSemestrePar(o.semestre) ? emPar : emImpar;
    for (const d of o.disciplinas) {
      const canonicoDaOferta = mapa.resolver(d.codigo);
      const canonicoPorNome = mapa.resolverPorNome(d.nome);
      const canonico = (canonicoDaOferta !== d.codigo) ? canonicoDaOferta : (canonicoPorNome || d.codigo);
      alvo.add(canonico);
    }
  }
  const viuPar = ofertas.some((o) => ehSemestrePar(o.semestre));
  const viuImpar = ofertas.some((o) => !ehSemestrePar(o.semestre));

  return {
    semestresObservados: ofertas.map((o) => o.semestre),
    de(codigo) {
      const p = emPar.has(codigo);
      const i = emImpar.has(codigo);
      if (p && i) return "ambos";
      // com apenas um semestre observado não dá para afirmar exclusividade
      if (p) return viuImpar ? "segundo" : "ambos";
      if (i) return viuPar ? "primeiro" : "ambos";
      return "sem_oferta";
    },
  };
}

export function rotuloSazonalidade(s: Sazonalidade): string {
  switch (s) {
    case "ambos":
      return "Abre nos dois semestres";
    case "primeiro":
      return "Só abriu em 1º semestre (.1)";
    case "segundo":
      return "Só abriu em 2º semestre (.2)";
    case "sem_oferta":
      return "Sem oferta nos semestres conhecidos";
  }
}

// ------------------------------------------------------------------ semestres

/** "2026-1" -> "2026-2" -> "2027-1" */
export function proximoSemestre(semestre: string): string {
  const [anoStr, semStr] = semestre.replace(".", "-").split("-");
  const ano = parseInt(anoStr, 10) || 2026;
  const sem = parseInt(semStr, 10) || 1;
  return sem === 1 ? `${ano}-2` : `${ano + 1}-1`;
}

export function formatarSemestre(semestre: string): string {
  const [ano, sem] = semestre.replace(".", "-").split("-");
  return `${ano}.${sem}`;
}

export function formatarSemestreExtenso(semestre: string): string {
  const [ano, sem] = semestre.replace(".", "-").split("-");
  return `${sem === "2" ? "2º" : "1º"} semestre de ${ano}`;
}

/** "2026.2" e "2026-2" são o mesmo semestre; a fonte usa as duas grafias. */
function chaveSemestre(semestre: string): string {
  return semestre.replace(".", "-");
}

/**
 * Oferta que serve de espelho para um semestre projetado.
 *
 * A grade que a projeção monta precisa ser concreta o bastante para não colidir
 * consigo mesma, e as únicas turmas que existem são as dos semestres conhecidos.
 * Então cada semestre futuro herda a oferta conhecida mais recente de **mesma
 * paridade**: 2026.2 usa a própria 2026.2, 2027.1 usa 2026.1, 2027.2 volta à
 * 2026.2, 2028.1 à 2026.1, e assim em diante.
 *
 * Sem esse espelho o simulador escolhia disciplinas sem olhar horário e a
 * importação para o Planejamento acusava choque na grade que o próprio
 * simulador havia montado.
 */
export function ofertaReferenciaDoSemestre(
  semestre: string,
  ofertas: OfertaSemestre[],
): OfertaSemestre | null {
  const alvo = chaveSemestre(semestre);
  const exata = ofertas.find((o) => chaveSemestre(o.semestre) === alvo);
  if (exata) return exata;
  const mesmaParidade = ofertas
    .filter((o) => ehSemestrePar(o.semestre) === ehSemestrePar(semestre))
    .sort((a, b) => chaveSemestre(b.semestre).localeCompare(chaveSemestre(a.semestre)));
  return mesmaParidade[0] ?? null;
}

// ----------------------------------------------------------------- categorias

export type IdCategoria =
  | "obrigatorias"
  | "segundoEstrato"
  | "humanidades"
  // bloco próprio da matriz 962; cursos sem ele ficam com exigido 0 e somem da lista
  | "expressaoGrafica"
  // os 25 grupos "Opções de …" da matriz 968, somados; nos demais cursos fica 0
  | "opcoes"
  | "trilhas"
  | "eletivas"
  // horas de extensão: vêm embutidas no CHEXT das disciplinas, não de um conjunto
  | "extensao";

export interface Requisito {
  id: IdCategoria;
  nome: string;
  exigido: number;
  cumprido: number;
  faltante: number;
  /** horas que a projeção planeja cursar para fechar a categoria */
  planejado: number;
  atendido: boolean;
}

export interface DisciplinaPlanejada {
  codigo: string;
  nome: string;
  horas: number;
  categoria: IdCategoria;
  sazonalidade: Sazonalidade;
  /** estágio e atividades complementares não ocupam vaga na grade de aulas */
  ocupaVaga: boolean;
  /** trilha à qual pertence, quando aplicável */
  conjunto: number | null;
  /**
   * Preenchido quando a disciplina entrou no plano apesar de uma exclusão pedida
   * pelo aluno: sem ela não há como integralizar, então o motor a mantém e diz
   * por quê, em vez de devolver uma projeção que não fecha.
   */
  exclusaoIgnorada?: { tipo: TipoExclusao; alvo: string; motivo: string };
  /**
   * Turma reservada na oferta-espelho do semestre. Vem preenchida quando a
   * disciplina tem turma com horário: é ela que garante que a grade projetada
   * fecha sem choque e que a importação para o Planejamento não inventa turma.
   */
  turma: string | null;
  /** código sob o qual a turma aparece na oferta (pode ser um equivalente) */
  codigoOferta: string | null;
}

export interface SemestreProjetado {
  semestre: string;
  disciplinas: DisciplinaPlanejada[];
  /** carga total do semestre, incluindo o que não ocupa vaga de aula */
  horas: number;
  /**
   * Carga que disputa vaga de aula — é esta que responde ao teto de matrícula
   * (`TETO_CH_SEMESTRE`). Fica de fora o que o aluno cursa em paralelo às aulas:
   * estágio, atividades complementares, TCC e a atividade extensionista. Por
   * isso um semestre pode mostrar 405h de sala e 605h no total.
   */
  chAula: number;
  /**
   * Matérias que o semestre pede — é o número que a tela mostra, e ele tem de
   * bater com a lista logo abaixo dele.
   *
   * Conta estágio, TCC e atividades complementares, que são disciplinas da
   * matriz ainda que não ocupem vaga de aula. Só a atividade extensionista fica
   * de fora: ela não é matéria, é carga a cumprir em projeto que o aluno escolhe.
   */
  materias: number;
  /**
   * Quantas dessas matérias disputam vaga de aula — este é o número limitado
   * pelo ritmo escolhido na tela, e por isso pode ser menor que `materias`.
   */
  vagasOcupadas: number;
  /** semestre cuja oferta real serviu de espelho para montar este */
  semestreReferencia: string | null;
  /** true quando o semestre veio pronto do Planejamento de Matrícula */
  fixadoPeloPlanejamento?: boolean;
}

/** Uma linha da grade que o Planejamento de Matrícula entrega ao simulador. */
export interface ItemGradeFixada {
  /** código canônico na matriz, quando a disciplina existe nela */
  codigoMatriz: string | null;
  /** código sob o qual a turma foi ofertada (pode ser um equivalente) */
  codigoOferta: string;
  turma: string;
  nome: string;
  horas: number;
}

/**
 * Grade já montada que o simulador deve tomar como fato, em vez de projetar.
 * É o caminho de volta da importação: o Planejamento manda o semestre real que o
 * aluno montou e o motor calcula os demais semestres a partir dele.
 */
export interface GradeFixada {
  semestre: string;
  /** rótulo de origem para a tela ("Grade A do Planejamento", por exemplo) */
  origem?: string;
  itens: ItemGradeFixada[];
}

/**
 * Traduz a seleção de turmas do Planejamento na grade fixada que o motor consome.
 * Resolve cada código da oferta para o canônico da matriz — sem isso as turmas
 * abertas sob código de equivalente (a regra em Eng. Comp.) entrariam como
 * eletiva genérica e a projeção cobraria de novo a disciplina que o aluno já
 * planejou cursar.
 */
export function gradeFixadaDaSelecao(
  semestre: string,
  oferta: OfertaSemestre,
  selecao: SelecaoTurma[],
  matriz: Matriz,
  origem?: string,
): GradeFixada {
  const mapa = criarMapaIdentidade(matriz);
  const porCodigo = new Map(matriz.disciplinas.map((d) => [d.codigo, d]));
  const itens: ItemGradeFixada[] = [];

  for (const item of itensDaSelecao(oferta, selecao)) {
    const codOferta = item.disciplina.codigo;
    const canonicoDireto = mapa.resolver(codOferta);
    const canonicoPorNome = mapa.resolverPorNome(item.disciplina.nome);
    const canonico =
      canonicoDireto !== codOferta ? canonicoDireto : (canonicoPorNome ?? codOferta);
    const dMatriz = porCodigo.get(canonico);
    const aulas =
      (item.disciplina.aulas_semanais_presenciais ?? 0) +
      (item.disciplina.aulas_semanais_assincronas ?? 0);
    itens.push({
      codigoMatriz: dMatriz?.codigo ?? null,
      // preserva exatamente o par que o Planejamento guarda, para o caminho de
      // volta (simulador -> Planejamento) reencontrar a mesma turma
      codigoOferta: item.selecaoOriginal?.codDisciplina ?? codOferta,
      turma: item.selecaoOriginal?.codTurma ?? item.turma.codigo,
      nome: dMatriz?.nome ?? item.disciplina.nome,
      horas: dMatriz?.horas.total ?? aulas * 15,
    });
  }

  return { semestre: chaveSemestre(semestre), origem, itens };
}

export type TipoExclusao = "disciplina" | "professor" | "trilha";

/**
 * Filtros de exclusão, os mesmos da Sugestão de Grade: o aluno diz o que NÃO
 * quer cursar. Aqui eles são pedidos, não ordens — a integralização manda.
 */
export interface ExclusoesSimulacao {
  /** disciplinas que o aluno não quer cursar (código ou {codigo, nome}) */
  disciplinas?: ({ codigo: string; nome: string } | string)[];
  /** docentes cujas turmas devem ser evitadas */
  professores?: string[];
  /** conjuntos de trilha que não devem ser usados para fechar o bloco optativo */
  trilhas?: string[];
}

/**
 * Exclusão que o motor teve de desrespeitar para a projeção fechar.
 *
 * A tela precisa dizer as duas coisas ao mesmo tempo: que o pedido é impossível
 * e o que exatamente entrou no plano contra a vontade do aluno. Devolver só um
 * "não deu" deixaria a linha do tempo mentindo.
 */
export interface ExclusaoImpossivel {
  tipo: TipoExclusao;
  /** código da disciplina, nome do docente ou conjunto da trilha */
  alvo: string;
  /** rótulo legível para a tela */
  rotulo: string;
  /** por que não havia como respeitar o pedido */
  motivo: string;
  /** disciplinas do plano que carregam a violação */
  disciplinas: string[];
}

export interface ResultadoSimulacao {
  semestres: SemestreProjetado[];
  /** null quando a projeção não fecha dentro do horizonte */
  semestreFormatura: string | null;
  requisitos: Requisito[];
  horasRestantes: number;
  avisos: string[];
  /** trilhas que a projeção fecha integralmente (90h cada) */
  trilhasFechadas: { conjunto: number; nome: string; horas: number }[];
  /** quantas trilhas o curso exige validar (piso à parte do total de horas) */
  trilhasExigidas: number;
  /** exclusões pedidas que a integralização não permitiu respeitar */
  exclusoesImpossiveis: ExclusaoImpossivel[];
}

function categoriaDe(d: DisciplinaMatriz, matriz: Matriz): IdCategoria | null {
  if (d.conjunto === null) return "obrigatorias";
  const curso = descricaoDoCurso(matriz);
  const simples = categoriaSimples(curso, d.conjunto);
  // a pool de eletivas é tratada à parte, como vaga genérica
  if (simples) return simples.id === "eletivas" ? null : (simples.id as IdCategoria);
  if (ehGrupoOpcao(curso, d.conjunto)) return "opcoes";
  if (contaNoBlocoOptativo(curso, d.conjunto)) return "trilhas";
  return null;
}

/** Estágio e atividades complementares não são turma: não disputam vaga na grade. */
function ocupaVaga(d: DisciplinaMatriz): boolean {
  return d.aulas_semanais.total > 0 && !d.codigo.startsWith("ENADE");
}

/**
 * É matéria para efeito de contagem na tela?
 *
 * Tudo que o aluno vai cursar conta — inclusive estágio, TCC e atividades
 * complementares, que não ocupam vaga de aula mas são disciplinas da matriz e
 * aparecem na lista do semestre. A atividade extensionista é a única exceção:
 * ela não é disciplina, é carga a cumprir em projeto que o aluno ainda escolhe.
 */
export function ehMateria(d: DisciplinaPlanejada): boolean {
  return d.codigo !== "EXTENSAO";
}

/** "Período:4" -> 4 */
function periodoExigido(prereq: string): number | null {
  const m = /^Per[ií]odo:(\d+)$/i.exec(prereq.trim());
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Horas já cumpridas por categoria. Vem do Quadro Resumo do histórico, que é a
 * consolidação oficial (já aplica os tetos por categoria) — recontar as cursadas
 * daria número diferente do que o Portal reconhece.
 */
function cumpridoPorCategoria(perfil: PerfilAluno | null, matriz: Matriz): Record<IdCategoria, number> {
  const zero: Record<IdCategoria, number> = {
    obrigatorias: 0,
    segundoEstrato: 0,
    humanidades: 0,
    expressaoGrafica: 0,
    opcoes: 0,
    trilhas: 0,
    eletivas: 0,
    extensao: 0,
  };
  if (!perfil) return zero;

  const porConjunto = new Map(perfil.resumoConjuntos.map((r) => [r.conjunto, r]));
  const somaConjunto = (cod: string) => porConjunto.get(cod)?.chCursadaAprovada ?? 0;

  // O 3º estrato NÃO tem teto de contagem por trilha: as horas que passam das
  // 90h de uma trilha continuam valendo para as 345h. As 90h são o limiar para
  // VALIDAR a trilha, coisa diferente. O PPC (p.101) diz: "além das 270h a serem
  // cursadas em três trilhas (90h cada), devem ser cursadas 75h" — essas 75h
  // podem cair numa trilha já completa ou espalhadas por outras. O agregado do
  // conjunto 1160 no histórico confirma: soma as horas cruas, sem teto.
  const curso = descricaoDoCurso(matriz);
  const agregado = curso.agregadorTrilhas
    ? porConjunto.get(String(curso.agregadorTrilhas))?.chCursadaAprovada
    : undefined;
  const optativasConsolidadas =
    curso.matriz === 844
      ? cargaAprovadaBlocoOptativo(perfil, curso)
      : undefined;
  let trilhas = optativasConsolidadas ?? agregado ?? 0;
  if (optativasConsolidadas === undefined && agregado === undefined) {
    for (const cod of Object.keys(matriz.conjuntos)) {
      if (contaNoBlocoOptativo(curso, cod)) trilhas += somaConjunto(cod);
    }
  }

  return {
    obrigatorias: perfil.resumoGeral?.obrigatorias.aprovada ?? 0,
    segundoEstrato: somaConjunto(String(curso.categorias.find((c: { id: string }) => c.id === "segundoEstrato")?.conjunto)),
    humanidades: somaConjunto(String(curso.categorias.find((c: { id: string }) => c.id === "humanidades")?.conjunto)),
    expressaoGrafica: somaConjunto(String(curso.categorias.find((c: { id: string }) => c.id === "expressaoGrafica")?.conjunto)),
    // Cada grupo de escolha tem linha própria no Resumo Optativas do histórico;
    // o bloco é a soma delas. Confere com a coluna (E) do Quadro Resumo.
    opcoes: (curso.gruposOpcao ?? []).reduce((total, g) => total + somaConjunto(String(g)), 0),
    trilhas,
    eletivas: perfil.eletivas ? perfil.eletivas.chTotal - perfil.eletivas.chFaltante : 0,
    extensao: perfil.extensao?.chCursada ?? 0,
  };
}

export interface OpcoesSimulacao {
  /** matérias por semestre que o aluno pretende cursar */
  ritmo: number;
  semestreInicial: string;
  /** teto de semestres projetados, trava contra laço infinito */
  horizonte?: number;
  /**
   * Grade que o aluno já montou no Planejamento de Matrícula. O semestre
   * correspondente entra na projeção exatamente como está — turma por turma — e
   * os seguintes são calculados a partir dele.
   */
  gradeFixada?: GradeFixada | null;
  /** o que o aluno pediu para não cursar */
  exclusoes?: ExclusoesSimulacao | null;
}

/**
 * Projeta a trajetória até a formatura.
 */
export function simularFormatura(
  perfilOriginal: PerfilAluno | null,
  matriz: Matriz,
  ofertas: OfertaSemestre[],
  opcoes: OpcoesSimulacao,
): ResultadoSimulacao {
  let perfil = perfilOriginal
    ? { ...perfilOriginal, aprovadas: new Set(perfilOriginal.aprovadas) }
    : null;

  const mapa = criarMapaIdentidade(matriz);
  const { ritmo, semestreInicial } = opcoes;
  const horizonte = opcoes.horizonte ?? 20;
  const gradeFixada = opcoes.gradeFixada ?? null;
  const usarPrioridadeBsi = matriz.matriz === 981;
  const saz = inferirSazonalidade(ofertas, mapa);
  const cursoDesc = descricaoDoCurso(matriz);
  const trilhasExigidas = cursoDesc.trilhasExigidas;
  const avisos: string[] = [];

  // ---- exclusões pedidas pelo aluno ------------------------------------
  // São pedidos, não ordens: quando respeitar a exclusão impede a formatura, o
  // motor a desrespeita, marca a disciplina e explica na lista de impossíveis.
  const exclusoes = opcoes.exclusoes ?? {};
  const disciplinasExcluidas = exclusoes.disciplinas ?? [];
  const professoresExcluidos = (exclusoes.professores ?? []).filter((p) => p.trim());
  const trilhasExcluidas = new Set((exclusoes.trilhas ?? []).map(String));
  const exclusoesImpossiveis: ExclusaoImpossivel[] = [];

  const excluidaPeloAluno = (d: DisciplinaMatriz) =>
    disciplinaEstaExcluida({ codigo: d.codigo, nome: d.nome }, disciplinasExcluidas);

  /** Registra (ou complementa) uma exclusão que a integralização não permitiu honrar. */
  function registrarImpossivel(
    tipo: TipoExclusao,
    alvo: string,
    rotulo: string,
    motivo: string,
    disciplina?: string,
  ) {
    let reg = exclusoesImpossiveis.find((x) => x.tipo === tipo && x.alvo === alvo);
    if (!reg) {
      reg = { tipo, alvo, rotulo, motivo, disciplinas: [] };
      exclusoesImpossiveis.push(reg);
    }
    if (disciplina && !reg.disciplinas.includes(disciplina)) reg.disciplinas.push(disciplina);
  }

  /**
   * Marca, na disciplina planejada, que ela entrou apesar de um pedido de
   * exclusão — e anexa a disciplina ao registro de impossibilidade, para a tela
   * poder listar o estrago concreto de cada pedido negado.
   */
  const violacaoDe = (d: DisciplinaMatriz): DisciplinaPlanejada["exclusaoIgnorada"] => {
    const registro = (tipo: TipoExclusao, alvo: string) => {
      const reg = exclusoesImpossiveis.find((x) => x.tipo === tipo && x.alvo === alvo);
      if (!reg) return undefined;
      if (!reg.disciplinas.includes(d.codigo)) reg.disciplinas.push(d.codigo);
      return { tipo, alvo, motivo: reg.motivo };
    };
    if (excluidaPeloAluno(d)) {
      const r = registro("disciplina", d.codigo);
      if (r) return r;
    }
    // trilha excluída que precisou virar trilha-alvo mesmo assim
    if (d.conjunto !== null && trilhasExcluidas.has(String(d.conjunto))) {
      const r = registro("trilha", String(d.conjunto));
      if (r) return r;
    }
    return undefined;
  };

  const cumprido = cumpridoPorCategoria(perfil, matriz);

  // Obrigatórias: o cumprido sai do próprio roster (soma exatamente a carga da
  // matriz), e não do Quadro Resumo. Assim o "já concluído" e o "a planejar"
  // falam da mesma lista de disciplinas e nunca somam mais que o exigido.
  const obrigatoriasPendentes = matriz.disciplinas.filter(
    (d) => d.conjunto === null && !d.codigo.startsWith("ENADE") && !cumpre(d.codigo, perfil, mapa),
  );
  cumprido.obrigatorias =
    matriz.cargas.obrigatorias - obrigatoriasPendentes.reduce((a, d) => a + d.horas.total, 0);

  const conjuntoSegundoEstrato = cursoDesc.categorias.find(
    (c) => c.id === "segundoEstrato",
  )?.conjunto;
  const conjuntoHumanidades = cursoDesc.categorias.find(
    (c) => c.id === "humanidades",
  )?.conjunto;
  const conjuntoExpressaoGrafica = cursoDesc.categorias.find(
    (c) => c.id === "expressaoGrafica",
  )?.conjunto;
  const exigido: Record<IdCategoria, number> = {
    obrigatorias: matriz.cargas.obrigatorias,
    segundoEstrato:
      conjuntoSegundoEstrato === undefined
        ? 0
        : matriz.conjuntos[String(conjuntoSegundoEstrato)]?.ch ?? 0,
    humanidades:
      conjuntoHumanidades === undefined
        ? 0
        : matriz.conjuntos[String(conjuntoHumanidades)]?.ch ?? 0,
    expressaoGrafica:
      conjuntoExpressaoGrafica === undefined
        ? 0
        : matriz.conjuntos[String(conjuntoExpressaoGrafica)]?.ch ?? 0,
    // Só os grupos de topo entram: as subáreas repetem a carga do pai.
    opcoes: (cursoDesc.gruposOpcao ?? []).reduce(
      (total, g) => total + (matriz.conjuntos[String(g)]?.ch ?? 0),
      0,
    ),
    trilhas: matriz.conjuntos[String(cursoDesc.agregadorTrilhas)]?.ch ?? 345,
    eletivas: matriz.cargas.eletiva,
    // 844 declara 0 e some da lista; BSI pede 330h e a 962, 420h
    extensao: matriz.cargas.extensao ?? 0,
  };

  // ---- candidatas -------------------------------------------------------
  // Obrigatórias: o mínimo é o roster inteiro. Demais categorias: escolhe-se o
  // menor conjunto que fecha a carga, então todas entram no pool de candidatas.
  const elegiveisAoPlano = matriz.disciplinas.filter((d) => {
    if (d.codigo.startsWith("ENADE")) return false;
    if (cumpre(d.codigo, perfil, mapa)) return false;
    const cat = categoriaDe(d, matriz);
    if (cat === null) return false;
    if (cat !== "obrigatorias" && saz.de(d.codigo) === "sem_oferta") return false;
    return true;
  });

  // ---- exclusão de disciplinas ------------------------------------------
  // Obrigatória excluída é impossível por definição: o mínimo dessa categoria é
  // o roster inteiro, não existe substituta. Ela volta para o plano marcada.
  for (const d of elegiveisAoPlano) {
    if (categoriaDe(d, matriz) !== "obrigatorias" || !excluidaPeloAluno(d)) continue;
    registrarImpossivel(
      "disciplina",
      d.codigo,
      `${d.codigo} — ${d.nome}`,
      "é obrigatória da matriz: não há disciplina que a substitua, então ela entra no plano mesmo assim.",
      d.codigo,
    );
  }

  // Nas demais categorias há substitutas — desde que sobrem horas suficientes.
  // Se a exclusão deixa a categoria sem como fechar, ela é desfeita por inteiro
  // naquela categoria, porque escolher quais devolver seria arbitrário.
  const categoriasComPool: IdCategoria[] = [
    "segundoEstrato",
    "humanidades",
    "expressaoGrafica",
    "opcoes",
    "trilhas",
  ];
  const excluidasRestauradas = new Set<string>();
  for (const cat of categoriasComPool) {
    const naCategoria = elegiveisAoPlano.filter((d) => categoriaDe(d, matriz) === cat);
    const excluidasDaCategoria = naCategoria.filter((d) => excluidaPeloAluno(d));
    if (excluidasDaCategoria.length === 0) continue;

    const faltante = Math.max(0, exigido[cat] - cumprido[cat]);
    const disponivelSemExcluidas = naCategoria
      .filter((d) => !excluidaPeloAluno(d))
      .reduce((a, d) => a + d.horas.total, 0);
    if (disponivelSemExcluidas >= faltante) continue;

    for (const d of excluidasDaCategoria) {
      excluidasRestauradas.add(d.codigo);
      registrarImpossivel(
        "disciplina",
        d.codigo,
        `${d.codigo} — ${d.nome}`,
        `sem ela a categoria não fecha: restam ${disponivelSemExcluidas}h ofertadas para ${faltante}h exigidas.`,
        d.codigo,
      );
    }
  }

  const candidatas = elegiveisAoPlano.filter((d) => {
    const cat = categoriaDe(d, matriz)!;
    // obrigatória e restaurada seguem no pool; as demais exclusões valem
    if (cat === "obrigatorias" || excluidasRestauradas.has(d.codigo)) return true;
    return !excluidaPeloAluno(d);
  });

  const semOfertaObrigatorias = matriz.disciplinas.filter(
    (d) =>
      d.conjunto === null &&
      !d.codigo.startsWith("ENADE") &&
      !cumpre(d.codigo, perfil, mapa) &&
      ocupaVaga(d) &&
      saz.de(d.codigo) === "sem_oferta",
  );
  if (semOfertaObrigatorias.length > 0) {
    avisos.push(
      `Sem registro de oferta recente para ${semOfertaObrigatorias
        .map((d) => d.codigo)
        .join(", ")}: a projeção assume que abrem em qualquer semestre.`,
    );
  }

  /**
   * Altura na cadeia de pré-requisitos: quantos semestres, no mínimo, ainda
   * dependem desta disciplina. É o que decide a prioridade — adiar uma raiz de
   * cadeia longa (Fund. Programação → TC2) empurra a formatura inteira.
   */
  const alturaMemo = new Map<string, number>();
  const dependentesDe = new Map<string, DisciplinaMatriz[]>();
  for (const d of matriz.disciplinas) {
    for (const p of d.prerequisitos) {
      if (periodoExigido(p) !== null) continue;
      if (!dependentesDe.has(p)) dependentesDe.set(p, []);
      dependentesDe.get(p)!.push(d);
    }
  }
  function altura(codigo: string, visitando = new Set<string>()): number {
    const memo = alturaMemo.get(codigo);
    if (memo !== undefined) return memo;
    if (visitando.has(codigo)) return 0;
    visitando.add(codigo);
    const filhos = (dependentesDe.get(codigo) ?? []).filter((f) => !cumpre(f.codigo, perfil, mapa));
    const h = filhos.length ? Math.max(...filhos.map((f) => altura(f.codigo, visitando))) + 1 : 0;
    visitando.delete(codigo);
    alturaMemo.set(codigo, h);
    return h;
  }

  // ---- estado da projeção ----------------------------------------------
  const planejado: Record<IdCategoria, number> = {
    obrigatorias: 0,
    segundoEstrato: 0,
    humanidades: 0,
    expressaoGrafica: 0,
    opcoes: 0,
    trilhas: 0,
    eletivas: 0,
    extensao: 0,
  };
  const horasPorTrilha = new Map<number, number>();
  // Cada grupo "Opções de …" tem carga própria a cumprir: 60h de Programação de
  // Computador não substituem 75h de Circuitos Digitais. Sem o teto por grupo, o
  // motor fecharia as 1875h do bloco despejando tudo no grupo com mais oferta.
  const horasPorGrupo = new Map<number, number>();
  if (perfil) {
    for (const r of perfil.resumoConjuntos) {
      const n = Number(r.conjunto);
      if (ehTrilha(cursoDesc, n)) horasPorTrilha.set(n, r.chCursadaAprovada);
      if ((cursoDesc.gruposOpcao ?? []).includes(n)) horasPorGrupo.set(n, r.chCursadaAprovada);
    }
  }

  const falta = (cat: IdCategoria) =>
    Math.max(0, exigido[cat] - cumprido[cat] - planejado[cat]);

  const chDaTrilha = (conj: number) => matriz.conjuntos[String(conj)]?.ch ?? 90;

  /** Quantas trilhas já atingiram as 90h que as validam. */
  const trilhasValidadas = () =>
    [...horasPorTrilha.entries()].filter(([conj, horas]) => horas >= chDaTrilha(conj)).length;

  /** Horas que ainda faltam para a trilha fechar as próprias 90h. */
  const faltaNaTrilha = (conj: number) =>
    Math.max(0, chDaTrilha(conj) - (horasPorTrilha.get(conj) ?? 0));

  /**
   * O bloco optativo só fecha com as duas condições declaradas pelo curso:
   * carga total e quantidade mínima de trilhas completas.
   */
  const faltaTerceiroEstrato = () =>
    falta("trilhas") > 0 || trilhasValidadas() < trilhasExigidas;

  /** Horas que ainda faltam para o grupo de escolha cumprir a carga dele. */
  const faltaNoGrupo = (g: number) =>
    Math.max(0, (matriz.conjuntos[String(g)]?.ch ?? 0) - (horasPorGrupo.get(g) ?? 0));

  /**
   * O bloco de opções só fecha quando TODO grupo fecha. A carga agregada não
   * basta: uma disciplina de 60h num grupo de 45h deixa 15h de sobra que não
   * valem para nenhum outro grupo.
   */
  const faltaAlgumGrupoOpcao = () =>
    (cursoDesc.gruposOpcao ?? []).some((g) => faltaNoGrupo(g) > 0);

  // ---- oferta-espelho de cada semestre projetado -------------------------
  const cacheReferencia = new Map<
    string,
    { oferta: OfertaSemestre | null; ofertadas: Map<string, DisciplinaOfertada> }
  >();
  function referenciaDe(semestre: string) {
    const chave = chaveSemestre(semestre);
    let r = cacheReferencia.get(chave);
    if (!r) {
      const oferta = ofertaReferenciaDoSemestre(semestre, ofertas);
      r = {
        oferta,
        ofertadas: new Map((oferta?.disciplinas ?? []).map((d) => [d.codigo, d])),
      };
      cacheReferencia.set(chave, r);
    }
    return r;
  }

  // Trilhas que a grade importada do Planejamento já começou: continuar nelas é
  // mais barato do que abrir uma trilha nova que o aluno não escolheu.
  const conjuntosFixados = new Set<number>();
  for (const item of gradeFixada?.itens ?? []) {
    if (!item.codigoMatriz) continue;
    const d = matriz.disciplinas.find((x) => x.codigo === item.codigoMatriz);
    if (d?.conjunto != null && ehTrilha(cursoDesc, d.conjunto)) conjuntosFixados.add(d.conjunto);
  }

  /**
   * Escolhe, ANTES de montar os semestres, em quais trilhas o aluno vai investir.
   *
   * Decidir isso disciplina a disciplina não funciona: o guloso ou espalha por
   * trilhas demais (e nenhuma fecha as 90h) ou fica preso numa trilha que o aluno
   * começou mas que não tem mais oferta — caso real de quem tem 45h em Sistemas
   * Embarcados, trilha sem nenhuma disciplina aberta nos semestres conhecidos.
   *
   * Prioriza as trilhas mais baratas de fechar: primeiro o que já foi cursado,
   * depois o que dá para cursar de fato. Trilha que não tem como chegar às 90h
   * com a oferta conhecida é descartada.
   */
  function escolherTrilhasAlvo(): Set<number> {
    // Só conta a disciplina que o aluno realmente vai conseguir cursar: com
    // pré-requisito já aprovado ou que seja obrigatória (o plano cursa todas).
    // Uma disciplina de trilha travada atrás de uma optativa que o plano não
    // inclui — caso de quem depende de Gestão da Informação, do 2º estrato, que
    // não entra quando o estrato já fecha sem ela — deixa a trilha inalcançável,
    // e escolhê-la como alvo faz a projeção nunca fechar.
    const ehObrigatoria = new Set(
      matriz.disciplinas.filter((d) => d.conjunto === null).map((d) => d.codigo),
    );
    const alcancavel = (d: DisciplinaMatriz) =>
      d.prerequisitos.every((p) => {
        if (periodoExigido(p) !== null) return true;
        return cumpre(p, perfil, mapa) || ehObrigatoria.has(p);
      });

    const disponiveisPorTrilha = new Map<number, number>();
    for (const d of candidatas) {
      if (categoriaDe(d, matriz) !== "trilhas" || !alcancavel(d)) continue;
      const c = d.conjunto!;
      disponiveisPorTrilha.set(c, (disponiveisPorTrilha.get(c) ?? 0) + d.horas.total);
    }

    const conjuntosTrilha = Object.keys(matriz.conjuntos)
      .map(Number)
      .filter((n) => ehTrilha(cursoDesc, n));

    const viaveis = conjuntosTrilha
      .map((conj) => {
        const jaTem = horasPorTrilha.get(conj) ?? 0;
        const restante = Math.max(0, chDaTrilha(conj) - jaTem);
        const disponivel = disponiveisPorTrilha.get(conj) ?? 0;
        return { conj, jaTem, restante, podeFechar: restante === 0 || disponivel >= restante };
      })
      .filter((t) => t.podeFechar)
      // trilha já escolhida no Planejamento primeiro; depois a já validada e a
      // que exige menos horas para fechar
      .sort(
        (a, b) =>
          Number(conjuntosFixados.has(b.conj)) - Number(conjuntosFixados.has(a.conj)) ||
          a.restante - b.restante ||
          b.jaTem - a.jaTem,
      );

    // A trilha excluída sai da fila, mas o curso continua exigindo o mesmo
    // número de trilhas validadas. Se não sobram trilhas suficientes, as
    // excluídas voltam — as mais baratas primeiro — e cada volta é registrada.
    const permitidas = viaveis.filter((t) => !trilhasExcluidas.has(String(t.conj)));
    const escolhidasAlvo = permitidas.slice(0, trilhasExigidas);

    if (escolhidasAlvo.length < trilhasExigidas) {
      const reservas = viaveis.filter((t) => trilhasExcluidas.has(String(t.conj)));
      for (const t of reservas) {
        if (escolhidasAlvo.length >= trilhasExigidas) break;
        escolhidasAlvo.push(t);
        registrarImpossivel(
          "trilha",
          String(t.conj),
          matriz.conjuntos[String(t.conj)]?.nome ?? `Trilha ${t.conj}`,
          `o curso exige ${trilhasExigidas} trilha(s) validada(s) e só ${permitidas.length} ` +
            `trilha(s) fora da sua exclusão conseguem fechar as horas com a oferta conhecida.`,
        );
      }
    }

    return new Set(escolhidasAlvo.map((t) => t.conj));
  }

  const trilhasAlvo = escolherTrilhasAlvo();
  if (trilhasAlvo.size < trilhasExigidas) {
    avisos.push(
      `Só ${trilhasAlvo.size} trilha(s) conseguem fechar as 90h com a oferta conhecida — ` +
        `o curso exige ${trilhasExigidas}. A projeção segue, mas confira a oferta no Portal.`,
    );
  }

  const pendentes = new Set(candidatas.map((d) => d.codigo));
  const porCodigo = new Map(matriz.disciplinas.map((d) => [d.codigo, d]));
  const periodoAluno = perfil?.periodo ?? 1;

  /**
   * Horas que a trilha vai de fato consumir até validar o próprio piso.
   *
   * Não é o que falta e sim o que vai ser cursado: as optativas vêm em blocos de
   * 45h ou 60h, então uma trilha a 30h das 90h ainda custa uma disciplina
   * inteira. Na BSI, cujas optativas de trilha são todas de 60h, validar uma
   * trilha custa sempre 120h — e é por isso que 3 trilhas somam 360h, acima das
   * 345h do bloco. Contar o custo arredondado é o que impede o motor de gastar o
   * saldo do bloco numa trilha já fechada e depois estourar o piso de novo.
   */
  const custoParaValidar = (conj: number) => {
    const restante = faltaNaTrilha(conj);
    if (restante === 0) return 0;
    let menor = Infinity;
    for (const cod of pendentes) {
      const d = porCodigo.get(cod);
      if (d?.conjunto === conj) menor = Math.min(menor, d.horas.total);
    }
    if (!Number.isFinite(menor) || menor <= 0) return restante;
    return Math.ceil(restante / menor) * menor;
  };

  const semestres: SemestreProjetado[] = [];
  let semestreAtual = semestreInicial;
  let eletivasPendentes = falta("eletivas");
  // horas de extensão que a projeção não conseguiu casar com disciplina da
  // matriz e virou atividade a escolher: é o que o aluno precisa correr atrás
  let horasExtensaoGenerica = 0;
  let semestresSemProgresso = 0;

  for (let passo = 0; passo < horizonte; passo++) {
    const tudoFechado =
      falta("obrigatorias") === 0 &&
      falta("segundoEstrato") === 0 &&
      falta("humanidades") === 0 &&
      falta("expressaoGrafica") === 0 &&
      falta("extensao") === 0 &&
      !faltaAlgumGrupoOpcao() &&
      !faltaTerceiroEstrato() &&
      eletivasPendentes === 0 &&
      ![...pendentes].some((c) => categoriaDe(porCodigo.get(c)!, matriz) === "obrigatorias");
    if (tudoFechado) break;

    const semestrePar = ehSemestrePar(semestreAtual);
    // o período avança um a cada semestre projetado
    const periodoNoSemestre = periodoAluno + passo;
    // oferta real que espelha este semestre (mesma paridade, mais recente)
    const referencia = referenciaDe(semestreAtual);
    // turmas já reservadas neste semestre: é contra elas que o motor confere o
    // choque de horário antes de aceitar mais uma disciplina
    const itensDoSemestre: ItemGrade[] = [];
    // semestre que veio pronto do Planejamento: não se projeta, se obedece
    const fixadoAqui =
      !!gradeFixada && chaveSemestre(gradeFixada.semestre) === chaveSemestre(semestreAtual);

    const elegiveis = (fixadoAqui ? [] : [...pendentes])
      .map((c) => porCodigo.get(c)!)
      .filter((d) => {
        const cat = categoriaDe(d, matriz)!;
        // categoria já fechada: não se cursa além do mínimo
        if (cat === "trilhas") {
          if (!faltaTerceiroEstrato()) return false;
          if (ehTrilha(cursoDesc, d.conjunto) && !trilhasAlvo.has(d.conjunto!)) return false;
        } else if (cat === "opcoes") {
          const grupo = grupoOpcaoDe(cursoDesc, d.conjunto);
          if (grupo === null || faltaNoGrupo(grupo) === 0) return false;
        } else if (cat !== "obrigatorias" && falta(cat) === 0) {
          return false;
        }

        const s = saz.de(d.codigo);
        if (s === "primeiro" && semestrePar) return false;
        if (s === "segundo" && !semestrePar) return false;

        return d.prerequisitos.every((p) => {
          const per = periodoExigido(p);
          if (per !== null) return periodoNoSemestre >= per;
          return cumpre(p, perfil, mapa);
        });
      });

    if (!fixadoAqui && elegiveis.length === 0 && eletivasPendentes === 0) {
      if (pendentes.size === 0) break;
      semestreAtual = proximoSemestre(semestreAtual);
      continue;
    }

    elegiveis.sort((a, b) => {
      const catA = categoriaDe(a, matriz)!;
      const catB = categoriaDe(b, matriz)!;
      // 1. obrigatórias primeiro: são todas exigidas e destravam o resto
      const obrA = catA === "obrigatorias" ? 1 : 0;
      const obrB = catB === "obrigatorias" ? 1 : 0;
      if (obrA !== obrB) return obrB - obrA;
      // 2. cadeia mais longa primeiro
      const hA = altura(a.codigo);
      const hB = altura(b.codigo);
      if (hA !== hB) return hB - hA;
      // 3. Entre optativas, enquanto faltarem trilhas validadas, prioriza a que
      //    está mais perto de fechar as próprias 90h.
      if (catA === "trilhas" && catB === "trilhas") {
        if (trilhasValidadas() < trilhasExigidas) {
          const ehTrilhaA = ehTrilha(cursoDesc, a.conjunto);
          const ehTrilhaB = ehTrilha(cursoDesc, b.conjunto);
          // Optativas isoladas somam para o total, mas não ajudam a validar as
          // duas trilhas; por isso vêm depois enquanto esse piso estiver aberto.
          if (ehTrilhaA !== ehTrilhaB) return ehTrilhaA ? -1 : 1;
          const fA = faltaNaTrilha(a.conjunto!);
          const fB = faltaNaTrilha(b.conjunto!);
          // trilha já validada não ajuda a bater o piso de 3
          const validadaA = fA === 0 ? 1 : 0;
          const validadaB = fB === 0 ? 1 : 0;
          if (validadaA !== validadaB) return validadaA - validadaB;
          if (fA !== fB) return fA - fB;
        }
      }
      // 4. oferta mais rara primeiro (perder a janela custa um ano)
      const raraA = saz.de(a.codigo) === "ambos" ? 0 : 1;
      const raraB = saz.de(b.codigo) === "ambos" ? 0 : 1;
      if (raraA !== raraB) return raraB - raraA;
      // 5. período previsto na matriz
      if (a.periodo !== b.periodo) return a.periodo - b.periodo;
      return b.horas.total - a.horas.total;
    });

    const escolhidas: DisciplinaPlanejada[] = [];
    let vagas = ritmo;
    // Carga de sala de aula já reservada neste semestre. O ritmo limita quantas
    // matérias entram; este teto limita quanto elas pesam — 6 matérias de 90h
    // são 540h, e a UTFPR não deixa matricular isso.
    let chAula = 0;

    // ---- semestre importado do Planejamento de Matrícula -----------------
    // Aqui não há o que escolher: as matérias e as turmas são as que o aluno já
    // montou. O motor só credita as horas e libera os dependentes, para que os
    // semestres seguintes saiam a partir desta grade real. O ritmo escolhido na
    // tela não vale para este semestre — vale o que o Planejamento tem.
    if (fixadoAqui) {
      for (const item of gradeFixada!.itens) {
        const dMatriz = item.codigoMatriz ? porCodigo.get(item.codigoMatriz) : undefined;
        // disciplina que o histórico já dá como aprovada não soma de novo
        if (dMatriz && cumpre(dMatriz.codigo, perfil, mapa)) continue;
        // fora da matriz (ou na pool de eletivas): conta como eletiva livre
        const cat: IdCategoria = dMatriz ? (categoriaDe(dMatriz, matriz) ?? "eletivas") : "eletivas";
        const horas = dMatriz?.horas.total ?? item.horas;

        escolhidas.push({
          codigo: dMatriz?.codigo ?? item.codigoOferta,
          nome: item.nome,
          horas,
          categoria: cat,
          sazonalidade: dMatriz ? saz.de(dMatriz.codigo) : "ambos",
          ocupaVaga: dMatriz ? ocupaVaga(dMatriz) : true,
          conjunto: dMatriz?.conjunto ?? null,
          turma: item.turma,
          codigoOferta: item.codigoOferta,
        });

        planejado[cat] += horas;
        planejado.extensao += dMatriz?.horas.chext ?? 0;
        if (cat === "eletivas") eletivasPendentes = Math.max(0, eletivasPendentes - horas);
        if (cat === "trilhas" && dMatriz?.conjunto != null && ehTrilha(cursoDesc, dMatriz.conjunto)) {
          horasPorTrilha.set(
            dMatriz.conjunto,
            (horasPorTrilha.get(dMatriz.conjunto) ?? 0) + horas,
          );
        }
        if (cat === "opcoes") {
          const grupo = grupoOpcaoDe(cursoDesc, dMatriz?.conjunto ?? null);
          if (grupo !== null) horasPorGrupo.set(grupo, (horasPorGrupo.get(grupo) ?? 0) + horas);
        }
        if (dMatriz) {
          if (perfil) perfil.aprovadas.add(dMatriz.codigo);
          else perfil = { aprovadas: new Set([dMatriz.codigo]), cursadas: [] } as any;
          pendentes.delete(dMatriz.codigo);
          alturaMemo.clear();
        }
      }
    }

    for (const d of elegiveis) {
      const cat = categoriaDe(d, matriz)!;
      const consome = ocupaVaga(d);
      if (consome && vagas <= 0) continue;
      // Estoura o teto de matrícula: fica para o próximo semestre, como quem não
      // acha vaga. A checagem precede a reserva de turma e o estado das trilhas
      // pelo mesmo motivo — disciplina recusada aqui segue pendente.
      // Uma menor pode caber no lugar; a lista já vem ordenada por prioridade.
      if (consome && chAula + d.horas.total > TETO_CH_SEMESTRE) continue;
      const grupoDaOpcao = cat === "opcoes" ? grupoOpcaoDe(cursoDesc, d.conjunto) : null;
      if (cat === "opcoes" && (grupoDaOpcao === null || faltaNoGrupo(grupoDaOpcao) === 0)) continue;
      if (cat !== "obrigatorias" && cat !== "trilhas" && cat !== "opcoes" && falta(cat) === 0) continue;

      // ---- filtro realista para o semestre atual ---------------------------
      // Para o semestre IMEDIATO (passo 0), sugerir uma matéria que sabidamente
      // não está sendo ofertada (mesmo que seja uma optativa ou humanidade) gera
      // frustração na importação. Então, exigimos que a disciplina exista na oferta
      // do período (mesmo que não tenha horário, como TCC).
      let ofertaDaDisciplina: DisciplinaOfertada | null = null;
      if (passo === 0 && !fixadoAqui && referencia.oferta) {
        ofertaDaDisciplina = buscarOfertaParaPlanejamento(d, referencia.ofertadas, mapa);
        if (!ofertaDaDisciplina) continue;
      }

      // ---- reserva de turma: a grade do semestre tem de fechar sem choque --
      // A checagem vem ANTES de mexer no estado das trilhas, porque uma
      // disciplina rejeitada aqui continua pendente para o próximo semestre.
      let turmaEscolhida: Turma | null = null;
      let violacaoDeDocente: DisciplinaPlanejada["exclusaoIgnorada"];
      if (consome && referencia.oferta) {
        ofertaDaDisciplina = ofertaDaDisciplina || buscarOfertaParaPlanejamento(d, referencia.ofertadas, mapa);
        if (ofertaDaDisciplina && ofertaDaDisciplina.turmas.length > 0) {
          const porPrioridade = [...ofertaDaDisciplina.turmas].sort(
            (x, y) =>
              calcularPesoPrioridadeTurma(y, usarPrioridadeBsi) -
              calcularPesoPrioridadeTurma(x, usarPrioridadeBsi),
          );
          // Duas disciplinas da matriz podem cair na MESMA turma ofertada — em
          // Eng. Comp. isso acontece porque a lista de equivalentes é histórica
          // e larga (MA70G e MA70H chegam ambas a MAT7ED/S01). O aluno não se
          // matricula duas vezes na mesma turma, e `haveriaConflito` devolve
          // false para o par idêntico (ele o lê como "já está na grade"), então
          // a checagem de reserva repetida tem de ser explícita.
          const jaReservada = (t: Turma) =>
            itensDoSemestre.some(
              (i) =>
                i.disciplina.codigo === ofertaDaDisciplina!.codigo && i.turma.codigo === t.codigo,
            );

          // ---- exclusão de professor ------------------------------------
          // Vale por turma, não por disciplina: só as turmas dos docentes
          // excluídos saem da mesa. Quando TODAS as turmas da disciplina são
          // deles, evitar o docente significaria não cursar a disciplina — e
          // isso a matriz não permite. Aí o pedido cai e a turma é marcada.
          const aceitas = professoresExcluidos.length
            ? porPrioridade.filter((t) => !turmaViolaProfessores(t, { professoresExcluidos }))
            : porPrioridade;
          const semAlternativaDeDocente = aceitas.length === 0;
          const candidatasTurma = semAlternativaDeDocente ? porPrioridade : aceitas;

          turmaEscolhida =
            candidatasTurma.find(
              (t) => !jaReservada(t) && !haveriaConflito(itensDoSemestre, ofertaDaDisciplina!, t),
            ) ?? null;
          // Nenhuma turma livre cabe junto do que já foi reservado: a disciplina
          // fica para o próximo semestre, quando a concorrente já terá saído da
          // fila. Antes ela entrava mesmo em choque, e a importação para o
          // Planejamento acusava conflito numa grade que o próprio simulador
          // havia montado.
          if (!turmaEscolhida) continue;

          if (semAlternativaDeDocente) {
            for (const prof of professoresExcluidos) {
              if (!turmaViolaProfessores(turmaEscolhida, { professoresExcluidos: [prof] })) continue;
              registrarImpossivel(
                "professor",
                prof,
                prof,
                "todas as turmas ofertadas desta disciplina são deste docente, e a disciplina é necessária para integralizar.",
                d.codigo,
              );
              violacaoDeDocente = { tipo: "professor", alvo: prof, motivo: "única turma ofertada" };
            }
          }
        }
      }

      // Toda optativa do bloco conta para a carga agregada. Nas trilhas, as horas
      // acima de 90h continuam contando; nas isoladas, contam apenas no total.
      const contribui = d.horas.total;
      if (cat === "trilhas") {
        if (!faltaTerceiroEstrato()) continue;

        const conj = d.conjunto!;
        // Horas que as trilhas-alvo ainda não validadas vão obrigatoriamente
        // consumir do bloco. Gastar o saldo do bloco numa trilha já fechada (ou
        // numa optativa isolada) não adianta nada: as validações pendentes
        // continuam custando as mesmas 90h e o total estoura o piso. Reservar
        // essas horas é o que mantém a promessa de "cursar só o mínimo".
        const reservadoParaValidar = [...trilhasAlvo]
          .filter((c) => c !== conj)
          .reduce((a, c) => a + custoParaValidar(c), 0);

        if (ehTrilha(cursoDesc, conj)) {
          // fora das trilhas-alvo o estudo não aproxima de validar o piso exigido
          if (!trilhasAlvo.has(conj)) continue;

          const horasNaTrilha = horasPorTrilha.get(conj) ?? 0;
          // Trilha já validada não recebe mais nada enquanto alguma trilha-alvo
          // continuar aberta: aquelas horas vão ter de ser pagas de novo lá, e
          // o bloco estoura duas vezes.
          //
          // A reserva por si não basta, porque `custoParaValidar` estima pela
          // MENOR disciplina pendente da outra trilha — é otimista de
          // propósito, para não bloquear escolha legítima. Quando a disciplina
          // que de fato abre é maior que a estimativa, a reserva fica curta e o
          // excedente escorre para cá: era o que levava uma trilha de piso 90h
          // a 180h na 962, com o bloco de 270h fechando em 345h.
          const alvoAindaAberta = [...trilhasAlvo].some((c) => faltaNaTrilha(c) > 0);
          if (
            horasNaTrilha >= chDaTrilha(conj) &&
            (alvoAindaAberta || falta("trilhas") <= reservadoParaValidar)
          ) {
            continue;
          }
          horasPorTrilha.set(conj, horasNaTrilha + d.horas.total);
        } else if (falta("trilhas") <= reservadoParaValidar) {
          // Optativa isolada não substitui uma trilha completa.
          continue;
        }
      }

      if (grupoDaOpcao !== null) {
        horasPorGrupo.set(grupoDaOpcao, (horasPorGrupo.get(grupoDaOpcao) ?? 0) + d.horas.total);
      }

      if (turmaEscolhida && ofertaDaDisciplina) {
        itensDoSemestre.push({ disciplina: ofertaDaDisciplina, turma: turmaEscolhida });
      }
      escolhidas.push({
        codigo: d.codigo,
        nome: d.nome,
        horas: d.horas.total,
        categoria: cat,
        sazonalidade: saz.de(d.codigo),
        ocupaVaga: consome,
        conjunto: d.conjunto,
        exclusaoIgnorada: violacaoDe(d) ?? violacaoDeDocente,
        turma: turmaEscolhida?.codigo ?? null,
        codigoOferta: ofertaDaDisciplina?.codigo ?? null,
      });
      planejado[cat] += contribui;
      // A extensão não é uma categoria à parte na matriz: ela vem embutida como
      // CHEXT de disciplinas que já contam noutro bloco. Creditamos aqui para não
      // exigir do aluno horas que a própria grade planejada já entrega.
      planejado.extensao += d.horas.chext ?? 0;
      // Simulamos a aprovação para que dependentes sejam liberados nos próximos passos
      if (perfil) {
        perfil.aprovadas.add(d.codigo);
      } else {
        // Se não houver perfil, criamos um mock mínimo para manter o estado
        perfil = { aprovadas: new Set([d.codigo]), cursadas: [] } as any;
      }
      pendentes.delete(d.codigo);
      alturaMemo.clear();
      if (consome) {
        vagas--;
        chAula += d.horas.total;
      }
    }

    // eletivas entram como vaga genérica: a escolha é livre, fora da matriz
    while (
      !fixadoAqui &&
      eletivasPendentes > 0 &&
      vagas > 0 &&
      chAula < TETO_CH_SEMESTRE
    ) {
      // a eletiva se ajusta ao que sobra do teto, em vez de ficar para depois
      const horas = Math.min(eletivasPendentes, 60, TETO_CH_SEMESTRE - chAula);
      escolhidas.push({
        codigo: "ELETIVA",
        nome: `Eletiva livre (${horas}h)`,
        horas,
        categoria: "eletivas",
        sazonalidade: "ambos",
        ocupaVaga: true,
        conjunto: null,
        turma: null,
        codigoOferta: null,
      });
      planejado.eletivas += horas;
      eletivasPendentes -= horas;
      vagas--;
      chAula += horas;
    }

    // Sobrando extensão depois de contar o CHEXT das disciplinas planejadas, o
    // saldo vira atividade extensionista genérica: não existe disciplina formal
    // da matriz para apontar, porque o aluno escolhe a atividade.
    //
    // Ela não disputa vaga de turma, pela mesma razão do estágio e das
    // atividades complementares: acontece junto das aulas do semestre. Se
    // disputasse, as obrigatórias tomariam todas as vagas e a extensão nunca
    // seria planejada — a projeção fechava ignorando 330h na BSI.
    // Uma atividade por semestre, para a carga acumular em ritmo plausível.
    if (falta("extensao") > 0) {
      const horas = Math.min(falta("extensao"), 90);
      horasExtensaoGenerica += horas;
      escolhidas.push({
        codigo: "EXTENSAO",
        nome: `Extensão a definir (${horas}h)`,
        horas,
        categoria: "extensao",
        sazonalidade: "ambos",
        ocupaVaga: false,
        conjunto: null,
        turma: null,
        codigoOferta: null,
      });
      planejado.extensao += horas;
    }

    if (escolhidas.length === 0) {
      semestresSemProgresso++;
      if (semestresSemProgresso >= 2) {
        pendentes.clear();
      }
      if (pendentes.size === 0) {
        let addedPlaceholder = false;
        const addPlaceholdersFor = (cat: IdCategoria, nomeCat: string) => {
          while (falta(cat) > 0 && vagas > 0 && chAula < TETO_CH_SEMESTRE) {
            const horas = Math.min(falta(cat), 60, TETO_CH_SEMESTRE - chAula);
            escolhidas.push({
              codigo: `PLACEHOLDER_${cat}_${falta(cat)}`,
              nome: cat === "obrigatorias" ? `Obrigatória pendente (${horas}h)` : `Optativa de ${nomeCat} (${horas}h)`,
              horas,
              categoria: cat,
              sazonalidade: "ambos",
              ocupaVaga: true,
              conjunto: null,
              turma: null,
              codigoOferta: null,
            });
            planejado[cat] += horas;
            vagas--;
            chAula += horas;
            addedPlaceholder = true;
          }
        };

        if (falta("humanidades") > 0) addPlaceholdersFor("humanidades", "Humanidades");
        if (falta("expressaoGrafica") > 0) addPlaceholdersFor("expressaoGrafica", "Expressão Gráfica");
        // Opções: o buraco é por grupo, não no agregado — um grupo fechado não
        // paga o vizinho, então o placeholder é emitido grupo a grupo.
        for (const g of cursoDesc.gruposOpcao ?? []) {
          while (faltaNoGrupo(g) > 0 && vagas > 0 && chAula < TETO_CH_SEMESTRE) {
            const horas = Math.min(faltaNoGrupo(g), 60, TETO_CH_SEMESTRE - chAula);
            escolhidas.push({
              codigo: `PLACEHOLDER_opcoes_${g}_${faltaNoGrupo(g)}`,
              nome: `Optativa de ${matriz.conjuntos[String(g)]?.nome ?? "Opções"} (${horas}h)`,
              horas,
              categoria: "opcoes",
              sazonalidade: "ambos",
              ocupaVaga: true,
              conjunto: g,
              turma: null,
              codigoOferta: null,
            });
            horasPorGrupo.set(g, (horasPorGrupo.get(g) ?? 0) + horas);
            planejado.opcoes += horas;
            vagas--;
            chAula += horas;
            addedPlaceholder = true;
          }
        }
        if (falta("segundoEstrato") > 0) addPlaceholdersFor("segundoEstrato", "2º Estrato");
        if (falta("trilhas") > 0) addPlaceholdersFor("trilhas", "Trilha");
        if (falta("obrigatorias") > 0) addPlaceholdersFor("obrigatorias", "Obrigatória");

        if (!addedPlaceholder) break;
        semestresSemProgresso = 0;
      } else {
        semestreAtual = proximoSemestre(semestreAtual);
        continue;
      }
    } else {
      semestresSemProgresso = 0;
    }

    semestres.push({
      semestre: semestreAtual,
      disciplinas: escolhidas,
      horas: escolhidas.reduce((a, d) => a + d.horas, 0),
      // sai da lista final, e não do contador do laço: o semestre importado do
      // Planejamento não passa por ele e ficaria com 0h de sala na tela
      chAula: escolhidas.filter((d) => d.ocupaVaga).reduce((a, d) => a + d.horas, 0),
      // o cabeçalho do semestre conta o que está listado nele, e não só o que
      // disputa vaga de aula: estágio e TCC aparecem na lista e são matéria
      materias: escolhidas.filter((d) => ehMateria(d)).length,
      vagasOcupadas: escolhidas.filter((d) => d.ocupaVaga).length,
      semestreReferencia: referencia.oferta?.semestre ?? null,
      fixadoPeloPlanejamento: fixadoAqui,
    });
    semestreAtual = proximoSemestre(semestreAtual);
  }

  const obrigatoriasRestantes = [...pendentes].filter(
    (c) => categoriaDe(porCodigo.get(c)!, matriz) === "obrigatorias",
  );
  const fechou =
    obrigatoriasRestantes.length === 0 &&
    falta("segundoEstrato") === 0 &&
    falta("humanidades") === 0 &&
    falta("expressaoGrafica") === 0 &&
    falta("extensao") === 0 &&
    !faltaTerceiroEstrato() &&
    eletivasPendentes === 0;

  if (!fechou) {
    avisos.push(
      "A projeção não fecha dentro do horizonte simulado — reveja o ritmo ou verifique pré-requisitos travados.",
    );
  }

  // O plano cobre as horas, mas não diz em quê: essas horas não saíram de uma
  // disciplina da matriz, e sim de atividade que o aluno ainda vai escolher.
  // Sem este aviso, a tela daria a entender que basta cursar o que está listado.
  if (horasExtensaoGenerica > 0) {
    avisos.push(
      `Você ainda deve buscar matérias ou projetos extensionistas para concluir o curso nesses próximos períodos: faltam ${horasExtensaoGenerica}h de extensão que não estão vinculadas a uma disciplina da sua matriz.`,
    );
  }

  const requisitos: Requisito[] = (
    [
      ["obrigatorias", cursoDesc.matriz === 981 ? "Obrigatórias (1º estrato)" : "Obrigatórias"],
      ["segundoEstrato", "2º Estrato"],
      ["humanidades", "Ciclo de Humanidades"],
      ["expressaoGrafica", "Opção de Expressão Gráfica"],
      ["opcoes", cursoDesc.rotuloOpcoes ?? "Opções do Curso"],
      ["trilhas", cursoDesc.matriz === 981 ? "Trilhas (3º estrato)" : cursoDesc.rotuloBlocoTrilhas],
      ["eletivas", "Eletivas"],
      ["extensao", "Extensão Universitária"],
    ] as [IdCategoria, string][]
  )
    .map(([id, nome]) => ({
      id,
      nome,
      exigido: exigido[id],
      cumprido: cumprido[id],
      faltante: Math.max(0, exigido[id] - cumprido[id]),
      planejado: planejado[id],
      atendido: cumprido[id] + planejado[id] >= exigido[id],
    }))
    .filter((requisito) => requisito.exigido > 0);

  const trilhasFechadas = [...horasPorTrilha.entries()]
    .filter(([conj, horas]) => horas >= (matriz.conjuntos[String(conj)]?.ch ?? 90))
    .map(([conj, horas]) => ({
      conjunto: conj,
      nome: matriz.conjuntos[String(conj)]?.nome ?? String(conj),
      horas,
    }));

  return {
    semestres,
    semestreFormatura: fechou ? semestres[semestres.length - 1]?.semestre ?? null : null,
    requisitos,
    horasRestantes: requisitos.reduce((a, r) => a + r.faltante, 0),
    avisos,
    trilhasFechadas,
    trilhasExigidas,
    exclusoesImpossiveis,
  };
}
