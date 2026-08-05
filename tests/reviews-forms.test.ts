import { describe, it, expect } from "vitest";
import {
  montarUrlDeAvaliacao,
  coletaHabilitada,
  podeSerAvaliada,
  CAMPOS_FORMS,
  URL_BASE_FORMS,
} from "../src/domain/reviews/forms";
import type { DisciplinaCursada } from "../src/domain/tipos";
import { criarAlvoAvaliacao } from "../src/domain/reviews/alvos";
import { CURSOS, ENG_COMP } from "../src/domain/dadosCurso";
import { criarMapaIdentidade } from "../src/domain/motor/identidade";

const alvo = {
  codigo: "DAINF31",
  codigoCanonico: "DAINF31",
  nome: "Estruturas de Dados 1",
  semestre: "2025/2",
};

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

  it("aceita consignação, que representa disciplina equivalente cursada", () => {
    expect(podeSerAvaliada(cursada({ situacao: "consignado" }))).toBe(true);
  });

  it("recusa quem não concluiu uma disciplina com professor", () => {
    for (const situacao of ["dispensado", "cancelado", "cursando"] as const) {
      expect(podeSerAvaliada(cursada({ situacao })), situacao).toBe(false);
    }
  });

  it("recusa sem ano ou semestre: o formulário precisa do período", () => {
    expect(podeSerAvaliada(cursada({ ano: null }))).toBe(false);
    expect(podeSerAvaliada(cursada({ semestre: null }))).toBe(false);
  });

  // Não são aula com professor: o ENADE é prova externa, o estágio acontece na
  // empresa e as atividades complementares são saldo de horas de eventos e
  // projetos variados. As quatro verticais não teriam sobre o que responder.
  it("recusa o ENADE, pelo código", () => {
    expect(podeSerAvaliada(cursada({ codigo: "ENADEI", nome: "Enade Ingressante" }))).toBe(false);
    expect(podeSerAvaliada(cursada({ codigo: "ENADEC", nome: "Enade Concluinte" }))).toBe(false);
  });

  it("recusa atividades complementares em qualquer matriz", () => {
    // o código muda por matriz; o nome não
    for (const [codigo, nome] of [
      ["CSX50", "Atividades Complementares"],
      ["ICSX50", "Atividades Complementares Complementares"],
      ["CSX53", "Atividades Complementares Complementares"],
      ["ICSXG3", "Atividades Complementares"],
      ["ELS03", "Atividades Complementares"],
    ]) {
      expect(podeSerAvaliada(cursada({ codigo, nome })), codigo).toBe(false);
    }
  });

  it("recusa estágio, pelo nome e pelo código do curso", () => {
    expect(podeSerAvaliada(cursada({ codigo: "CSX51", nome: "Estágio 1" }))).toBe(false);
    expect(podeSerAvaliada(cursada({ codigo: "ICSXG2", nome: "Estágio Supervisionado" }))).toBe(false);
    expect(podeSerAvaliada(cursada({ codigo: "ELS02", nome: "Estágio Curricular Obrigatório" }))).toBe(false);
    // e mesmo que a fonte abrevie o nome, o código do curso ainda barra
    expect(podeSerAvaliada(cursada({ codigo: "CSX54", nome: "Sup." }), ["CSX54"])).toBe(false);
  });

  it("continua aceitando disciplina comum", () => {
    expect(podeSerAvaliada(cursada({ codigo: "CSF13", nome: "Fundamentos De Programação 1" }))).toBe(true);
  });
});

describe("alvo de avaliação", () => {
  it("usa o código original da consignação sem perder o cruzamento com a matriz", () => {
    const alvoConsignado = criarAlvoAvaliacao(
      cursada({
        codigo: "CSA30",
        codigoOriginal: "ICSA30",
        situacao: "consignado",
        professores: ["Docente Fictício"],
      }),
      ENG_COMP.matriz,
      CURSOS,
    );

    expect(alvoConsignado).toMatchObject({
      codigo: "ICSA30",
      codigoCanonico: "CSA30",
      professoresHistorico: ["Docente Fictício"],
    });
    expect(alvoConsignado?.nome).not.toBe("ICSA30");
    expect(criarMapaIdentidade(ENG_COMP.matriz).resolver(alvoConsignado!.codigo)).toBe(
      alvoConsignado!.codigoCanonico,
    );
  });

  it("recupera de uma oferta o nome de eletiva que não pertence à matriz", () => {
    const alvoEletiva = criarAlvoAvaliacao(
      cursada({ codigo: "GE70L", origem: "eletiva" }),
      ENG_COMP.matriz,
      CURSOS,
    );
    expect(alvoEletiva?.nome).toBe("Gestão Da Produção");
  });

  it("exclui atividades complementares depois de resolver o nome pela matriz", () => {
    const atividades = criarAlvoAvaliacao(
      cursada({ codigo: "CSX53", nome: "" }),
      ENG_COMP.matriz,
      CURSOS,
    );
    expect(atividades).toBeNull();
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
