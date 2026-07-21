import type { DisciplinaMatriz, Matriz, OfertaSemestre, PerfilAluno } from "../tipos";
import { descricaoDoCurso, ehTrilha, categoriaSimples } from "../cursos";

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
export function inferirSazonalidade(ofertas: OfertaSemestre[]): MapaSazonalidade {
  const emPar = new Set<string>();
  const emImpar = new Set<string>();
  for (const o of ofertas) {
    const alvo = ehSemestrePar(o.semestre) ? emPar : emImpar;
    for (const d of o.disciplinas) alvo.add(d.codigo);
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

// ----------------------------------------------------------------- categorias

export type IdCategoria =
  | "obrigatorias"
  | "segundoEstrato"
  | "humanidades"
  | "trilhas"
  | "eletivas";

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
}

export interface SemestreProjetado {
  semestre: string;
  disciplinas: DisciplinaPlanejada[];
  horas: number;
  /** disciplinas que de fato ocupam vaga na grade */
  materias: number;
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
}

/**
 * Trilhas que o curso exige validar integralmente (90h cada). O PPC descreve as
 * 345h do 3º estrato como "270h em três trilhas + 75h" — logo, além do total de
 * horas, há um piso de trilhas completas.
 */
export const TRILHAS_EXIGIDAS = 3;

function categoriaDe(d: DisciplinaMatriz, matriz: Matriz): IdCategoria | null {
  if (d.conjunto === null) return "obrigatorias";
  const curso = descricaoDoCurso(matriz);
  const simples = categoriaSimples(curso, d.conjunto);
  // a pool de eletivas é tratada à parte, como vaga genérica
  if (simples) return simples.id === "eletivas" ? null : (simples.id as IdCategoria);
  if (ehTrilha(curso, d.conjunto)) return "trilhas";
  return null;
}

/** Estágio e atividades complementares não são turma: não disputam vaga na grade. */
function ocupaVaga(d: DisciplinaMatriz): boolean {
  return !/^ICSX5/.test(d.codigo);
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
    trilhas: 0,
    eletivas: 0,
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
  let trilhas = agregado ?? 0;
  if (agregado === undefined) {
    for (const cod of Object.keys(matriz.conjuntos)) {
      if (ehTrilha(curso, cod)) trilhas += somaConjunto(cod);
    }
  }

  return {
    obrigatorias: perfil.resumoGeral?.obrigatorias.aprovada ?? 0,
    segundoEstrato: somaConjunto(String(curso.categorias.find((c: { id: string }) => c.id === "segundoEstrato")?.conjunto)),
    humanidades: somaConjunto(String(curso.categorias.find((c: { id: string }) => c.id === "humanidades")?.conjunto)),
    trilhas,
    eletivas: perfil.eletivas ? perfil.eletivas.chTotal - perfil.eletivas.chFaltante : 0,
  };
}

export interface OpcoesSimulacao {
  /** matérias por semestre que o aluno pretende cursar */
  ritmo: number;
  semestreInicial: string;
  /** teto de semestres projetados, trava contra laço infinito */
  horizonte?: number;
}

/**
 * Projeta a trajetória até a formatura.
 */
export function simularFormatura(
  perfil: PerfilAluno | null,
  matriz: Matriz,
  ofertas: OfertaSemestre[],
  opcoes: OpcoesSimulacao,
): ResultadoSimulacao {
  const { ritmo, semestreInicial } = opcoes;
  const horizonte = opcoes.horizonte ?? 20;
  const saz = inferirSazonalidade(ofertas);
  const cursoDesc = descricaoDoCurso(matriz);
  const avisos: string[] = [];

  const aprovadas = new Set<string>(perfil ? perfil.aprovadas : []);
  const cumprido = cumpridoPorCategoria(perfil, matriz);

  // Obrigatórias: o cumprido sai do próprio roster (soma exatamente a carga da
  // matriz), e não do Quadro Resumo. Assim o "já concluído" e o "a planejar"
  // falam da mesma lista de disciplinas e nunca somam mais que o exigido.
  const obrigatoriasPendentes = matriz.disciplinas.filter(
    (d) => d.conjunto === null && !d.codigo.startsWith("ENADE") && !aprovadas.has(d.codigo),
  );
  cumprido.obrigatorias =
    matriz.cargas.obrigatorias - obrigatoriasPendentes.reduce((a, d) => a + d.horas.total, 0);

  const exigido: Record<IdCategoria, number> = {
    obrigatorias: matriz.cargas.obrigatorias,
    segundoEstrato: matriz.conjuntos[String(cursoDesc.categorias.find((c: { id: string }) => c.id === "segundoEstrato")?.conjunto)]?.ch ?? 360,
    humanidades: matriz.conjuntos[String(cursoDesc.categorias.find((c: { id: string }) => c.id === "humanidades")?.conjunto)]?.ch ?? 135,
    trilhas: matriz.conjuntos[String(cursoDesc.agregadorTrilhas)]?.ch ?? 345,
    eletivas: matriz.cargas.eletiva,
  };

  // ---- candidatas -------------------------------------------------------
  // Obrigatórias: o mínimo é o roster inteiro. Demais categorias: escolhe-se o
  // menor conjunto que fecha a carga, então todas entram no pool de candidatas.
  const candidatas = matriz.disciplinas.filter((d) => {
    if (d.codigo.startsWith("ENADE")) return false;
    if (aprovadas.has(d.codigo)) return false;
    const cat = categoriaDe(d, matriz);
    if (cat === null) return false;
    if (cat !== "obrigatorias" && saz.de(d.codigo) === "sem_oferta") return false;
    return true;
  });

  const semOfertaObrigatorias = matriz.disciplinas.filter(
    (d) =>
      d.conjunto === null &&
      !d.codigo.startsWith("ENADE") &&
      !aprovadas.has(d.codigo) &&
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
    const filhos = (dependentesDe.get(codigo) ?? []).filter((f) => !aprovadas.has(f.codigo));
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
    trilhas: 0,
    eletivas: 0,
  };
  const horasPorTrilha = new Map<number, number>();
  if (perfil) {
    for (const r of perfil.resumoConjuntos) {
      const n = Number(r.conjunto);
      if (ehTrilha(cursoDesc, n)) horasPorTrilha.set(n, r.chCursadaAprovada);
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
   * O 3º estrato só fecha com AS DUAS condições: 345h no total e 3 trilhas
   * validadas. Uma não implica a outra — dá para ter 345h espalhadas sem validar
   * trilha nenhuma, e 3 trilhas validadas somam só 270h.
   */
  const faltaTerceiroEstrato = () =>
    falta("trilhas") > 0 || trilhasValidadas() < TRILHAS_EXIGIDAS;

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
        return aprovadas.has(p) || ehObrigatoria.has(p);
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
      // já validada primeiro, depois a que exige menos horas para fechar
      .sort((a, b) => a.restante - b.restante || b.jaTem - a.jaTem);

    return new Set(viaveis.slice(0, TRILHAS_EXIGIDAS).map((t) => t.conj));
  }

  const trilhasAlvo = escolherTrilhasAlvo();
  if (trilhasAlvo.size < TRILHAS_EXIGIDAS) {
    avisos.push(
      `Só ${trilhasAlvo.size} trilha(s) conseguem fechar as 90h com a oferta conhecida — ` +
        `o curso exige ${TRILHAS_EXIGIDAS}. A projeção segue, mas confira a oferta no Portal.`,
    );
  }

  const pendentes = new Set(candidatas.map((d) => d.codigo));
  const porCodigo = new Map(matriz.disciplinas.map((d) => [d.codigo, d]));
  const periodoAluno = perfil?.periodo ?? 1;

  const semestres: SemestreProjetado[] = [];
  let semestreAtual = semestreInicial;
  let eletivasPendentes = falta("eletivas");

  for (let passo = 0; passo < horizonte; passo++) {
    const tudoFechado =
      falta("obrigatorias") === 0 &&
      falta("segundoEstrato") === 0 &&
      falta("humanidades") === 0 &&
      !faltaTerceiroEstrato() &&
      eletivasPendentes === 0 &&
      ![...pendentes].some((c) => categoriaDe(porCodigo.get(c)!, matriz) === "obrigatorias");
    if (tudoFechado) break;

    const semestrePar = ehSemestrePar(semestreAtual);
    // o período avança um a cada semestre projetado
    const periodoNoSemestre = periodoAluno + passo;

    const elegiveis = [...pendentes]
      .map((c) => porCodigo.get(c)!)
      .filter((d) => {
        const cat = categoriaDe(d, matriz)!;
        // categoria já fechada: não se cursa além do mínimo
        if (cat === "trilhas") {
          if (!faltaTerceiroEstrato()) return false;
          if (!trilhasAlvo.has(d.conjunto!)) return false;
        } else if (cat !== "obrigatorias" && falta(cat) === 0) {
          return false;
        }

        const s = saz.de(d.codigo);
        if (s === "primeiro" && semestrePar) return false;
        if (s === "segundo" && !semestrePar) return false;

        return d.prerequisitos.every((p) => {
          const per = periodoExigido(p);
          if (per !== null) return periodoNoSemestre >= per;
          return aprovadas.has(p);
        });
      });

    if (elegiveis.length === 0 && eletivasPendentes === 0) {
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
      // 3. Entre trilhas, enquanto faltarem trilhas validadas, prioriza a que
      //    está mais perto de fechar as próprias 90h: validar 3 trilhas é
      //    exigência à parte do total de horas, e é ela que costuma travar.
      if (catA === "trilhas" && catB === "trilhas") {
        if (trilhasValidadas() < TRILHAS_EXIGIDAS) {
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

    for (const d of elegiveis) {
      const cat = categoriaDe(d, matriz)!;
      const consome = ocupaVaga(d);
      if (consome && vagas <= 0) continue;
      if (cat !== "obrigatorias" && cat !== "trilhas" && falta(cat) === 0) continue;

      // Toda hora de trilha conta para as 345h, inclusive a que passa das 90h da
      // própria trilha. O que faz uma disciplina ser dispensável não é estourar
      // a trilha, e sim o 3º estrato inteiro já estar fechado.
      const contribui = d.horas.total;
      if (cat === "trilhas") {
        if (!faltaTerceiroEstrato()) continue;

        const conj = d.conjunto!;
        // fora das trilhas-alvo o estudo não aproxima de validar as 3 exigidas
        if (!trilhasAlvo.has(conj)) continue;

        const horasNaTrilha = horasPorTrilha.get(conj) ?? 0;
        // Trilha já validada só recebe mais disciplina se ainda faltarem HORAS
        // para as 345h. Sem isso, quando a trilha que falta validar não tem
        // oferta no semestre, o motor despeja disciplina na trilha já fechada —
        // que não valida nada nem falta hora — e o plano incha sem avançar.
        if (horasNaTrilha >= chDaTrilha(conj) && falta("trilhas") === 0) continue;

        horasPorTrilha.set(conj, horasNaTrilha + d.horas.total);
      }

      escolhidas.push({
        codigo: d.codigo,
        nome: d.nome,
        horas: d.horas.total,
        categoria: cat,
        sazonalidade: saz.de(d.codigo),
        ocupaVaga: consome,
        conjunto: d.conjunto,
      });
      planejado[cat] += contribui;
      aprovadas.add(d.codigo);
      pendentes.delete(d.codigo);
      alturaMemo.clear();
      if (consome) vagas--;
    }

    // eletivas entram como vaga genérica: a escolha é livre, fora da matriz
    while (eletivasPendentes > 0 && vagas > 0) {
      const horas = Math.min(eletivasPendentes, 60);
      escolhidas.push({
        codigo: "ELETIVA",
        nome: `Eletiva livre (${horas}h)`,
        horas,
        categoria: "eletivas",
        sazonalidade: "ambos",
        ocupaVaga: true,
        conjunto: null,
      });
      planejado.eletivas += horas;
      eletivasPendentes -= horas;
      vagas--;
    }

    if (escolhidas.length === 0) {
      semestreAtual = proximoSemestre(semestreAtual);
      continue;
    }

    semestres.push({
      semestre: semestreAtual,
      disciplinas: escolhidas,
      horas: escolhidas.reduce((a, d) => a + d.horas, 0),
      materias: escolhidas.filter((d) => d.ocupaVaga).length,
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
    !faltaTerceiroEstrato() &&
    eletivasPendentes === 0;

  if (!fechou) {
    avisos.push(
      "A projeção não fecha dentro do horizonte simulado — reveja o ritmo ou verifique pré-requisitos travados.",
    );
  }

  const requisitos: Requisito[] = (
    [
      ["obrigatorias", "Obrigatórias (1º estrato)"],
      ["segundoEstrato", "2º Estrato"],
      ["humanidades", "Ciclo de Humanidades"],
      ["trilhas", "Trilhas (3º estrato)"],
      ["eletivas", "Eletivas"],
    ] as [IdCategoria, string][]
  ).map(([id, nome]) => ({
    id,
    nome,
    exigido: exigido[id],
    cumprido: cumprido[id],
    faltante: Math.max(0, exigido[id] - cumprido[id]),
    planejado: planejado[id],
    atendido: cumprido[id] + planejado[id] >= exigido[id],
  }));

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
    trilhasExigidas: TRILHAS_EXIGIDAS,
  };
}
