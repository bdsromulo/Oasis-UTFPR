// Validador de ingestão das avaliações (Estrategia.md §6.6).
// A regra é a mesma dos parsers de `tools/`: 0 erros ou nada é publicado.
import { describe, it, expect } from "vitest";
import { parseCsv, validarEConverter } from "../scripts/ingerir-reviews";
import { construirRoster } from "../src/domain/reviews/professores";
import { CURSOS } from "../src/domain/dadosCurso";
import { LIMITE_COMENTARIO } from "../src/domain/reviews/tipos";

// uma unidade docente e uma disciplina que existem de verdade nas ofertas
const roster = construirRoster(CURSOS);
const DOCENTE = roster.unidades.find((u) => u.disciplinas.length > 0)!;
const CODIGO = DOCENTE.disciplinas[0];

const CABECALHO = [
  "carimbo", "autor", "codigo", "semestre", "situacao", "turma", "professorId",
  "geral", "didatica", "dificuldade", "cargaTrabalho", "avaliacao", "tags", "comentario",
];

function linha(over: Record<string, string> = {}): string[] {
  const base: Record<string, string> = {
    carimbo: "2026-08-02T10:00:00Z",
    autor: "Alguem Ficticio",
    codigo: CODIGO,
    semestre: "2025/2",
    situacao: "aprovado",
    turma: "S71",
    professorId: DOCENTE.id,
    geral: "4",
    didatica: "5",
    dificuldade: "3",
    cargaTrabalho: "2",
    avaliacao: "provas",
    tags: "corrige-rapido|acessivel",
    comentario: "Aula boa.",
    ...over,
  };
  return CABECALHO.map((c) => base[c] ?? "");
}

const tabela = (...linhas: string[][]) => [CABECALHO, ...linhas];

describe("parser de CSV", () => {
  it("preserva vírgula, aspas e quebra de linha dentro do campo citado", () => {
    // é o caso do comentário livre: um split(",") corromperia a linha em silêncio
    const csv = 'a,b,c\n1,"tem, vírgula","diz ""oi""\ne quebra"\n';
    expect(parseCsv(csv)).toEqual([
      ["a", "b", "c"],
      ["1", "tem, vírgula", 'diz "oi"\ne quebra'],
    ]);
  });

  it("descarta linhas totalmente vazias", () => {
    expect(parseCsv("a,b\n1,2\n\n,\n").length).toBe(2);
  });
});

describe("ingestão: caminho feliz", () => {
  it("converte uma linha válida", () => {
    const r = validarEConverter(tabela(linha()));
    expect(r.erros).toEqual([]);
    expect(r.reviews.length).toBe(1);
    expect(r.reviews[0]).toMatchObject({
      professorId: DOCENTE.id,
      codigo: CODIGO,
      semestre: "2025/2",
      geral: 4,
      tags: ["corrige-rapido", "acessivel"],
    });
  });

  it("o id é estável entre execuções", () => {
    const a = validarEConverter(tabela(linha())).reviews[0].id;
    const b = validarEConverter(tabela(linha())).reviews[0].id;
    expect(a).toBe(b);
  });

  it("a ordem é determinística, para o Action não commitar ruído", () => {
    const l1 = linha({ autor: "Aaa Bbb" });
    const l2 = linha({ autor: "Zzz Yyy" });
    const direta = validarEConverter(tabela(l1, l2)).reviews.map((r) => r.id);
    const invertida = validarEConverter(tabela(l2, l1)).reviews.map((r) => r.id);
    expect(direta).toEqual(invertida);
  });
});

describe("ingestão: coerência com o dado oficial", () => {
  it("recusa código que não existe em matriz nem oferta", () => {
    const r = validarEConverter(tabela(linha({ codigo: "XXX999" })));
    expect(r.reviews).toEqual([]);
    expect(r.erros.join(" ")).toMatch(/não existe em nenhuma matriz ou oferta/);
  });

  it("recusa professorId fora do roster", () => {
    const r = validarEConverter(tabela(linha({ professorId: "fulano-inexistente" })));
    expect(r.erros.join(" ")).toMatch(/não está no roster/);
  });

  it("linha sem professorId é pendente de roster: não publica e não é erro", () => {
    const r = validarEConverter(tabela(linha({ professorId: "" })));
    expect(r.erros).toEqual([]);
    expect(r.reviews).toEqual([]);
    expect(r.ignoradas).toBe(1);
  });
});

describe("ingestão: forma e vocabulário", () => {
  it.each([
    ["semestre", { semestre: "2025-2" }, /fora de AAAA\/S/],
    ["situação", { situacao: "trancado" }, /situação .* inválida/],
    ["nota", { geral: "9" }, /geral .* fora de 1–5/],
    ["nota não inteira", { didatica: "4,5" }, /didatica .* fora de 1–5/],
    ["sistema avaliativo", { avaliacao: "oral" }, /sistema avaliativo .* inválido/],
    ["tag", { tags: "gente-boa" }, /tag desconhecida/],
    ["autor vazio", { autor: "" }, /autor vazio/],
  ])("recusa %s inválido", (_rotulo, over, padrao) => {
    const r = validarEConverter(tabela(linha(over as Record<string, string>)));
    expect(r.reviews).toEqual([]);
    expect(r.erros.join(" ")).toMatch(padrao as RegExp);
  });

  it("recusa comentário acima do limite", () => {
    const r = validarEConverter(tabela(linha({ comentario: "x".repeat(LIMITE_COMENTARIO + 1) })));
    expect(r.erros.join(" ")).toMatch(/máximo/);
  });

  it.each([
    ["RA", "meu ra e 1234567 se precisar"],
    ["e-mail", "escreve pra teste@exemplo.com"],
    ["telefone", "meu zap (41) 99999-8888"],
  ])("recusa %s no comentário", (rotulo, comentario) => {
    const r = validarEConverter(tabela(linha({ comentario })));
    expect(r.reviews).toEqual([]);
    expect(r.erros.join(" ")).toContain(rotulo);
  });
});

describe("ingestão: proteção da fronteira", () => {
  it("recusa o CSV inteiro se colunas privadas vazarem na projeção", () => {
    for (const privada of ["ra", "identidade"]) {
      const r = validarEConverter([[...CABECALHO, privada], [...linha(), "valor"]]);
      expect(r.reviews).toEqual([]);
      expect(r.erros.join(" ")).toMatch(/Coluna privada .* presente no CSV público/);
    }
  });

  it("recusa CSV sem coluna obrigatória", () => {
    const semCodigo = CABECALHO.filter((c) => c !== "codigo");
    const r = validarEConverter([semCodigo, semCodigo.map(() => "x")]);
    expect(r.erros.join(" ")).toMatch(/Coluna obrigatória ausente/);
  });

  it("CSV vazio não quebra", () => {
    expect(validarEConverter([]).erros.length).toBeGreaterThan(0);
  });
});
