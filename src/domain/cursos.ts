import type { Matriz, PerfilAluno } from "./tipos";
import matriz968Json from "../../data/eng-eletronica/matriz-968.json";
import matriz978Json from "../../data/eng-controle/matriz-978.json";
import matriz973Json from "../../data/eng-mecatronica/matriz-973.json";
import matriz823Json from "../../data/eng-mecatronica/matriz-823.json";

/**
 * Descrição das categorias curriculares de cada curso.
 *
 * As regras de categoria estavam escritas como número solto no código — 1159,
 * 1161, o intervalo 1162..1173 — espalhadas por motores e telas. Isso amarrava
 * o app à BSI: em Eng. Comp. esses conjuntos simplesmente não existem, e não há
 * "2º estrato" nem "ciclo de humanidades".
 *
 * Aqui a estrutura vira dado. O motor percorre a descrição do curso em vez de
 * testar número, e passa a servir os dois currículos sem duplicação.
 */

/**
 * Teto de carga horária que a UTFPR permite matricular num semestre.
 *
 * Conta só o que disputa vaga de aula. Ficam de fora estágio, atividades
 * complementares e TCC — componentes da matriz que o aluno cursa em paralelo às
 * aulas, sem ocupar horário — e a atividade extensionista, que nem disciplina é.
 * Um semestre com Estágio 1 (200h) não perde por isso 200h de grade.
 */
export const TETO_CH_SEMESTRE = 405;

export interface CategoriaSimples {
  /** identificador estável usado em chaves de UI e agregação */
  id: string;
  /** conjunto correspondente na matriz */
  conjunto: number;
  /** rótulo curto, para chips e listagens */
  rotulo: string;
  /** rótulo por extenso, para títulos de card e resumo de grade */
  rotuloLongo: string;
}

export interface DescricaoCurso {
  matriz: number;
  /**
   * Conjunto que agrega as trilhas e carrega a carga total do bloco. Não é uma
   * trilha: não entra na lista nem é validável.
   *   BSI       1160 "Terceiro Estrato - Trilhas Em Computação" (345h)
   *   Eng.Comp.  959 "Optativas"                                 (270h)
   */
  agregadorTrilhas: number | null;
  /** quantas trilhas o curso exige validar integralmente */
  trilhasExigidas: number;
  /** categorias de conjunto único, fora do bloco de trilhas */
  categorias: CategoriaSimples[];
  /**
   * Estágio curricular, que varia em quantidade e carga por curso: a BSI tem
   * dois de 200h, Eng. Comp. tem um único de 400h.
   */
  estagios: { codigo: string; rotulo: string; ch: number }[];
  /** título do bloco que agrega todas as trilhas, no resumo de grade */
  rotuloBlocoTrilhas: string;
  /**
   * Sufixo aplicado ao nome de cada trilha. Na BSI as trilhas são o 3º estrato
   * e o painel diz isso; em Eng. Comp. não há estratos, e o nome vai puro.
   */
  sufixoTrilha: string;
  /**
   * Conjuntos que contam para o agregador mas não são trilha validável.
   * Em Eng. Comp., 973 "Optativas Isoladas" soma para as 270h sem nunca
   * contar como uma das duas trilhas exigidas.
   */
  naoValidaveis: number[];
  /**
   * Trilhas validáveis, listadas quando não dá para deduzi-las por exclusão.
   *
   * Na BSI e em Eng. Comp. todo conjunto que não é o agregador nem categoria é
   * trilha, e a regra por exclusão basta. Eng. Eletrônica tem 50 conjuntos em
   * quatro níveis de aninhamento — grupos de escolha, subáreas de humanidades,
   * subáreas de IoT — e por exclusão quase todos virariam "trilha". Aqui as
   * cinco trilhas de aprofundamento reais são declaradas.
   */
  trilhas?: number[];
  /**
   * Grupos de escolha obrigatória fora do bloco de trilhas.
   *
   * A 968 organiza quase todo o currículo em "Opções de X": o aluno escolhe
   * dentro do grupo, e cada grupo tem carga própria a cumprir. São 25 grupos
   * que somam 1875h — não são trilhas (não se "valida" uma delas para
   * integralizar o bloco de aprofundamento) nem obrigatórias (há escolha).
   */
  gruposOpcao?: number[];
  /** título do bloco que agrega os grupos de escolha */
  rotuloOpcoes?: string;
  /**
   * Só a CHEXT das disciplinas obrigatórias credita extensão neste curso.
   *
   * A matriz imprime CHEXT em disciplinas optativas que, na prática, não têm
   * exigência extensionista alguma. O Quadro Resumo do histórico é quem separa
   * os dois casos: ele lista "CHEXT Disciplinas obrigatórias" e "CHEXT
   * Disciplinas Optativas" em linhas distintas, e só a primeira entra no
   * "CHEXT geral do curso". Quando a linha das optativas aparece com faltante 0
   * e situação OK mesmo com 0 cursada, aquelas horas são pool decorativa —
   * somá-las adiantaria a formatura projetada e marcaria como extensionista uma
   * matéria que não cumpre nada.
   *
   * Marcar apenas onde a fonte comprova. Ver ENG_CONTROLE_978.
   */
  extensaoSoObrigatorias?: boolean;
  /**
   * Aninhamento dos conjuntos, filho -> pai, lido da própria matriz.
   *
   * A disciplina aponta para a folha da árvore ("1215 Linguística, Letras E
   * Artes"), mas quem tem carga a cumprir é o topo ("1174 Ciclo De
   * Humanidades") — é assim que o Quadro Resumo do histórico contabiliza. Sem
   * este mapa, uma matéria de humanidades da 968 não seria reconhecida como
   * humanidades por ninguém.
   */
  hierarquia?: Record<number, number>;
}

/** filho -> pai, a partir do campo `pai` que o parser da matriz grava. */
function hierarquiaDe(
  conjuntos: Record<string, { pai?: string | number | null }>,
): Record<number, number> {
  const mapa: Record<number, number> = {};
  for (const [cod, c] of Object.entries(conjuntos)) {
    if (c.pai !== null && c.pai !== undefined) mapa[Number(cod)] = Number(c.pai);
  }
  return mapa;
}

/** Ancestrais do conjunto, do próprio até a raiz. */
function linhagem(curso: DescricaoCurso, conjunto: number): number[] {
  const caminho = [conjunto];
  let atual = conjunto;
  // trava contra ciclo: a árvore da 968 tem quatro níveis
  for (let i = 0; i < 8; i++) {
    const pai = curso.hierarquia?.[atual];
    if (pai === undefined || caminho.includes(pai)) break;
    caminho.push(pai);
    atual = pai;
  }
  return caminho;
}

export const BSI_981: DescricaoCurso = {
  matriz: 981,
  agregadorTrilhas: 1160,
  trilhasExigidas: 3,
  categorias: [
    { id: "segundoEstrato", conjunto: 1159, rotulo: "2º estrato", rotuloLongo: "2º Estrato" },
    { id: "humanidades", conjunto: 1161, rotulo: "humanidades", rotuloLongo: "Ciclo de Humanidades" },
    // a matriz declara a pool de eletivas como conjunto; sem listá-la aqui ela
    // seria confundida com trilha, virando uma 13ª no painel do 3º estrato
    { id: "eletivas", conjunto: 1199, rotulo: "eletiva", rotuloLongo: "Eletivas" },
  ],
  estagios: [
    { codigo: "ICSX51", rotulo: "Estágio 1", ch: 200 },
    { codigo: "ICSX52", rotulo: "Estágio 2", ch: 200 },
  ],
  rotuloBlocoTrilhas: "Trilhas em Computação (3º Estrato - Geral)",
  sufixoTrilha: " (3º Estrato)",
  naoValidaveis: [],
};

/**
 * BSI, matriz 806 — a anterior à 981.
 *
 * Mesma arquitetura de estratos da 981, com três diferenças que importam ao
 * motor. Não tem extensão curricular: o rodapé da matriz declara 0h, e por isso
 * a categoria de extensão some sozinha da lista de requisitos. O bloco de
 * humanidades chama-se apenas "Optativas" (948), sem o rótulo longo que a 981
 * usa, mas reúne as mesmas famílias de disciplina. E as eletivas não formam
 * conjunto: a exigência de 180h vive só no rodapé e no bloco de eletivas do
 * Histórico Escolar, então não há o equivalente do 1199 da 981 para declarar.
 *
 * A oferta de turmas é a mesma da 981 — existe uma só para a BSI —, e o
 * casamento entre o código ofertado (ICS…) e o da matriz (CS…) acontece pela
 * camada de equivalências, que a 806 traz em 127 das 162 disciplinas.
 */
export const BSI_806: DescricaoCurso = {
  matriz: 806,
  agregadorTrilhas: 934,
  trilhasExigidas: 3,
  categorias: [
    { id: "segundoEstrato", conjunto: 947, rotulo: "2º estrato", rotuloLongo: "2º Estrato" },
    { id: "humanidades", conjunto: 948, rotulo: "optativas", rotuloLongo: "Optativas" },
  ],
  estagios: [
    { codigo: "CSX51", rotulo: "Estágio 1", ch: 200 },
    { codigo: "CSX52", rotulo: "Estágio 2", ch: 200 },
  ],
  rotuloBlocoTrilhas: "Trilhas em Computação (3º Estrato - Geral)",
  sufixoTrilha: " (3º Estrato)",
  naoValidaveis: [],
};

export const ENG_COMP_844: DescricaoCurso = {
  matriz: 844,
  agregadorTrilhas: 959,
  trilhasExigidas: 2,
  // Eng. Comp. não tem estratos nem ciclo de humanidades: todo o bloco
  // optativo é trilha ou optativa isolada.
  categorias: [],
  estagios: [{ codigo: "CSX54", rotulo: "Estágio Supervisionado", ch: 400 }],
  rotuloBlocoTrilhas: "Optativas em Trilhas e Isoladas",
  sufixoTrilha: "",
  naoValidaveis: [973],
};

export const ENG_COMP_962: DescricaoCurso = {
  matriz: 962,
  agregadorTrilhas: 1081,
  trilhasExigidas: 2,
  categorias: [
    { id: "humanidades", rotulo: "humanidades", rotuloLongo: "Ciclo de Humanidades", conjunto: 1080 },
    { id: "expressaoGrafica", rotulo: "exp. gráfica", rotuloLongo: "Opção de Expressão Gráfica", conjunto: 1079 }
  ],
  estagios: [{ codigo: "ICSXG2", rotulo: "Estágio Supervisionado", ch: 360 }],
  rotuloBlocoTrilhas: "Optativas Profissionalizantes",
  sufixoTrilha: "",
  naoValidaveis: [1096],
};

/**
 * Engenharia Eletrônica, matriz 968.
 *
 * É o primeiro currículo servido pela plataforma em que o bloco optativo é
 * maior que o obrigatório: 1710h de obrigatórias contra 2385h de optativas.
 * Não é erro de leitura — a 968 concentra o curso em grupos de escolha, e o
 * Quadro Resumo do Histórico Escolar confirma os dois números.
 *
 * As 2385h se dividem exatamente em três blocos:
 *    210h  Ciclo de Humanidades (1174)
 *   1875h  os 25 grupos "Opções de …"
 *    300h  Trilhas de Aprofundamento (1180)
 *
 * Dentro do 1180 há cinco trilhas validáveis; `1185 Eletivas` e `1186
 * Optativas` são subáreas que somam para as 300h sem nunca valer como trilha,
 * e o mesmo vale para as subáreas de `1226 Sistemas IoT` (1227..1233), que
 * pertencem à trilha e não são trilhas por si.
 *
 * O histórico declara que o 1180 "utiliza a opção de validar Carga Horária
 * Parcial em suas subáreas": validar uma trilha credita a CHT dela contra as
 * 300h e o resto vem de qualquer subárea. Por isso `trilhasExigidas` é 1.
 */
export const ENG_ELETRONICA_968: DescricaoCurso = {
  matriz: 968,
  agregadorTrilhas: 1180,
  trilhasExigidas: 1,
  categorias: [
    { id: "humanidades", conjunto: 1174, rotulo: "humanidades", rotuloLongo: "Ciclo de Humanidades" },
  ],
  estagios: [{ codigo: "ELS02", rotulo: "Estágio Curricular Obrigatório", ch: 360 }],
  rotuloBlocoTrilhas: "Trilhas de Aprofundamento",
  sufixoTrilha: "",
  naoValidaveis: [1185, 1186, 1227, 1228, 1229, 1230, 1231, 1232, 1233],
  trilhas: [1181, 1182, 1183, 1184, 1226],
  gruposOpcao: [
    1175, 1176, 1177, 1187, 1190, 1193, 1194, 1195, 1196, 1197, 1198, 1199,
    1200, 1201, 1202, 1203, 1204, 1205, 1206, 1207, 1208, 1209, 1210, 1211, 1212,
  ],
  rotuloOpcoes: "Opções do Curso",
  hierarquia: hierarquiaDe(matriz968Json.conjuntos),
};

/**
 * Engenharia de Controle e Automação, matriz 978.
 *
 * As 675h optativas não formam um bloco de livre distribuição: a matriz exige
 * 135h em cada uma das cinco trilhas de formação (1136..1140). A 1140 é um
 * grupo composto por quatro subáreas; a disciplina aponta para a subárea, mas
 * o crédito precisa subir até a trilha-pai. Esse desenho é o mesmo problema
 * estrutural dos grupos de escolha da 968, portanto usa `gruposOpcao` em vez de
 * inventar um agregador inexistente ou dizer que basta escolher N trilhas.
 *
 * Extensão: as 420h exigidas saem inteiras das quatro obrigatórias que a matriz
 * marca com CHEXT — ELT71A (75h) e as três Oficinas de Integração, Pesquisa e
 * Extensão, ELT74F (120h), ELT76F (105h) e ELT78B (120h). É a única matriz em
 * que `chext_disc_obrigatorias` já iguala `cargas.extensao`.
 *
 * As seis FCH7* do conjunto 1136 também trazem CHEXT (345h somadas), mas não
 * cumprem exigência nenhuma. O Quadro Resumo de um histórico real da 978 é
 * explícito: "CHEXT Disciplinas obrigatórias 420 / cursada 195 / faltante 225 /
 * Falta cumprir" contra "CHEXT Disciplinas Optativas 345 / cursada 0 /
 * faltante 0 / OK", e o "CHEXT geral do curso" repete 420 — o total das
 * obrigatórias, não a soma das duas linhas. As 195h cursadas eram exatamente
 * ELT71A + ELT74F, e as 225h faltantes exatamente ELT76F + ELT78B.
 */
export const ENG_CONTROLE_978: DescricaoCurso = {
  matriz: 978,
  agregadorTrilhas: null,
  trilhasExigidas: 0,
  categorias: [],
  estagios: [{ codigo: "ELT78C", rotulo: "Estágio Curricular Obrigatório", ch: 360 }],
  rotuloBlocoTrilhas: "Trilhas de Formação",
  sufixoTrilha: "",
  naoValidaveis: [],
  trilhas: [],
  gruposOpcao: [1136, 1137, 1138, 1139, 1140],
  rotuloOpcoes: "Trilhas de Formação",
  extensaoSoObrigatorias: true,
  hierarquia: hierarquiaDe(matriz978Json.conjuntos),
};

/**
 * Engenharia Mecatrônica, matriz 823.
 *
 * A grade antiga não tem trilhas: suas 90h optativas vêm de um único conjunto
 * de Ciências Humanas, Sociais e Cidadania. As 240h eletivas ficam fora dos
 * conjuntos, e o estágio obrigatório tem 400h. Declarar `trilhas: []` impede
 * que o único conjunto seja promovido a trilha pela regra de compatibilidade
 * usada nas matrizes de BSI e Engenharia de Computação.
 */
export const ENG_MECATRONICA_823: DescricaoCurso = {
  matriz: 823,
  agregadorTrilhas: null,
  trilhasExigidas: 0,
  categorias: [
    { id: "humanidades", conjunto: 932, rotulo: "humanidades", rotuloLongo: "Ciências Humanas, Sociais e Cidadania" },
  ],
  estagios: [{ codigo: "EL70B", rotulo: "Estágio Curricular Obrigatório", ch: 400 }],
  rotuloBlocoTrilhas: "Optativas",
  sufixoTrilha: "",
  naoValidaveis: [],
  trilhas: [],
  hierarquia: hierarquiaDe(matriz823Json.conjuntos),
};

/**
 * Engenharia Mecatrônica, matriz 973.
 *
 * A grade separa 60h de Humanidades e duas trilhas formativas obrigatórias,
 * de 120h cada. Como as duas precisam ser cumpridas, elas têm o mesmo contrato
 * dos grupos obrigatórios da 978: são `gruposOpcao`, não trilhas entre as quais
 * o aluno escolhe uma. As unidades extensionistas formam uma pool sem exigência
 * própria; suas horas alimentam a exigência geral de extensão do curso.
 */
export const ENG_MECATRONICA_973: DescricaoCurso = {
  matriz: 973,
  agregadorTrilhas: null,
  trilhasExigidas: 0,
  categorias: [
    { id: "humanidades", conjunto: 1122, rotulo: "humanidades", rotuloLongo: "Ciclo de Humanidades" },
  ],
  estagios: [{ codigo: "ELN70B", rotulo: "Estágio Curricular Obrigatório", ch: 360 }],
  rotuloBlocoTrilhas: "Trilhas Formativas",
  sufixoTrilha: "",
  // A pool 1224 cumpre extensão, não as 300h optativas do curso.
  naoValidaveis: [],
  trilhas: [],
  gruposOpcao: [1120, 1121],
  rotuloOpcoes: "Trilhas Formativas",
  hierarquia: hierarquiaDe(matriz973Json.conjuntos),
};

const CURSOS: DescricaoCurso[] = [
  BSI_981,
  BSI_806,
  ENG_COMP_844,
  ENG_COMP_962,
  ENG_ELETRONICA_968,
  ENG_CONTROLE_978,
  ENG_MECATRONICA_823,
  ENG_MECATRONICA_973,
];

/** Descrição do curso correspondente à matriz, com a BSI como padrão. */
export function descricaoDoCurso(matriz: Matriz | number): DescricaoCurso {
  const numero = typeof matriz === "number" ? matriz : matriz.matriz;
  return CURSOS.find((c) => c.matriz === numero) ?? BSI_981;
}

/** true quando o conjunto é uma trilha validável do curso. */
export function ehTrilha(curso: DescricaoCurso, conjunto: number | string | null): boolean {
  if (conjunto === null) return false;
  const n = Number(conjunto);
  if (Number.isNaN(n)) return false;
  // Curso que declara suas trilhas não admite dedução por exclusão: na 968 a
  // regra por exclusão promoveria a trilha os 25 grupos de escolha e as
  // subáreas de humanidades.
  if (curso.trilhas) return curso.trilhas.includes(n);
  if (n === curso.agregadorTrilhas) return false;
  if (curso.naoValidaveis.includes(n)) return false;
  return !curso.categorias.some((c) => c.conjunto === n);
}

/**
 * Grupo de escolha ao qual o conjunto pertence, se houver.
 *
 * A disciplina pode apontar para uma subárea do grupo — em "Opções De Circuitos
 * Elétricos" (1187) as disciplinas ficam em "Teoria E Prática Integradas"
 * (1188) e "Não Integradas" (1189) —, então a busca sobe a hierarquia.
 */
export function grupoOpcaoDe(
  curso: DescricaoCurso,
  conjunto: number | string | null,
): number | null {
  if (conjunto === null || !curso.gruposOpcao) return null;
  const n = Number(conjunto);
  if (Number.isNaN(n)) return null;
  return linhagem(curso, n).find((c) => curso.gruposOpcao!.includes(c)) ?? null;
}

/** true quando o conjunto é, ou pertence a, um grupo de escolha do curso. */
export function ehGrupoOpcao(
  curso: DescricaoCurso,
  conjunto: number | string | null,
): boolean {
  return grupoOpcaoDe(curso, conjunto) !== null;
}

/**
 * true quando as horas do conjunto entram no bloco optativo agregado.
 *
 * Em Eng. Comp., isso inclui tanto as trilhas validáveis (960..972) quanto
 * Optativas Isoladas (973). As isoladas somam para as 270h, mas não podem ser
 * contadas como uma das duas trilhas completas.
 */
export function contaNoBlocoOptativo(
  curso: DescricaoCurso,
  conjunto: number | string | null,
): boolean {
  if (conjunto === null) return false;
  const n = Number(conjunto);
  if (Number.isNaN(n) || n === curso.agregadorTrilhas) return false;
  return ehTrilha(curso, n) || curso.naoValidaveis.includes(n);
}

/**
 * Carga cursada e aprovada que contribui para o bloco agregado de trilhas.
 *
 * Na matriz 844, o Quadro Resumo só move horas para a coluna "validada" depois
 * de completar duas trilhas. Para planejar o saldo real, usamos a coluna E
 * (aprovada total) ou o conjunto 959, mantendo a validação de duas trilhas como
 * requisito separado. Na BSI, o próprio agregador 1160 continua sendo a fonte.
 *
 * A linha "Optativas" do Quadro Resumo é uma só para o curso inteiro, então ela
 * só equivale ao bloco de trilhas quando o curso NÃO tem outras categorias
 * optativas. Na 844 equivale (não há humanidades nem expressão gráfica); na 962
 * as 420h declaradas somam Humanidades + Expressão Gráfica + Profissionalizantes,
 * e usá-la aqui creditaria ao bloco de 270h horas que são de outro requisito —
 * era o que fazia dois históricos reais aparecerem com 120h já cumpridas nas
 * profissionalizantes, sendo que a própria fonte declara 0 no conjunto 1081.
 */
export function cargaAprovadaBlocoOptativo(
  perfil: PerfilAluno | null | undefined,
  curso: DescricaoCurso,
): number {
  if (!perfil) return 0;

  const agregado = curso.agregadorTrilhas
    ? perfil.resumoConjuntos.find(
        (resumo) => resumo.conjunto === String(curso.agregadorTrilhas),
      )
    : undefined;

  const resumoCobreApenasOBloco = curso.categorias.length === 0;
  if (resumoCobreApenasOBloco) {
    const totalAprovado = perfil.resumoGeral?.optativas.aprovadaTotal;
    if (totalAprovado !== undefined) return totalAprovado;
    if (agregado) return agregado.chCursadaAprovada;
  } else if (agregado) {
    return agregado.chCursadaAprovada;
  }

  const somaSubconjuntos = perfil.resumoConjuntos
    .filter((resumo) => contaNoBlocoOptativo(curso, resumo.conjunto))
    .reduce((total, resumo) => total + resumo.chCursadaAprovada, 0);
  if (somaSubconjuntos > 0) return somaSubconjuntos;

  return perfil.resumoGeral?.optativas.aprovada ?? 0;
}

/**
 * Categoria simples correspondente ao conjunto, se houver.
 *
 * Sobe a hierarquia: uma disciplina de humanidades da 968 aponta para a área
 * ("1215 Linguística, Letras E Artes"), e quem é categoria é o pai dela.
 */
export function categoriaSimples(
  curso: DescricaoCurso,
  conjunto: number | string | null,
): CategoriaSimples | null {
  if (conjunto === null) return null;
  const n = Number(conjunto);
  if (Number.isNaN(n)) return null;
  for (const cod of linhagem(curso, n)) {
    const cat = curso.categorias.find((c) => c.conjunto === cod);
    if (cat) return cat;
  }
  return null;
}

/**
 * Conjuntos da matriz que são trilhas do curso, na ordem em que a matriz os
 * declara. Deriva da própria matriz: não há intervalo fixo no código.
 */
export function trilhasDaMatriz(matriz: Matriz, curso = descricaoDoCurso(matriz)): string[] {
  return Object.keys(matriz.conjuntos).filter((cod) => ehTrilha(curso, cod));
}

/** Rótulo da categoria de uma disciplina, para exibição. */
export function rotuloDoConjunto(
  matriz: Matriz,
  conjunto: number | null,
  curso = descricaoDoCurso(matriz),
): string {
  if (conjunto === null) return "obrigatória";
  const simples = categoriaSimples(curso, conjunto);
  if (simples) return simples.rotulo;
  return matriz.conjuntos[String(conjunto)]?.nome ?? String(conjunto);
}

/** A extensão curricular só é uma exigência quando a própria matriz a declara. */
export function exigeExtensao(matriz: Matriz | null | undefined): boolean {
  return (matriz?.cargas.extensao ?? 0) > 0;
}

/**
 * Quantas horas de extensão a disciplina credita de fato no curso.
 *
 * Ponto único de verdade para "isto conta como extensão?". O campo `chext` da
 * matriz sozinho não responde: em cursos com `extensaoSoObrigatorias` a fonte
 * imprime CHEXT em optativas que não cumprem exigência alguma (ver o campo na
 * DescricaoCurso). Ler `horas.chext` direto faz o catálogo rotular a matéria de
 * extensionista, a Grade Mágica priorizá-la e o simulador de formatura creditar
 * horas que o histórico nunca vai reconhecer.
 */
export function chextCreditavel(
  matriz: Matriz | null | undefined,
  disciplina: { conjunto: number | null; horas: { chext: number } } | null | undefined,
): number {
  const chext = disciplina?.horas?.chext ?? 0;
  if (chext <= 0 || !exigeExtensao(matriz)) return 0;
  const curso = descricaoDoCurso(matriz ?? 981);
  // Obrigatória é a disciplina fora de qualquer conjunto da matriz. O teste vale
  // também para a disciplina simulada de `listarElegiveis`, que herda o conjunto
  // da matéria da matriz a que a oferta corresponde — a Oficina abre turma sob
  // outro código e continua creditando.
  //
  // Fica de fora só a eletiva de outro curso que traga CHEXT e não case com nada
  // da matriz: ela chega com `conjunto: null` e seria lida como obrigatória. O
  // histórico da 978 zera essa linha ("CHEXT Disciplinas Eletivas 0 0 0 Ok") e
  // nenhuma oferta conhecida do curso cai nesse caso; se passar a cair, o
  // discriminador tem de ser a categoria do elegível, não o conjunto.
  if (curso.extensaoSoObrigatorias && disciplina?.conjunto !== null) return 0;
  return chext;
}

/** Atalho booleano de `chextCreditavel`, para rótulos e filtros. */
export function creditaExtensao(
  matriz: Matriz | null | undefined,
  disciplina: { conjunto: number | null; horas: { chext: number } } | null | undefined,
): boolean {
  return chextCreditavel(matriz, disciplina) > 0;
}
