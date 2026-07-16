// Painel de situação do aluno: combina o PerfilAluno (histórico) com a matriz.
// Os números por conjunto vêm do próprio histórico (fonte oficial consolidada);
// a matriz entra para nomear, ordenar e detectar inconsistências.
import type { Matriz, PerfilAluno, ResumoConjunto } from "../tipos";

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
  eletivas: { exigido: number; cumprido: number } | null;
  extensao: { exigido: number; cumprido: number } | null;
  inconsistencias: string[];
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
  const por = new Map(perfil.resumoConjuntos.map((r) => [r.conjunto, r]));
  const trilhas: ProgressoConjunto[] = [];
  for (const [cod, conj] of Object.entries(matriz.conjuntos)) {
    if (cod === "1159" || cod === "1160" || cod === "1161") continue;
    const r = por.get(cod);
    trilhas.push(
      r
        ? prog(r, true)
        : { conjunto: cod, nome: conj.nome, exigido: conj.ch, cumprido: 0, validado: false, ehTrilha: true },
    );
  }
  trilhas.sort((a, b) => b.cumprido - a.cumprido || a.nome.localeCompare(b.nome));

  const r1159 = por.get("1159");
  const r1161 = por.get("1161");
  return {
    obrigatorias: perfil.resumoGeral?.obrigatorias ?? null,
    segundoEstrato: r1159 ? prog(r1159, false) : null,
    humanidades: r1161 ? prog(r1161, false) : null,
    trilhas,
    trilhasValidadas: trilhas.filter((t) => t.validado).length,
    eletivas: perfil.eletivas
      ? {
          exigido: perfil.eletivas.chTotal,
          // o próprio histórico consolida o que falta; cumprido = total - faltante
          cumprido: perfil.eletivas.chTotal - perfil.eletivas.chFaltante,
        }
      : null,
    extensao: perfil.extensao
      ? { exigido: perfil.extensao.chTotal, cumprido: perfil.extensao.chCursada }
      : null,
    inconsistencias,
  };
}
