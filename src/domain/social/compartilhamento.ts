import type { PerfilAluno } from "../tipos";
import type { SelecaoTurma } from "../../ui/App";

export interface OasisSharePayload {
  v: number;
  nome: string;
  curso: string;
  periodo?: number;
  aprovadas: string[];
  selecao: { d: string; t: string }[];
}

/**
 * Serializa o perfil e a seleção de turmas em uma string Base64 compacta ("Oásis Code").
 */
export function codificarGradeParaShare(
  perfil: PerfilAluno | null,
  selecao: SelecaoTurma[],
  nomeAlternativo?: string,
): string {
  const payload: OasisSharePayload = {
    v: 1,
    nome: perfil ? perfil.nome.split(" ")[0] : (nomeAlternativo || "Estudante Oásis"),
    curso: perfil ? perfil.curso : "Sistemas de Informação",
    periodo: perfil?.periodo ?? undefined,
    aprovadas: perfil ? Array.from(perfil.aprovadas) : [],
    selecao: selecao.map((s) => ({ d: s.codDisciplina, t: s.codTurma })),
  };

  try {
    const jsonStr = JSON.stringify(payload);
    // Transforma em Base64 URL safe
    return btoa(encodeURIComponent(jsonStr))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  } catch {
    return "";
  }
}

/**
 * Decodifica o código/hash Oásis (ou URL completa) de volta para o payload.
 */
export function decodificarGradeDeShare(hashOuTexto: string): OasisSharePayload | null {
  if (!hashOuTexto || !hashOuTexto.trim()) return null;

  try {
    let limpo = hashOuTexto.trim();
    // Se colou a URL completa com ?match=...
    if (limpo.includes("match=")) {
      const match = limpo.match(/match=([^&]+)/);
      if (match && match[1]) {
        limpo = match[1];
      }
    }

    // Restaura caracteres de Base64 URL safe
    limpo = limpo.replace(/-/g, "+").replace(/_/g, "/");
    while (limpo.length % 4) {
      limpo += "=";
    }

    const jsonStr = decodeURIComponent(atob(limpo));
    const payload = JSON.parse(jsonStr) as OasisSharePayload;

    if (payload.v !== 1 || !Array.isArray(payload.selecao)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
