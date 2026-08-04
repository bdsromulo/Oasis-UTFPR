import { describe, it, expect } from "vitest";
import {
  montarUrlDeAvaliacao,
  coletaHabilitada,
  podeSerAvaliada,
  CAMPOS_FORMS,
  URL_BASE_FORMS,
} from "../src/domain/reviews/forms";
import type { DisciplinaCursada } from "../src/domain/tipos";

const alvo = { codigo: "DAINF31", nome: "Estruturas de Dados 1", semestre: "2025/2" };

function cursada(over: Partial<DisciplinaCursada>): DisciplinaCursada {
  return {
    codigo: "DAINF31",
    nome: "Estruturas de Dados 1",
    situacao: "aprovado",
    origem: "obrigatoria",
    ano: 2025,
    semestre: 2,
    ...over,
  } as DisciplinaCursada;
}

describe("podeSerAvaliada", () => {
  it("aceita disciplina aprovada com semestre conhecido", () => {
    expect(podeSerAvaliada(cursada({}))).toBe(true);
  });

  it("recusa reprovada", () => {
    expect(podeSerAvaliada(cursada({ situacao: "reprovado" }))).toBe(false);
  });

  it("recusa quem não chegou a cursar", () => {
    for (const situacao of ["dispensado", "consignado", "cancelado", "cursando"] as const) {
      expect(podeSerAvaliada(cursada({ situacao })), situacao).toBe(false);
    }
  });

  it("recusa sem ano ou semestre: o formulário precisa do período", () => {
    expect(podeSerAvaliada(cursada({ ano: null }))).toBe(false);
    expect(podeSerAvaliada(cursada({ semestre: null }))).toBe(false);
  });
});

describe("montarUrlDeAvaliacao", () => {
  it("preenche os cinco campos na URL", () => {
    const url = new URL(montarUrlDeAvaliacao(alvo, "Fulano de Tal", "Sicrano da Silva"));
    expect(url.searchParams.get(CAMPOS_FORMS.autor)).toBe("Fulano de Tal");
    expect(url.searchParams.get(CAMPOS_FORMS.codigo)).toBe("DAINF31");
    expect(url.searchParams.get(CAMPOS_FORMS.disciplina)).toBe("Estruturas de Dados 1");
    expect(url.searchParams.get(CAMPOS_FORMS.semestre)).toBe("2025/2");
    expect(url.searchParams.get(CAMPOS_FORMS.professor)).toBe("Sicrano da Silva");
  });

  it("marca o formulário como pré-preenchido", () => {
    const url = new URL(montarUrlDeAvaliacao(alvo, "Fulano", "Sicrano"));
    expect(url.searchParams.get("usp")).toBe("pp_url");
  });

  it("omite o professor quando não está no elenco", () => {
    const url = new URL(montarUrlDeAvaliacao(alvo, "Fulano", null));
    expect(url.searchParams.has(CAMPOS_FORMS.professor)).toBe(false);
  });

  it("escapa acento, barra e espaço", () => {
    const url = montarUrlDeAvaliacao(alvo, "Rômulo Silva", "João / Maria");
    expect(url).not.toContain("Rômulo Silva");
    expect(url).toContain("R%C3%B4mulo+Silva");
    expect(new URL(url).searchParams.get(CAMPOS_FORMS.professor)).toBe("João / Maria");
  });

  it("aponta para o formulário publicado", () => {
    expect(montarUrlDeAvaliacao(alvo, "Fulano", null).startsWith(URL_BASE_FORMS)).toBe(true);
  });

  /**
   * Os ids são opacos e quebram em silêncio: apagar e recriar uma pergunta no
   * Forms troca o id, o formulário segue abrindo e o campo chega vazio. Travar o
   * formato aqui não impede a troca, mas impede que ela passe por digitação certa.
   */
  it("mantém os cinco ids no formato do Forms", () => {
    for (const id of Object.values(CAMPOS_FORMS)) {
      expect(id).toMatch(/^entry\.\d+$/);
    }
    expect(new Set(Object.values(CAMPOS_FORMS)).size).toBe(5);
  });

  it("a coleta está habilitada enquanto houver formulário publicado", () => {
    expect(coletaHabilitada()).toBe(true);
  });
});
