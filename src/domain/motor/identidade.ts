import type { DisciplinaMatriz, Matriz } from "../tipos";

/** Mapa de equivalência canônica entre códigos. */
export interface MapaIdentidade {
  /** Dado um código (de oferta, histórico ou matriz), retorna o código canônico da matriz. */
  resolver(codigo: string): string;
  /** Dado um código canônico, retorna todos os códigos equivalentes conhecidos. */
  equivalentesDe(codigoCanonicoMatriz: string): string[];
  /** Testa se dois códigos se referem à mesma exigência curricular. */
  mesmaExigencia(a: string, b: string): boolean;
  /** Tenta encontrar o código canônico pelo nome normalizado. */
  resolverPorNome(nome: string): string | undefined;
}

export function normNome(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Constrói o mapa a partir da matriz (que já contém o campo `equivalentes`). */
export function criarMapaIdentidade(matriz: Matriz): MapaIdentidade {
  // codigo real -> codigo canônico
  const resolucoes = new Map<string, string>();
  // codigo canônico -> lista de códigos reais equivalentes (inclui o próprio canônico)
  const equivalentes = new Map<string, Set<string>>();
  // nome normalizado -> código canônico
  const nomeParaCodigo = new Map<string, string>();

  // Primeiro passo: popula o canônico e seus nomes
  for (const d of matriz.disciplinas) {
    resolucoes.set(d.codigo, d.codigo);
    nomeParaCodigo.set(normNome(d.nome), d.codigo);
    
    if (!equivalentes.has(d.codigo)) {
      equivalentes.set(d.codigo, new Set([d.codigo]));
    }
  }

  // Segundo passo: mapeia os equivalentes declarados na matriz
  for (const d of matriz.disciplinas) {
    for (const eq of d.equivalentes) {
      resolucoes.set(eq.codigo, d.codigo);
      equivalentes.get(d.codigo)!.add(eq.codigo);
    }
  }

  return {
    resolver: (codigo: string) => {
      // 1. Resolve direto pelo código (seja matriz ou equivalente declarado)
      if (resolucoes.has(codigo)) {
        return resolucoes.get(codigo)!;
      }
      // Se não encontrou, assume que o próprio código é canônico (caso de disciplinas soltas fora da grade)
      return codigo;
    },
    equivalentesDe: (codigoCanonico: string) => {
      const eqs = equivalentes.get(codigoCanonico);
      return eqs ? Array.from(eqs) : [codigoCanonico];
    },
    mesmaExigencia: (a: string, b: string) => {
      // Resolve ambos para o canônico e compara
      // Nota: não conseguimos resolver por nome aqui porque só temos os códigos 'a' e 'b'.
      // Mas o mapa 'resolucoes' já tem os equivalentes declarados mapeados para o canônico.
      return resolucoes.get(a) === resolucoes.get(b) && resolucoes.has(a);
    },
    resolverPorNome: (nome: string) => {
      return nomeParaCodigo.get(normNome(nome));
    }
  };
}

/**
 * Encontra a disciplina da matriz à qual um código de oferta pertence.
 *
 * O Portal frequentemente abre a turma sob um equivalente (por exemplo,
 * ELEC20 para EEC21 na matriz 844). O código da oferta continua necessário
 * para a matrícula, mas categoria, carga e nome curricular precisam vir da
 * disciplina canônica. O nome fica apenas como fallback para ofertas sem uma
 * equivalência declarada.
 */
export function disciplinaCanonicaDaOferta(
  matriz: Matriz,
  codigoOferta: string,
  nomeOferta?: string | null,
): DisciplinaMatriz | undefined {
  const mapa = criarMapaIdentidade(matriz);
  const codigoCanonico = mapa.resolver(codigoOferta);
  const porCodigo = matriz.disciplinas.find((d) => d.codigo === codigoCanonico);
  if (porCodigo) return porCodigo;

  if (!nomeOferta) return undefined;
  const nomeNormalizado = normNome(nomeOferta);
  return matriz.disciplinas.find((d) => normNome(d.nome) === nomeNormalizado);
}
