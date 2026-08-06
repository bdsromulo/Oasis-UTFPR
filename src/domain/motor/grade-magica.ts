import type { Matriz, OfertaSemestre, PerfilAluno, SelecaoTurma, Turma } from "../tipos";
import { listarElegiveis } from "./elegiveis";
import { haveriaConflito, itensDaSelecao } from "./grade";
import { criarMapaIdentidade } from "./identidade";
import {
  cargaAprovadaBlocoOptativo,
  categoriaSimples,
  contaNoBlocoOptativo,
  creditaExtensao,
  descricaoDoCurso,
  ehTrilha,
  grupoOpcaoDe,
  TETO_CH_SEMESTRE,
} from "../cursos";

export interface OpcoesSugestaoGrade {
  estrategia: "adiantar_maximo" | "balanceado";
  naoManha: boolean;
  naoTarde: boolean;
  naoNoite: boolean;
  sedeCentro?: boolean;
  sedeEcoville?: boolean;
  sedeNeoville?: boolean;
  maxDisciplinas?: number;
  disciplinasExcluidas?: ({ codigo: string; nome: string } | string)[];
  professoresExcluidos?: string[];
  trilhasExcluidas?: string[];
  semHumanidades?: boolean;
  semTrilhas?: boolean;
  semEletivas?: boolean;
  priorizarExtensionistas?: boolean;
}

export type OpcoesGradeMagica = OpcoesSugestaoGrade;

/**
 * Retorna o peso de prioridade da turma quando a oferta usa a convenção BSI:
 * - Prioridade 1 (Exclusivamente S73): +100 pontos
 * - Prioridade 2 (Exclusivamente S71): +30 pontos (reduzido mas relevante)
 * - Outras (Sem prioridade): +5 pontos
 */
export function calcularPesoPrioridadeTurma(turma: Turma, usarPrioridadeBsi = true): number {
  if (!usarPrioridadeBsi) return 0;
  const cod = turma.codigo.toUpperCase();
  if (cod.startsWith("S73") || cod.includes("-S73")) {
    return 100; // Prioridade 1
  }
  if (cod.startsWith("S71") || cod.includes("-S71")) {
    return 30; // Prioridade 2 (reduzida mas ainda relevante)
  }
  return 5;
}

/**
 * Verifica se a turma viola alguma restrição de turnos do usuário
 */
export function turmaViolaTurnos(
  turma: Turma,
  restricoes: { naoManha: boolean; naoTarde: boolean; naoNoite: boolean },
): boolean {
  for (const h of turma.horarios) {
    if (restricoes.naoManha && h.turno === "M") return true;
    if (restricoes.naoTarde && h.turno === "T") return true;
    if (restricoes.naoNoite && h.turno === "N") return true;
  }
  return false;
}

/**
 * Verifica se a turma viola alguma restrição de sedes do usuário.
 * Por padrão: Centro = true, Ecoville = false, Neoville = false.
 */
export function turmaViolaSedes(
  turma: Turma,
  restricoes: { sedeCentro?: boolean; sedeEcoville?: boolean; sedeNeoville?: boolean },
): boolean {
  const c = restricoes.sedeCentro ?? true;
  const e = restricoes.sedeEcoville ?? false;
  const n = restricoes.sedeNeoville ?? false;

  for (const h of turma.horarios) {
    if (h.sede === "Centro" && !c) return true;
    if (h.sede === "Ecoville" && !e) return true;
    if (h.sede === "Neoville" && !n) return true;
  }
  return false;
}

/**
 * Verifica se a disciplina está marcada para exclusão pelo usuário
 */
export function disciplinaEstaExcluida(
  disciplina: { codigo: string; nome: string },
  excluidas?: ({ codigo: string; nome: string } | string)[],
): boolean {
  if (!excluidas || excluidas.length === 0) return false;
  const cod = disciplina.codigo.trim().toUpperCase();
  const nome = disciplina.nome.trim().toLowerCase();
  return excluidas.some((item) => {
    if (typeof item === "string") {
      const s = item.trim().toLowerCase();
      return cod === item.trim().toUpperCase() || nome.includes(s);
    }
    return cod === item.codigo.trim().toUpperCase();
  });
}

/**
 * Verifica se a turma possui algum professor excluído na Sugestão de Grade.
 * Se o professor excluído é um dos professores (mesmo em turmas com múltiplos professores), exclui a turma inteira.
 */
export function turmaViolaProfessores(
  turma: Turma,
  restricoes: { professoresExcluidos?: string[] },
): boolean {
  if (!restricoes.professoresExcluidos || restricoes.professoresExcluidos.length === 0) {
    return false;
  }
  const listaProfs: string[] = [];
  if (turma.professores && turma.professores.length > 0) {
    listaProfs.push(...turma.professores);
  }
  if (turma.professores_raw) {
    listaProfs.push(...turma.professores_raw.split(/[,;/]+/));
  }

  for (const profEx of restricoes.professoresExcluidos) {
    const profExLimpo = profEx.trim().toLowerCase();
    if (!profExLimpo) continue;
    for (const profTurma of listaProfs) {
      const pLimpo = profTurma.trim().toLowerCase();
      if (pLimpo === profExLimpo || pLimpo.includes(profExLimpo) || profExLimpo.includes(pLimpo)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Pontua o quão balanceada é a inclusão de uma nova turma na grade atual.
 * Valoriza grades que mantêm pelo menos 1 dia útil livre e/ou distribuem com poucas matérias por dia.
 */
export function calcularScoreBalanceamento(
  itensAtuais: { disciplina: { codigo: string }; turma: Turma }[],
  novaTurma: Turma,
  codNovaDisc: string,
): number {
  const diasOcupadosAtual = new Set<number>();
  const discPorDiaAtual = new Map<number, Set<string>>();
  const aulasPorDiaAtual = new Map<number, number>();

  for (const item of itensAtuais) {
    for (const h of item.turma.horarios) {
      diasOcupadosAtual.add(h.dia);
      if (!discPorDiaAtual.has(h.dia)) discPorDiaAtual.set(h.dia, new Set());
      discPorDiaAtual.get(h.dia)!.add(item.disciplina.codigo);
      aulasPorDiaAtual.set(h.dia, (aulasPorDiaAtual.get(h.dia) || 0) + 1);
    }
  }

  const diasOcupadosNovo = new Set(diasOcupadosAtual);
  const discPorDiaNovo = new Map<number, Set<string>>();
  const aulasPorDiaNovo = new Map<number, number>(aulasPorDiaAtual);

  for (const [dia, set] of discPorDiaAtual.entries()) {
    discPorDiaNovo.set(dia, new Set(set));
  }

  for (const h of novaTurma.horarios) {
    diasOcupadosNovo.add(h.dia);
    if (!discPorDiaNovo.has(h.dia)) discPorDiaNovo.set(h.dia, new Set());
    discPorDiaNovo.get(h.dia)!.add(codNovaDisc);
    aulasPorDiaNovo.set(h.dia, (aulasPorDiaNovo.get(h.dia) || 0) + 1);
  }

  const diasSemanaAtual = Array.from(diasOcupadosAtual).filter((d) => d >= 2 && d <= 6);
  const diasSemanaNovo = Array.from(diasOcupadosNovo).filter((d) => d >= 2 && d <= 6);

  let score = 0;

  // 1. Manter dia livre ou não adicionar novos dias de deslocamento
  if (diasSemanaNovo.length <= 4) {
    score += 50; // Mantém pelo menos um dia útil livre na semana!
  } else if (diasSemanaNovo.length === 5 && diasSemanaAtual.length <= 4) {
    score -= 60; // Penalidade forte ao eliminar o último dia útil livre
  }

  if (diasOcupadosNovo.size === diasOcupadosAtual.size) {
    score += 30; // Encaixa perfeitamente nos dias que o aluno já vai à faculdade
  }

  if (diasOcupadosNovo.has(7) && !diasOcupadosAtual.has(7)) {
    score -= 40; // Evita abrir sábado se o aluno não tinha aulas no sábado
  }

  // 2. Avaliar volume diário (poucas matérias por dia)
  for (const [dia, setDisc] of discPorDiaNovo.entries()) {
    const numDisc = setDisc.size;
    const numAulas = aulasPorDiaNovo.get(dia) || 0;

    if (numDisc >= 3 || numAulas >= 6) {
      score -= 35; // Penaliza dias pesados com 3+ matérias ou 6+ aulas
    } else if (numDisc <= 2 && numAulas <= 4) {
      score += 15; // Recompensa dias leves e equilibrados
    }
  }

  return score;
}

/**
 * Algoritmo da Sugestão de Grade:
 * Monta automaticamente a grade ideal para o aluno maximizando carga horária e avanço no curso,
 * respeitando restrições de turno, pré-requisitos, choques de horário e exclusões personalizadas,
 * e, quando aplicável à matriz, aplicando a prioridade entre turmas.
 */
export function gerarSugestaoGrade(
  perfil: PerfilAluno | null,
  matriz: Matriz,
  oferta: OfertaSemestre,
  opcoes: OpcoesSugestaoGrade,
  selecaoInicial?: SelecaoTurma[],
): SelecaoTurma[] {
  const maxDisc = opcoes.maxDisciplinas || (opcoes.estrategia === "balanceado" ? 5 : 99);

  // 1. Calcular demanda de horas pendentes por categoria no perfil / matriz
  const curso = descricaoDoCurso(matriz);
  const cjHumanidades = curso.categorias.find((c) => c.id === "humanidades")?.conjunto ?? null;
  const cjSegundoEstrato = curso.categorias.find((c) => c.id === "segundoEstrato")?.conjunto ?? null;
  const cjAgregador = curso.agregadorTrilhas;
  const cjEletivas = curso.categorias.find((c) => c.id === "eletivas")?.conjunto ?? null;

  // A disciplina aponta para a folha da árvore de conjuntos; a categoria é do
  // topo. Comparar o número direto funcionava em BSI e Eng. Comp., onde a
  // categoria é o próprio conjunto da disciplina, mas em Eng. Eletrônica as
  // matérias de humanidades ficam em 1213..1217 e o conjunto 1174 nunca aparece
  // numa disciplina — o teto de humanidades simplesmente não disparava.
  const ehDaCategoria = (c: number | null, id: string) =>
    c !== null && categoriaSimples(curso, c)?.id === id;
  const ehHumanidades = (c: number | null) => ehDaCategoria(c, "humanidades");
  const ehSegundoEstrato = (c: number | null) => ehDaCategoria(c, "segundoEstrato");

  const resumoHumanidades = cjHumanidades === null
    ? undefined
    : perfil?.resumoConjuntos.find((x) => x.conjunto === String(cjHumanidades));
  const chFaltanteHumanidades = cjHumanidades === null
    ? 0
    : resumoHumanidades
      ? Math.max(0, resumoHumanidades.chObrigatoria - resumoHumanidades.chCursadaAprovada)
      : (matriz.conjuntos[String(cjHumanidades)]?.ch ?? 0);

  const resumoSegundoEstrato = cjSegundoEstrato === null
    ? undefined
    : perfil?.resumoConjuntos.find((x) => x.conjunto === String(cjSegundoEstrato));
  const chFaltanteEstrato2 = cjSegundoEstrato === null
    ? 0
    : resumoSegundoEstrato
      ? Math.max(0, resumoSegundoEstrato.chObrigatoria - resumoSegundoEstrato.chCursadaAprovada)
      : (matriz.conjuntos[String(cjSegundoEstrato)]?.ch ?? 0);

  const trilhasNoPerfil = Object.entries(matriz.conjuntos)
    .filter(([cod]) => ehTrilha(curso, cod))
    .map(([cod, conj]) => {
      const r = perfil?.resumoConjuntos.find((x) => x.conjunto === cod);
      const cump = r ? Math.min(r.chCursadaAprovada, r.chObrigatoria) : 0;
      return { cod, chExigida: conj.ch, cump, validado: cump >= conj.ch };
    });
  const trilhasValidadasCount = trilhasNoPerfil.filter((t) => t.validado).length;
  const trilhasAlvo = Math.max(0, curso.trilhasExigidas - trilhasValidadasCount);
  const trilhasPendentes = trilhasNoPerfil
    .filter((t) => !t.validado)
    .sort((a, b) => b.cump - a.cump);
  const chFaltanteTrilhas = trilhasPendentes
    .slice(0, trilhasAlvo)
    .reduce((acc, t) => acc + Math.max(0, t.chExigida - t.cump), 0);
  const chExigidaBlocoOptativo = cjAgregador
    ? matriz.conjuntos[String(cjAgregador)]?.ch ?? matriz.cargas.optativas
    : matriz.cargas.optativas;
  const chCumpridaBlocoOptativo = cargaAprovadaBlocoOptativo(perfil, curso);
  const chFaltanteBlocoOptativo = Math.max(
    0,
    chExigidaBlocoOptativo - chCumpridaBlocoOptativo,
  );

  // Sem "Resumo Eletiva" no histórico, o que vale é o que a matriz exige — e não
  // um piso de 120h, que é número de BSI. Eng. Eletrônica e a Eng. Comp. 962
  // declaram `cargas.eletiva: 0` e os históricos delas não trazem a tabela de
  // eletivas: a sugestão gastava duas vagas do semestre em matérias que aquele
  // currículo não pede.
  const chFaltanteEletivas = perfil
    ? (perfil.eletivas?.chFaltante ??
       Math.max(0, (perfil.eletivas?.chTotal ?? matriz.cargas.eletiva) - (perfil.eletivas?.chValidada ?? 0)))
    : matriz.cargas.eletiva;

  // Grupos de escolha ("Opções de …", matriz 968): cada um tem carga própria a
  // cumprir e não há bloco agregado que os some. Fechar um grupo não paga o
  // vizinho — 60h de Programação de Computador não substituem 75h de Circuitos
  // Digitais —, então o teto tem de ser por grupo.
  const chFaltantePorGrupo = new Map<string, number>();
  for (const g of curso.gruposOpcao ?? []) {
    const cod = String(g);
    const r = perfil?.resumoConjuntos.find((x) => x.conjunto === cod);
    const exigida = r?.chObrigatoria ?? matriz.conjuntos[cod]?.ch ?? 0;
    const cumprida = r ? Math.min(r.chCursadaAprovada, exigida) : 0;
    chFaltantePorGrupo.set(cod, Math.max(0, exigida - cumprida));
  }
  /** Grupo de escolha ao qual a disciplina pertence, subindo a hierarquia. */
  const grupoDa = (c: number | null): string | null => {
    const g = grupoOpcaoDe(curso, c);
    return g === null ? null : String(g);
  };

  // Inicializar seleção e contadores de carga horária a partir da seleção inicial (se houver)
  const selecaoFinal: SelecaoTurma[] = selecaoInicial ? [...selecaoInicial] : [];
  let chTotalAlocada = 0;
  let chAlocadaHumanidades = 0;
  let chAlocadaEstrato2 = 0;
  let chAlocadaTrilhas = 0;
  let chAlocadaEletivas = 0;
  const chAlocadaPorGrupo = new Map<string, number>();

  for (const s of selecaoFinal) {
    const dm = matriz?.disciplinas.find((x) => x.codigo === s.codDisciplina);
    const dOf = oferta.disciplinas.find((x) => x.codigo === s.codDisciplina);
    const h = dm ? dm.horas.total : ((dOf?.aulas_semanais_presenciais || 4) * 15);
    const c = dm?.conjunto ?? null;
    const grupo = grupoDa(c);
    chTotalAlocada += h;
    if (ehHumanidades(c)) chAlocadaHumanidades += h;
    else if (ehSegundoEstrato(c)) chAlocadaEstrato2 += h;
    else if ((cjEletivas !== null && c === cjEletivas) || (!dm && dOf)) chAlocadaEletivas += h;
    else if (grupo !== null) chAlocadaPorGrupo.set(grupo, (chAlocadaPorGrupo.get(grupo) ?? 0) + h);
    else if (contaNoBlocoOptativo(curso, c)) chAlocadaTrilhas += h;
  }

  /** Quanto o grupo ainda precisa, já descontado o que a grade em montagem alocou. */
  const faltaNoGrupo = (grupo: string) =>
    Math.max(0, (chFaltantePorGrupo.get(grupo) ?? 0) - (chAlocadaPorGrupo.get(grupo) ?? 0));

  // A oferta traz a mesma exigência curricular sob códigos diferentes: em Eng.
  // Eletrônica `ELN73B` é equivalente declarado de `ELB11`, e as duas abrem
  // turma. Sem consolidar pelo código canônico, a sugestão punha as duas na
  // grade — o aluno se matricularia duas vezes na mesma matéria, gastando uma
  // vaga do semestre em algo que não avança nada.
  const mapaIdentidade = criarMapaIdentidade(matriz);
  const canonicosSelecionados = new Set<string>(
    selecaoFinal.map((s) => mapaIdentidade.resolver(s.codDisciplina)),
  );

  // 2. Obter todas as disciplinas elegíveis (pendentes/liberadas) respeitando se a categoria já foi concluída
  const elegiveis = listarElegiveis(perfil, matriz, oferta).filter((e) => {
    if (e.motivoBloqueio || !e.oferta || e.oferta.turmas.length === 0) return false;
    if (selecaoFinal.some((s) => s.codDisciplina === e.disciplina.codigo)) return false;
    if (disciplinaEstaExcluida(e.disciplina, opcoes.disciplinasExcluidas)) return false;
    if (ehHumanidades(e.disciplina.conjunto)) {
      if (opcoes.semHumanidades) return false;
      if (chFaltanteHumanidades <= 0) return false;
    }
    if (ehSegundoEstrato(e.disciplina.conjunto) && chFaltanteEstrato2 <= 0) return false;
    // grupo de escolha já cumprido não recebe mais matéria: a hora extra ali não
    // aproxima da integralização, e o aluno tem outros grupos em aberto
    const grupoElegivel = grupoDa(e.disciplina.conjunto);
    if (grupoElegivel !== null && faltaNoGrupo(grupoElegivel) <= 0) return false;
    if (contaNoBlocoOptativo(curso, e.disciplina.conjunto)) {
      if (opcoes.semTrilhas) return false;
      if (opcoes.trilhasExcluidas && opcoes.trilhasExcluidas.includes(String(e.disciplina.conjunto))) return false;
      if (chFaltanteTrilhas <= 0 && chFaltanteBlocoOptativo <= 0) return false;
    }
    if ((cjEletivas !== null && e.disciplina.conjunto === cjEletivas) || e.categoria === "eletiva") {
      if (opcoes.semEletivas) return false;
      if (chFaltanteEletivas <= 0) return false;
    }
    return true;
  });

  // Mapear carga horária de turmas elegíveis e disponíveis no semestre por trilha
  const chDisponivelPorTrilha = new Map<string, number>();
  for (const e of elegiveis) {
    if (e.disciplina.conjunto !== null && contaNoBlocoOptativo(curso, e.disciplina.conjunto)) {
      const cod = String(e.disciplina.conjunto);
      if (ehTrilha(curso, e.disciplina.conjunto)) {
        chDisponivelPorTrilha.set(cod, (chDisponivelPorTrilha.get(cod) ?? 0) + e.disciplina.horas.total);
      }
    }
  }

  // Identificar Trilhas Alvo prioritárias: concentrar o foco nas trilhas em que o aluno já iniciou progresso
  // e que possuem disciplinas abertas no semestre, para fechar a exigência (ex: 3 trilhas de 90h) antes de espalhar carga
  const trilhasValidadasSet = new Set<string>(
    trilhasNoPerfil.filter((t) => t.validado).map((t) => t.cod)
  );
  const conjuntosTrilhaAlvo = new Set<string>(
    trilhasNoPerfil
      .filter((t) => !t.validado)
      .sort((a, b) => {
        const dispA = (chDisponivelPorTrilha.get(a.cod) ?? 0) > 0 ? 1 : 0;
        const dispB = (chDisponivelPorTrilha.get(b.cod) ?? 0) > 0 ? 1 : 0;
        if (dispA !== dispB) return dispB - dispA; // Prioridade imediata para trilhas com turmas abertas nesta oferta
        return b.cump - a.cump || (chDisponivelPorTrilha.get(b.cod) ?? 0) - (chDisponivelPorTrilha.get(a.cod) ?? 0);
      })
      .slice(0, trilhasAlvo)
      .map((t) => t.cod)
  );

  // 3. Pontuar cada disciplina para saber quais priorizar na grade
  const disciplinasPontuadas = elegiveis.map((e) => {
    let pts = 0;
    if (e.categoria === "obrigatória") pts += 80; // Prioridade máxima absoluta para obrigatórias de 1º estrato
    if (e.categoria === "obrigatória" || e.categoria === "2º estrato") {
      const periodo = e.disciplina.periodo || 9;
      pts += (10 - periodo) * 12; // Períodos mais iniciais têm mais peso apenas para obrigatórias/2º estrato
    }
    pts += Math.min(e.disciplina.horas.total, 90) / 5; // Carga horária

    if (opcoes.priorizarExtensionistas && creditaExtensao(matriz, e.disciplina)) {
      pts += 45; // Aumentar significativamente o peso de matérias extensionistas quando priorizado
    }

    // Reduzir ligeiramente a prioridade inicial de humanidades frente a disciplinas técnicas/obrigatórias
    if (ehHumanidades(e.disciplina.conjunto)) pts -= 15;

    // Grupos de escolha: quanto menos falta para o grupo fechar, mais vale a
    // matéria — é o mesmo raciocínio das trilhas-alvo. Um grupo em que faltam
    // 45h fecha neste semestre; espalhar carga por grupos intocados não fecha
    // nenhum.
    const grupoPontuado = grupoDa(e.disciplina.conjunto);
    if (grupoPontuado !== null) {
      const falta = faltaNoGrupo(grupoPontuado);
      pts += falta > 0 && falta <= e.disciplina.horas.total ? 55 : 25;
    }

    // Inteligência de Trilhas: priorizar disciplinas que ajudam a fechar as N trilhas exigidas pelo curso
    if (e.disciplina.conjunto !== null && contaNoBlocoOptativo(curso, e.disciplina.conjunto)) {
      const codConjunto = String(e.disciplina.conjunto);
      if (ehTrilha(curso, e.disciplina.conjunto)) {
        if (conjuntosTrilhaAlvo.has(codConjunto)) {
          // Trilha alvo: alta prioridade para bater as 90h exigidas naquelas em que o aluno já investiu tempo!
          const cumpAtual = trilhasNoPerfil.find((t) => t.cod === codConjunto)?.cump ?? 0;
          pts += 65 + (cumpAtual / 5);
        } else if (trilhasValidadasSet.has(codConjunto)) {
          // Trilha já completa (90/90h): forte penalidade para evitar pegar matérias excedentes aqui se houver outras trilhas precisando de horas
          pts -= 40;
        } else {
          // Trilhas não-iniciadas ou fora das metas (evita pulverizar horas em 4 ou 5 trilhas diferentes)
          pts -= 15;
        }
      }
    }

    // Filtrar e pontuar as turmas válidas dessa disciplina
    const turmasValidas = e.oferta!.turmas
      .filter((t) => !turmaViolaTurnos(t, opcoes) && !turmaViolaSedes(t, opcoes) && !turmaViolaProfessores(t, opcoes))
      .map((t) => ({
        turma: t,
        pontos: calcularPesoPrioridadeTurma(t, curso.matriz === 981),
      }))
      .sort((a, b) => b.pontos - a.pontos);

    return {
      elegivel: e,
      pontosDisc: pts,
      turmasValidas,
    };
  });

  // Filtrar disciplinas que tenham ao menos 1 turma válida após corte de turnos
  const candidatas = disciplinasPontuadas
    .filter((d) => d.turmasValidas.length > 0)
    .sort((a, b) => b.pontosDisc - a.pontosDisc);

  // Rastrear progressão dinâmica por trilha durante o loop guloso para detectar quando uma trilha completa 90h na própria simulação
  const cumpSimuladoPorTrilha = new Map<string, number>();
  for (const t of trilhasNoPerfil) {
    cumpSimuladoPorTrilha.set(t.cod, t.cump);
  }
  for (const s of selecaoFinal) {
    const dm = matriz?.disciplinas.find((x) => x.codigo === s.codDisciplina);
    if (dm && dm.conjunto !== null && ehTrilha(curso, dm.conjunto)) {
      const cod = String(dm.conjunto);
      cumpSimuladoPorTrilha.set(cod, (cumpSimuladoPorTrilha.get(cod) ?? 0) + dm.horas.total);
    }
  }
  const todasTrilhasValidadas = () => {
    let count = 0;
    for (const t of trilhasNoPerfil) {
      if ((cumpSimuladoPorTrilha.get(t.cod) ?? 0) >= t.chExigida) count++;
    }
    return count >= curso.trilhasExigidas;
  };

  // 4. Algoritmo Guloso / Backtracking leve para selecionar turmas sem choque e sem exceder horas necessárias (teto de matrícula do semestre)
  for (const item of candidatas) {
    if (opcoes.estrategia === "balanceado" && selecaoFinal.length >= maxDisc) break;
    if (chTotalAlocada + item.elegivel.disciplina.horas.total > TETO_CH_SEMESTRE) continue;

    const canonicoDoItem = mapaIdentidade.resolver(item.elegivel.disciplina.codigo);
    if (canonicosSelecionados.has(canonicoDoItem)) continue;

    const c = item.elegivel.disciplina.conjunto;
    const grupoDoItem = grupoDa(c);
    if (ehHumanidades(c) && chAlocadaHumanidades >= chFaltanteHumanidades) continue;
    if (ehSegundoEstrato(c) && chAlocadaEstrato2 >= chFaltanteEstrato2) continue;
    if (grupoDoItem !== null && faltaNoGrupo(grupoDoItem) <= 0) continue;
    if (
      contaNoBlocoOptativo(curso, c) &&
      chAlocadaTrilhas >= chFaltanteBlocoOptativo &&
      todasTrilhasValidadas()
    ) {
      continue;
    }
    if (
      ((cjEletivas !== null && c === cjEletivas) || item.elegivel.categoria === "eletiva") &&
      chAlocadaEletivas >= chFaltanteEletivas
    ) {
      continue;
    }

    const itensAtuais = itensDaSelecao(oferta, selecaoFinal);

    let melhorTurma: Turma | null = null;
    let melhorScore = -Infinity;

    for (const tv of item.turmasValidas) {
      if (!haveriaConflito(itensAtuais, item.elegivel.oferta!, tv.turma)) {
        if (opcoes.estrategia === "balanceado") {
          const scoreBal = tv.pontos + calcularScoreBalanceamento(itensAtuais, tv.turma, item.elegivel.disciplina.codigo);
          if (scoreBal > melhorScore) {
            melhorScore = scoreBal;
            melhorTurma = tv.turma;
          }
        } else {
          // Em adiantar_maximo, pega a primeira turma válida sem conflito com maior prioridade
          melhorTurma = tv.turma;
          break;
        }
      }
    }

    if (melhorTurma) {
      // Em balanceado, se já temos 4 disciplinas e essa nova matéria eliminaria o último dia útil livre, pula e tenta outra
      if (opcoes.estrategia === "balanceado" && selecaoFinal.length >= 4) {
        const diasSemanaAtual = new Set(
          itensAtuais.flatMap((i) => i.turma.horarios.map((h) => h.dia)).filter((d) => d >= 2 && d <= 6),
        );
        const diasSemanaNovo = new Set([
          ...Array.from(diasSemanaAtual),
          ...melhorTurma.horarios.map((h) => h.dia).filter((d) => d >= 2 && d <= 6),
        ]);
        if (diasSemanaAtual.size <= 4 && diasSemanaNovo.size === 5) {
          continue; // Mantém o dia livre!
        }
      }

      // A seleção tem de apontar para o código sob o qual a turma existe NA
      // OFERTA, e não para o da matriz. `buscarOfertaParaPlanejamento` casa a
      // disciplina por equivalência, então os dois divergem sempre que a turma
      // abre sob outro código — em Eng. Comp. 844, EEC21, CSR41, CSR42 e EEF31.
      // Gravando o código da matriz, `itensDaSelecao` não achava a disciplina e
      // ela sumia da grade montada: a sugestão devolvia seis matérias e só duas
      // apareciam. É o mesmo código que a importação do Simulador já usa.
      selecaoFinal.push({
        codDisciplina: item.elegivel.oferta?.codigo ?? item.elegivel.disciplina.codigo,
        codTurma: melhorTurma.codigo,
      });
      canonicosSelecionados.add(canonicoDoItem);
      chTotalAlocada += item.elegivel.disciplina.horas.total;
      if (ehHumanidades(c)) {
        chAlocadaHumanidades += item.elegivel.disciplina.horas.total;
      } else if (ehSegundoEstrato(c)) {
        chAlocadaEstrato2 += item.elegivel.disciplina.horas.total;
      } else if ((cjEletivas !== null && c === cjEletivas) || item.elegivel.categoria === "eletiva") {
        chAlocadaEletivas += item.elegivel.disciplina.horas.total;
      } else if (grupoDoItem !== null) {
        chAlocadaPorGrupo.set(
          grupoDoItem,
          (chAlocadaPorGrupo.get(grupoDoItem) ?? 0) + item.elegivel.disciplina.horas.total,
        );
      } else if (contaNoBlocoOptativo(curso, c)) {
        chAlocadaTrilhas += item.elegivel.disciplina.horas.total;
        if (c !== null && ehTrilha(curso, c)) {
          const cod = String(c);
          cumpSimuladoPorTrilha.set(cod, (cumpSimuladoPorTrilha.get(cod) ?? 0) + item.elegivel.disciplina.horas.total);
        }
      }
    }
  }

  return selecaoFinal;
}

export const gerarGradeMagica = gerarSugestaoGrade;
