import { describe, expect, it } from "vitest";
import { listarElegiveis, normNome } from "../src/domain/motor/elegiveis";
import { BSI, ENG_COMP, dadosDoCurso, semestresDoCurso } from "../src/domain/dadosCurso";

describe("dados por curso", () => {
  it("entrega matriz e ofertas do curso escolhido", () => {
    expect(dadosDoCurso("eng-comp").matriz.matriz).toBe(844);
    expect(dadosDoCurso("bsi-981").matriz.matriz).toBe(981);
    // curso desconhecido cai na BSI
    expect(dadosDoCurso("inexistente").matriz.matriz).toBe(981);
  });

  it("expõe só os semestres que cada curso tem", () => {
    expect(semestresDoCurso(ENG_COMP)).toEqual(["2026-1", "2025-2"]);
    expect(semestresDoCurso(BSI)).toContain("2026-2");
    // Eng. Comp. não tem prévia simulada
    expect(ENG_COMP.semestresPrevia).toHaveLength(0);
    expect(BSI.semestresPrevia).toContain("2026-2");
  });
});

describe("planejamento de Eng. Comp.", () => {
  const elegiveis = listarElegiveis(null as any, ENG_COMP.matriz, ENG_COMP.ofertas["2026-1"]) as any[];

  it("casa a disciplina da matriz com a turma aberta sob o código equivalente", () => {
    // A matriz identifica por CSD20 e o Portal abre a turma como ICSD20.
    const casos: [string, string][] = [
      ["CSD20", "ICSD20"],
      ["MA71A", "MAT7C1"],
      ["CSW30", "ELEW30"],
      ["EEB31", "ELEB30"],
    ];
    for (const [codigoMatriz, codigoOferta] of casos) {
      const e = elegiveis.find((x) => x.disciplina.codigo === codigoMatriz);
      expect(e, `${codigoMatriz} não listado`).toBeDefined();
      expect(e.oferta?.codigo, `${codigoMatriz} deveria puxar a turma de ${codigoOferta}`).toBe(codigoOferta);
      expect(e.oferta.turmas.length).toBeGreaterThan(0);
    }
  });

  it("prefere o equivalente de mesmo nome, não o primeiro da lista", () => {
    // EEQ31 lista [EL65D, ELB66, ELEQ30]; só ELEQ30 é Análise de Sistemas
    // Lineares. Pegar o primeiro com turma traria a disciplina errada.
    const e = elegiveis.find((x) => x.disciplina.codigo === "EEQ31");
    expect(e.oferta?.codigo).toBe("ELEQ30");
    expect(normNome(e.oferta.nome)).toBe(normNome(e.disciplina.nome));
  });

  it("usa as categorias do próprio curso, sem estrato nem humanidades", () => {
    const categorias = new Set(elegiveis.map((e) => e.categoria));
    expect(categorias.has("obrigatória")).toBe(true);
    expect([...categorias].some((c) => String(c).startsWith("Trilha Em"))).toBe(true);
    // essas são da BSI e não podem vazar
    expect(categorias.has("2º estrato")).toBe(false);
    expect(categorias.has("humanidades")).toBe(false);
  });

  it("não duplica a matéria que veio pelo equivalente", () => {
    // sem consumir o código do equivalente, cada uma dessas apareceria duas
    // vezes: uma pela matriz, sem turma, e outra pela oferta
    for (const codigoOferta of ["ICSD20", "MAT7C1", "ELEW30"]) {
      const linhas = elegiveis.filter(
        (e) => e.disciplina.codigo === codigoOferta || e.oferta?.codigo === codigoOferta,
      );
      expect(linhas.length, `${codigoOferta} aparece ${linhas.length}x`).toBe(1);
    }
  });
});

describe("regressão: a BSI não muda com a busca por equivalente", () => {
  it("mantém a mesma contagem de elegíveis e de ofertas casadas", () => {
    const el = listarElegiveis(null as any, BSI.matriz, BSI.ofertas["2026-1"]) as any[];
    expect(el).toHaveLength(162);
    expect(el.filter((e) => e.oferta)).toHaveLength(72);
  });

  it("nenhuma disciplina da BSI depende de equivalente para achar turma", () => {
    // medido: 0 casos. Se isso mudar, a busca por equivalente passa a alterar
    // o comportamento da BSI e o efeito precisa ser reavaliado.
    const codsOferta = new Set(BSI.ofertas["2026-1"].disciplinas.map((d) => d.codigo));
    const dependem = BSI.matriz.disciplinas.filter(
      (d) => !codsOferta.has(d.codigo) && (d.equivalentes ?? []).some((e) => codsOferta.has(e.codigo)),
    );
    expect(dependem).toHaveLength(0);
  });
});

describe("resumo do histórico de Eng. Comp.", () => {
  // Formatos reais observados nos dois históricos de Eng. Comp. disponíveis.
  // Sem dado pessoal: só as linhas de resumo, que são estrutura de curso.
  const linhaConjunto =
    /^(\d{3,4})\s+(?:\(\*\)\s+)?(.+?)\s+(\d{1,2})\s+(\d{1,2})\s+([\d,]+)\s+(\d+)\s+(\d+)\s+(Faltantes|\d+)(?:\s+(\d+))?$/;
  const linhaEletiva = /^Eletiva\s+(\d+)\s+\d{1,2}\s+\d{1,2}\s+(?:\d+\s+)?(\d+)\s+(\d+)\s+(\d+)$/;

  it("lê conjunto de 3 dígitos e período final de 2", () => {
    const m = "959 (*) Optativas 8 10 18 270 180 Faltantes 90".match(linhaConjunto);
    expect(m).not.toBeNull();
    expect(m![1]).toBe("959");
    expect(m![4]).toBe("10"); // período final
    expect(m![6]).toBe("270"); // CH obrigatória
  });

  it("continua lendo o formato da BSI, de 4 dígitos", () => {
    const m = "1159 Segundo Estrato 3 6 24 360 225 135 0".match(linhaConjunto);
    expect(m).not.toBeNull();
    expect(m![1]).toBe("1159");
    expect(m![9]).toBe("0");
  });

  it("tolera a última coluna ausente, que às vezes vai para outra linha", () => {
    const m = "966 Trilha Em Otim, Mod Analíticos E Simul 8 10 2 90 0 90".match(linhaConjunto);
    expect(m).not.toBeNull();
    expect(m![6]).toBe("90");
    expect(m![9]).toBeUndefined();
  });

  it("lê a linha de eletiva dos dois cursos, com e sem a coluna CHS", () => {
    const bsi = "Eletiva 105 4 8 4 195 0 105".match(linhaEletiva);
    expect(bsi).not.toBeNull();
    expect([bsi![1], bsi![2], bsi![3], bsi![4]]).toEqual(["105", "195", "0", "105"]);

    const eng = "Eletiva 90 8 10 30 60 30".match(linhaEletiva);
    expect(eng).not.toBeNull();
    expect([eng![1], eng![2], eng![3], eng![4]]).toEqual(["90", "30", "60", "30"]);
  });
});
