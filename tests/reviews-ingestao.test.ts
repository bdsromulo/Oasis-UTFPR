// Validador de ingestão das avaliações (Estrategia.md §6.6).
// A regra é a mesma dos parsers de `tools/`: 0 erros ou nada é publicado.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  parseCsv,
  validarEConverter,
  resolverSistemaAvaliativo,
  resolverProfessor,
  epocaDoCarimbo,
  COLUNAS_OBRIGATORIAS,
} from "../scripts/ingerir-reviews";
import { construirRoster } from "../src/domain/reviews/professores";
import { CURSOS } from "../src/domain/dadosCurso";
import { LIMITE_COMENTARIO } from "../src/domain/reviews/tipos";

// uma unidade docente e uma disciplina que existem de verdade nas ofertas
const roster = construirRoster(CURSOS);
const DOCENTE = roster.unidades.find((u) => u.disciplinas.length > 0)!;
const CODIGO = DOCENTE.disciplinas[0];

const CABECALHO = [
  "carimbo", "autor", "codigo", "semestre", "turma", "professor",
  "personalidade", "didatica", "dificuldade", "cargaTrabalho", "avaliacao", "comentario",
];

function linha(over: Record<string, string> = {}): string[] {
  const base: Record<string, string> = {
    carimbo: "2026-08-02T10:00:00Z",
    autor: "Alguem Ficticio",
    codigo: CODIGO,
    semestre: "2025/2",
    turma: "S71",
    professor: DOCENTE.nome,
    personalidade: "4",
    didatica: "5",
    dificuldade: "3",
    cargaTrabalho: "2",
    avaliacao: "Provas",
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
      personalidade: 4,
      avaliacao: "provas",
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

  it("professor fora do roster fica pendente: não publica e não é erro", () => {
    const r = validarEConverter(tabela(linha({ professor: "Ninguem Dos Santos" })));
    expect(r.erros).toEqual([]);
    expect(r.reviews).toEqual([]);
    // nomeada, não só contada: quem lê o log da execução precisa saber QUEM ficou
    expect(r.pendentes).toEqual([`${CODIGO} | Ninguem Dos Santos`]);
    expect(r.ignoradas).toBe(0);
  });

  it("linha sem professor é pendente de roster: não publica e não é erro", () => {
    const r = validarEConverter(tabela(linha({ professor: "" })));
    expect(r.erros).toEqual([]);
    expect(r.reviews).toEqual([]);
    expect(r.pendentes).toEqual([`${CODIGO} | `]);
  });
});

describe("ingestão: forma e vocabulário", () => {
  it.each([
    ["semestre", { semestre: "2025-2" }, /fora de AAAA\/S/],
    ["nota", { personalidade: "9" }, /personalidade .* fora de 1–5/],
    ["nota não inteira", { didatica: "4,5" }, /didatica .* fora de 1–5/],
    ["sistema avaliativo", { avaliacao: "Oral" }, /sistema avaliativo .* inválido/],
    ["autor vazio", { autor: "" }, /autor vazio/],
    // O CSV publicado em produção grava DD/MM/AAAA HH:MM:SS (locale pt-BR da
    // planilha), então esse formato precisa ser aceito — só o irreconhecível recusa.
    ["carimbo em formato não reconhecido", { carimbo: "carimbo qualquer" }, /carimbo .* não reconhecido/],
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

  // Trava o contrato citado em §4.2 do desenho da coleta (docs/superpowers/specs/
  // 2026-08-04-reviews-forms-design.md). Uma mudança aqui sem atualizar o
  // documento reconstrói a aba Homologado com o cabeçalho errado, e a ingestão
  // só descobre isso em produção — "coluna obrigatória ausente".
  it("cabeçalho obrigatório bate com o documentado para a aba Homologado", () => {
    expect(COLUNAS_OBRIGATORIAS).toEqual([
      "carimbo", "autor", "codigo", "semestre", "professor",
      "personalidade", "didatica", "dificuldade", "cargaTrabalho", "avaliacao", "comentario",
    ]);
  });
});

describe("tradução do formulário para o domínio", () => {
  it("aceita os três rótulos do formulário", () => {
    expect(resolverSistemaAvaliativo("Provas")).toBe("provas");
    expect(resolverSistemaAvaliativo("Trabalhos")).toBe("trabalhos");
    expect(resolverSistemaAvaliativo("Provas e trabalhos")).toBe("misto");
  });

  it("é indiferente a caixa e a espaço nas pontas", () => {
    expect(resolverSistemaAvaliativo("  provas E TRABALHOS ")).toBe("misto");
  });

  it("recusa rótulo desconhecido", () => {
    expect(resolverSistemaAvaliativo("Seminários")).toBe(null);
  });

  it("resolve um nome do elenco ao id da unidade", () => {
    expect(resolverProfessor(DOCENTE.nome, roster)).toBe(DOCENTE.id);
  });

  it("resolve dupla escrita com barra, em qualquer ordem", () => {
    const dupla = roster.unidades.find((u) => u.nomes.length === 2);
    if (!dupla) return;
    expect(resolverProfessor(dupla.nomes.join(" / "), roster)).toBe(dupla.id);
    expect(resolverProfessor([...dupla.nomes].reverse().join(" / "), roster)).toBe(dupla.id);
  });

  it("devolve null para quem não está no roster", () => {
    expect(resolverProfessor("Ninguem Dos Santos", roster)).toBe(null);
  });
});

describe("uma avaliação por pessoa e disciplina", () => {
  it("mantém só a mais recente quando a mesma pessoa reenvia", () => {
    const antiga = linha({ carimbo: "2026-08-01T10:00:00Z", didatica: "2" });
    const nova = linha({ carimbo: "2026-08-04T10:00:00Z", didatica: "5" });
    const r = validarEConverter(tabela(antiga, nova));
    expect(r.erros).toEqual([]);
    expect(r.reviews.length).toBe(1);
    expect(r.reviews[0].didatica).toBe(5);
  });

  it("o descarte independe da ordem das linhas na planilha", () => {
    const antiga = linha({ carimbo: "2026-08-01T10:00:00Z", didatica: "2" });
    const nova = linha({ carimbo: "2026-08-04T10:00:00Z", didatica: "5" });
    const direta = validarEConverter(tabela(antiga, nova)).reviews;
    const invertida = validarEConverter(tabela(nova, antiga)).reviews;
    expect(direta.map((x) => x.didatica)).toEqual([5]);
    expect(invertida.map((x) => x.didatica)).toEqual([5]);
  });

  // O CSV publicado em produção grava DD/MM/AAAA HH:MM:SS, não ISO-8601 — o
  // desempate de recência precisa entender esse formato corretamente.
  it("compara recência corretamente no formato DD/MM/AAAA HH:MM:SS do Sheets", () => {
    const antiga = linha({ carimbo: "01/08/2026 10:00:00", didatica: "2" });
    const nova = linha({ carimbo: "04/08/2026 10:00:00", didatica: "5" });
    const r = validarEConverter(tabela(antiga, nova));
    expect(r.reviews.length).toBe(1);
    expect(r.reviews[0].didatica).toBe(5);
  });

  it("compara recência corretamente entre um carimbo ISO e um pt-BR", () => {
    const antiga = linha({ carimbo: "2026-01-05T10:00:00Z", didatica: "2" });
    const nova = linha({ carimbo: "04/08/2026 10:00:00", didatica: "5" });
    const r = validarEConverter(tabela(antiga, nova));
    expect(r.reviews.length).toBe(1);
    expect(r.reviews[0].didatica).toBe(5);
  });

  it("não descarta avaliações de pessoas diferentes sobre a mesma disciplina", () => {
    const r = validarEConverter(
      tabela(linha({ autor: "Alguem Ficticio" }), linha({ autor: "Outra Pessoa Ficticia" })),
    );
    expect(r.reviews.length).toBe(2);
  });

  it("não descarta avaliações da mesma pessoa sobre disciplinas diferentes", () => {
    const outro = DOCENTE.disciplinas[1];
    if (!outro) return;
    const r = validarEConverter(tabela(linha(), linha({ codigo: outro })));
    expect(r.reviews.length).toBe(2);
  });
});

describe("epocaDoCarimbo", () => {
  // Os dois formatos com os mesmos componentes de data/hora produzem o mesmo
  // valor comparável — a função não conhece o fuso da planilha, só ordena
  // consistentemente os carimbos de uma mesma execução (todos vêm da mesma
  // fonte, então o desvio de fuso, se houver, é igual para todas as linhas).
  it("reconhece ISO-8601 e DD/MM/AAAA HH:MM:SS com os mesmos componentes", () => {
    expect(epocaDoCarimbo("2026-08-04T16:39:08Z")).toBe(epocaDoCarimbo("04/08/2026 16:39:08"));
  });

  it("devolve null para formato desconhecido", () => {
    expect(epocaDoCarimbo("4 de agosto de 2026")).toBe(null);
    expect(epocaDoCarimbo("")).toBe(null);
  });
});

// A oferta de Mecatrônica não vem no bundle inicial: `dadosCurso` a preenche com
// um placeholder vazio e só a carrega sob demanda. A ingestão montava o roster
// sem esperar por esse carregamento e ficava com o elenco parcial — e, como
// professor fora do roster não é erro e sim a rota "Professor Não Ofertado",
// toda avaliação de Mecatrônica era retida em silêncio, diluída num contador.
// Foi assim que uma avaliação de MEC77A com o Marcelo Maldaner, docente que a
// UI oferecia normalmente, não chegou ao acervo.
//
// O teste roda em processo separado de propósito: `carregarOfertasHistoricas-
// Mecatronica` muta os objetos de curso do módulo, então qualquer outro teste
// que o chamasse antes deixaria este passar mesmo com o script quebrado.
describe("roster completo: ofertas carregadas sob demanda", () => {
  it("a ingestão publica avaliação de Mecatrônica sem carregamento prévio", () => {
    const script = fileURLToPath(new URL("../scripts/ingerir-reviews.ts", import.meta.url));
    const fonte = readFileSync(script, "utf-8");

    // o roster do script precisa nascer completo, sem depender de quem o chama
    expect(fonte).toContain("await carregarOfertasHistoricasMecatronica()");
  });

  it("o elenco de Mecatrônica entra no roster depois do carregamento", async () => {
    const { carregarOfertasHistoricasMecatronica } = await import("../src/domain/dadosCurso");
    await carregarOfertasHistoricasMecatronica();
    const completo = construirRoster(CURSOS);

    expect(completo.elencoDaDisciplina("MEC77A").length).toBeGreaterThan(0);
    expect(resolverProfessor("Marcelo Maldaner", completo)).toBe("marcelo-maldaner");
  });
});
