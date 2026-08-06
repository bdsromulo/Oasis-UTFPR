// Painel de situação do aluno: combina o PerfilAluno (histórico) com a matriz.
// Os números por conjunto vêm do próprio histórico (fonte oficial consolidada);
// a matriz entra para nomear, ordenar e detectar inconsistências.
import type { Matriz, PerfilAluno, ResumoConjunto } from "../tipos";
import {
  cargaAprovadaBlocoOptativo,
  descricaoDoCurso,
  trilhasDaMatriz,
} from "../cursos";

export interface ProgressoConjunto {
  conjunto: string;
  nome: string;
  exigido: number;
  cumprido: number;
  validado: boolean;
  ehTrilha: boolean;
}

export interface Painel {
  obrigatorias: { total: number; aprovada: number; faltante: number } | null;
  segundoEstrato: ProgressoConjunto | null;
  humanidades: ProgressoConjunto | null;
  trilhas: ProgressoConjunto[];
  trilhasValidadas: number;
  /**
   * Grupos de escolha obrigatória, quando o curso os tem (matriz 968).
   *
   * Não é um bloco com carga própria declarada: a exigência é a soma das cargas
   * dos grupos, e um grupo fechado não paga o que falta noutro. Por isso o
   * painel guarda os dois — o total e a lista, grupo a grupo.
   */
  opcoes: {
    exigido: number;
    cumprido: number;
    gruposCumpridos: number;
    grupos: ProgressoConjunto[];
  } | null;
  blocoOptativo: { exigido: number; cumprido: number; validado?: number } | null;
  eletivas: { exigido: number; cumprido: number } | null;
  extensao: { exigido: number; cumprido: number } | null;
  inconsistencias: string[];
}

export interface ProgressoGlobal {
  /** horas já integralizadas, pela consolidação oficial */
  cumprido: number;
  /** carga total do PPC */
  total: number;
  /** `cumprido / total`, já arredondado para exibição */
  percentual: number;
}

/**
 * Quanto do curso já foi concluído. Régua única de toda a plataforma.
 *
 * Mora aqui, e não na tela, porque duas telas respondiam a esta pergunta com
 * contas próprias e chegavam a números diferentes para o mesmo histórico — 48%
 * na Situação contra 54% no Simulador. Duas contas para uma pergunta só é sempre
 * uma delas errada, e o aluno não tem como saber qual.
 *
 * A régua é a oficial: Quadro Resumo do histórico sobre o `ch_total_ppc`. Duas
 * consequências que parecem omissões e não são:
 *
 * 1. A extensão NÃO entra como parcela. Suas horas vêm embutidas no CHEXT das
 *    disciplinas, então já estão dentro de obrigatórias e optativas. Somá-la de
 *    novo contaria as mesmas horas duas vezes.
 * 2. O denominador é o `ch_total_ppc`, e não o `cargas.soma`. A soma das
 *    categorias dá 3280h na 981 justamente porque repete essas horas de extensão;
 *    o total do PPC é 3220h.
 *
 * A soma por categoria continua valendo para dizer o que FALTA em cada bloco —
 * é o que a lista de requisitos do simulador faz. Ela só não serve de percentual
 * global.
 */
export function progressoGlobalDoCurso(
  perfil: PerfilAluno | null,
  matriz: Matriz,
): ProgressoGlobal {
  const total = matriz.cargas.ch_total_ppc || 3200;
  const pct = (cumprido: number) => ({
    cumprido,
    total,
    percentual: Math.round((cumprido / Math.max(1, total)) * 100),
  });

  if (!perfil) return pct(0);

  // O Quadro Resumo é a consolidação oficial e já aplica os tetos por categoria —
  // eletivas, por exemplo, param no teto da matriz mesmo quando o aluno cursou
  // mais horas. Somar as cursadas devolveria número acima do que o Portal
  // reconhece, e por isso a soma só serve de fallback.
  const resumo = perfil.resumoGeral;
  if (resumo) {
    const oficial =
      resumo.obrigatorias.aprovada + resumo.optativas.aprovada + resumo.eletivas.aprovada;
    return pct(Math.min(oficial, total));
  }

  let soma = 0;
  for (const c of perfil.cursadas) {
    if (c.situacao === "aprovado" || c.situacao === "consignado" || c.situacao === "dispensado") {
      soma += c.cht || 0;
    }
  }
  return pct(Math.min(soma, total));
}

function prog(r: ResumoConjunto, ehTrilha: boolean): ProgressoConjunto {
  return {
    conjunto: r.conjunto,
    nome: r.nome,
    exigido: r.chObrigatoria,
    cumprido: Math.min(r.chCursadaAprovada, r.chObrigatoria),
    validado: r.chValidada > 0 || (typeof r.chFaltante === "number" && r.chFaltante === 0),
    ehTrilha,
  };
}

export function montarPainel(perfil: PerfilAluno, matriz: Matriz): Painel {
  const inconsistencias: string[] = [];
  if (perfil.matriz !== null && perfil.matriz !== matriz.matriz) {
    inconsistencias.push(
      `histórico é da matriz ${perfil.matriz}, mas a plataforma cobre a matriz ${matriz.matriz}`,
    );
  }
  const curso = descricaoDoCurso(matriz);
  const por = new Map(perfil.resumoConjuntos.map((r) => [r.conjunto, r]));
  const trilhas: ProgressoConjunto[] = [];
  for (const cod of trilhasDaMatriz(matriz, curso)) {
    const conj = matriz.conjuntos[cod];
    const r = por.get(cod);
    trilhas.push(
      r
        ? prog(r, true)
        : { conjunto: cod, nome: conj.nome, exigido: conj.ch, cumprido: 0, validado: false, ehTrilha: true },
    );
  }
  trilhas.sort((a, b) => b.cumprido - a.cumprido || a.nome.localeCompare(b.nome));

  // categorias de conjunto único variam por curso: a BSI tem 2º estrato e
  // humanidades, Eng. Comp. não tem nenhuma das duas
  const porId = new Map(
    curso.categorias.map((c) => [c.id, por.get(String(c.conjunto))] as const),
  );
  const rSegundo = porId.get("segundoEstrato");
  const rHumanidades = porId.get("humanidades");
  const resumoOptativas = perfil.resumoGeral?.optativas;
  const resumoAgregador = curso.agregadorTrilhas
    ? por.get(String(curso.agregadorTrilhas))
    : undefined;
  const cumpridoBlocoOptativo = cargaAprovadaBlocoOptativo(perfil, curso);

  // Grupos de escolha: cada um tem carga própria e é conferido no Resumo
  // Optativas do histórico. Sem histórico o cumprido é zero, mas a exigência
  // continua vindo da matriz.
  const grupos = (curso.gruposOpcao ?? []).map((g) => {
    const cod = String(g);
    const r = por.get(cod);
    const conj = matriz.conjuntos[cod];
    return r
      ? prog(r, false)
      : {
          conjunto: cod,
          nome: conj?.nome ?? cod,
          exigido: conj?.ch ?? 0,
          cumprido: 0,
          validado: false,
          ehTrilha: false,
        };
  });
  const validadoBlocoOptativo =
    curso.matriz === 844 ? resumoOptativas?.aprovada : undefined;
  return {
    obrigatorias: perfil.resumoGeral?.obrigatorias ?? null,
    segundoEstrato: rSegundo ? prog(rSegundo, false) : null,
    humanidades: rHumanidades ? prog(rHumanidades, false) : null,
    trilhas,
    trilhasValidadas: trilhas.filter((t) => t.validado).length,
    opcoes: grupos.length
      ? {
          exigido: grupos.reduce((a, g) => a + g.exigido, 0),
          cumprido: grupos.reduce((a, g) => a + g.cumprido, 0),
          gruposCumpridos: grupos.filter((g) => g.cumprido >= g.exigido).length,
          grupos: [...grupos].sort(
            (a, b) => b.cumprido / (b.exigido || 1) - a.cumprido / (a.exigido || 1) || a.nome.localeCompare(b.nome),
          ),
        }
      : null,
    blocoOptativo: curso.agregadorTrilhas
      ? {
          exigido:
            (curso.matriz === 844 ? resumoOptativas?.total : undefined) ??
            resumoAgregador?.chObrigatoria ??
            matriz.conjuntos[String(curso.agregadorTrilhas)]?.ch ??
            matriz.cargas.optativas,
          cumprido:
            cumpridoBlocoOptativo,
          ...(validadoBlocoOptativo !== undefined &&
          validadoBlocoOptativo !== cumpridoBlocoOptativo
            ? { validado: validadoBlocoOptativo }
            : {}),
        }
      : null,
    eletivas: perfil.eletivas
      ? {
          exigido: perfil.eletivas.chTotal,
          // o próprio histórico consolida o que falta; cumprido = total - faltante
          cumprido: perfil.eletivas.chTotal - perfil.eletivas.chFaltante,
        }
      : null,
    extensao: matriz.cargas.extensao > 0 && perfil.extensao
      ? { exigido: perfil.extensao.chTotal, cumprido: perfil.extensao.chCursada }
      : null,
    inconsistencias,
  };
}
