import type { DisciplinaMatriz, Matriz, OfertaSemestre, PerfilAluno } from "../tipos";

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
}

const CATEGORIA_POR_CONJUNTO: Record<number, IdCategoria> = { 1159: "segundoEstrato", 1161: "humanidades" };

function categoriaDe(d: DisciplinaMatriz): IdCategoria | null {
  if (d.conjunto === null) return "obrigatorias";
  if (CATEGORIA_POR_CONJUNTO[d.conjunto]) return CATEGORIA_POR_CONJUNTO[d.conjunto];
  if (d.conjunto >= 1162 && d.conjunto <= 1173) return "trilhas";
  return null; // 1199 (pool de eletivas) é tratado à parte
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

  let trilhas = 0;
  for (const [cod] of Object.entries(matriz.conjuntos)) {
    const n = Number(cod);
    if (n >= 1162 && n <= 1173) {
      // cada trilha contribui no máximo a sua própria exigência
      trilhas += Math.min(somaConjunto(cod), matriz.conjuntos[cod].ch);
    }
  }

  return {
    obrigatorias: perfil.resumoGeral?.obrigatorias.aprovada ?? 0,
    segundoEstrato: somaConjunto("1159"),
    humanidades: somaConjunto("1161"),
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
    segundoEstrato: matriz.conjuntos["1159"]?.ch ?? 360,
    humanidades: matriz.conjuntos["1161"]?.ch ?? 135,
    trilhas: matriz.conjuntos["1160"]?.ch ?? 345,
    eletivas: matriz.cargas.eletiva,
  };

  // ---- candidatas -------------------------------------------------------
  // Obrigatórias: o mínimo é o roster inteiro. Demais categorias: escolhe-se o
  // menor conjunto que fecha a carga, então todas entram no pool de candidatas.
  const candidatas = matriz.disciplinas.filter((d) => {
    if (d.codigo.startsWith("ENADE")) return false;
    if (aprovadas.has(d.codigo)) return false;
    const cat = categoriaDe(d);
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
      if (n >= 1162 && n <= 1173) horasPorTrilha.set(n, r.chCursadaAprovada);
    }
  }

  const falta = (cat: IdCategoria) =>
    Math.max(0, exigido[cat] - cumprido[cat] - planejado[cat]);

  /**
   * Horas de uma disciplina de trilha que efetivamente contam para as 345h do
   * 3º estrato. O que passa do teto da própria trilha (90h) é estudo que não
   * aproxima da formatura.
   */
  const contribuicaoTrilha = (d: DisciplinaMatriz): number => {
    const conj = d.conjunto!;
    const teto = matriz.conjuntos[String(conj)]?.ch ?? 90;
    const antes = horasPorTrilha.get(conj) ?? 0;
    return Math.min(antes + d.horas.total, teto) - Math.min(antes, teto);
  };

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
      falta("trilhas") === 0 &&
      eletivasPendentes === 0 &&
      ![...pendentes].some((c) => categoriaDe(porCodigo.get(c)!) === "obrigatorias");
    if (tudoFechado) break;

    const semestrePar = ehSemestrePar(semestreAtual);
    // o período avança um a cada semestre projetado
    const periodoNoSemestre = periodoAluno + passo;

    const elegiveis = [...pendentes]
      .map((c) => porCodigo.get(c)!)
      .filter((d) => {
        const cat = categoriaDe(d)!;
        // categoria já fechada: não se cursa além do mínimo
        if (cat !== "obrigatorias" && falta(cat) === 0) return false;

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
      const catA = categoriaDe(a)!;
      const catB = categoriaDe(b)!;
      // 1. obrigatórias primeiro: são todas exigidas e destravam o resto
      const obrA = catA === "obrigatorias" ? 1 : 0;
      const obrB = catB === "obrigatorias" ? 1 : 0;
      if (obrA !== obrB) return obrB - obrA;
      // 2. cadeia mais longa primeiro
      const hA = altura(a.codigo);
      const hB = altura(b.codigo);
      if (hA !== hB) return hB - hA;
      // 3. entre trilhas: primeiro a que aproveita todas as horas (não estoura o
      //    teto da trilha) e, em empate, a trilha mais perto de fechar
      if (catA === "trilhas" && catB === "trilhas") {
        const desperdicioA = a.horas.total - contribuicaoTrilha(a);
        const desperdicioB = b.horas.total - contribuicaoTrilha(b);
        if (desperdicioA !== desperdicioB) return desperdicioA - desperdicioB;

        const faltaTrilha = (d: DisciplinaMatriz) => {
          const teto = matriz.conjuntos[String(d.conjunto)]?.ch ?? 90;
          return Math.max(0, teto - (horasPorTrilha.get(d.conjunto!) ?? 0));
        };
        const fA = faltaTrilha(a);
        const fB = faltaTrilha(b);
        if (fA !== fB) return fA - fB;
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
      const cat = categoriaDe(d)!;
      const consome = ocupaVaga(d);
      if (consome && vagas <= 0) continue;
      if (cat !== "obrigatorias" && falta(cat) === 0) continue;

      // Cada trilha contribui no máximo a própria exigência (90h) para o total do
      // 3º estrato. Cursar uma 4ª disciplina dentro de uma trilha já fechada não
      // aproxima da formatura — e a premissa é cursar só o mínimo.
      let contribui = d.horas.total;
      if (cat === "trilhas") {
        contribui = contribuicaoTrilha(d);
        if (contribui <= 0) continue;
        // Se esta disciplina desperdiça horas (estoura o teto da trilha) e ainda
        // existe candidata que aproveita tudo, fica para depois. Sem esta guarda
        // o guloso enfia uma 3ª disciplina numa trilha já em 60h — o aluno cursa
        // 120h onde só 90h contam e acaba com uma matéria a mais no plano.
        if (contribui < d.horas.total) {
          const temAlternativaSemDesperdicio = elegiveis.some((outra) => {
            if (outra === d || !pendentes.has(outra.codigo)) return false;
            if (categoriaDe(outra) !== "trilhas") return false;
            const c = contribuicaoTrilha(outra);
            return c > 0 && c === outra.horas.total;
          });
          if (temAlternativaSemDesperdicio) continue;
        }
        horasPorTrilha.set(d.conjunto!, (horasPorTrilha.get(d.conjunto!) ?? 0) + d.horas.total);
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
    (c) => categoriaDe(porCodigo.get(c)!) === "obrigatorias",
  );
  const fechou =
    obrigatoriasRestantes.length === 0 &&
    falta("segundoEstrato") === 0 &&
    falta("humanidades") === 0 &&
    falta("trilhas") === 0 &&
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
  };
}
