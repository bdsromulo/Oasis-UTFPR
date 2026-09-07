import { describe, expect, it } from "vitest";
import matriz978Json from "../data/eng-controle/matriz-978.json";
import type { Matriz, SelecaoTurma } from "../src/domain/tipos";
import { rotulosClassificacaoCatalogo } from "../src/ui/telas/Catalogo";
import { listarGradesDoPlanejamento } from "../src/ui/telas/TelaSimuladorFormatura";
import {
  fixarNoSemestre,
  MODELAGEM_VAZIA,
  totalModelagem,
} from "../src/ui/telas/ControlesSimulador";

const matriz978 = matriz978Json as unknown as Matriz;

describe("classificação curricular no Catálogo", () => {
  it("separa a categoria da trilha de Humanas na matriz 978", () => {
    const disciplina = matriz978.disciplinas.find((d) => d.codigo === "FCH7FA")!;

    expect(rotulosClassificacaoCatalogo(matriz978, disciplina, "opcoes")).toEqual({
      categoria: "Opção curricular",
      trilha: "Trilha De Ciências Hum Ling Letras Artes",
    });
  });

  it("sobe da subárea até a Trilha de Formação Complementar", () => {
    const disciplina = matriz978.disciplinas.find((d) => d.conjunto === 1147)!;

    expect(rotulosClassificacaoCatalogo(matriz978, disciplina, "opcoes")).toEqual({
      categoria: "Opção curricular",
      trilha: "Trilha De Formação Complementar",
    });
  });

  it("não inventa trilha para disciplina obrigatória", () => {
    const disciplina = matriz978.disciplinas.find((d) => d.codigo === "ELT71A")!;

    expect(rotulosClassificacaoCatalogo(matriz978, disciplina, "obrigatorias")).toEqual({
      categoria: "Obrigatória",
      trilha: null,
    });
  });
});

describe("grade pronta do Planejamento no Simulador", () => {
  it("oferece somente cenários preenchidos e preserva a ordem A/B/C", () => {
    const turma: SelecaoTurma = { codDisciplina: "ELT71A", codTurma: "S01" };
    const cestas = {
      "2026-2": { C: [turma, turma], B: [], A: [turma] },
    };

    expect(listarGradesDoPlanejamento(cestas)).toEqual([
      { semestre: "2026-2", grade: "A", quantidade: 1 },
      { semestre: "2026-2", grade: "C", quantidade: 2 },
    ]);
  });
});

/**
 * TASK-50 — semântica de mover disciplina entre semestres.
 *
 * É o que as setas, o X e o arrasto por toque acionam. A invariante que importa:
 * uma disciplina nunca pode ficar presa a dois semestres ao mesmo tempo — o
 * motor leria só um deles e o outro viraria um pedido fantasma no painel.
 */
describe("fixarNoSemestre", () => {
  it("prende a disciplina ao semestre pedido", () => {
    const v = fixarNoSemestre(MODELAGEM_VAZIA, "IF61C", "2027-1");
    expect(v.fixacoesPorSemestre).toEqual({ "2027-1": ["IF61C"] });
  });

  it("mover de novo não deixa a disciplina presa em dois semestres", () => {
    let v = fixarNoSemestre(MODELAGEM_VAZIA, "IF61C", "2027-1");
    v = fixarNoSemestre(v, "IF61C", "2027-2");
    expect(v.fixacoesPorSemestre).toEqual({ "2027-2": ["IF61C"] });
  });

  it("não mexe nas fixações das outras disciplinas", () => {
    let v = fixarNoSemestre(MODELAGEM_VAZIA, "IF61C", "2027-1");
    v = fixarNoSemestre(v, "IF62C", "2027-1");
    v = fixarNoSemestre(v, "IF61C", "2028-1");
    expect(v.fixacoesPorSemestre["2027-1"]).toEqual(["IF62C"]);
    expect(v.fixacoesPorSemestre["2028-1"]).toEqual(["IF61C"]);
  });

  it("semestre destino nulo apenas solta a disciplina", () => {
    let v = fixarNoSemestre(MODELAGEM_VAZIA, "IF61C", "2027-1");
    v = fixarNoSemestre(v, "IF61C", null);
    expect(v.fixacoesPorSemestre).toEqual({});
  });

  it("semestre que ficou vazio não sobra como chave morta", () => {
    let v = fixarNoSemestre(MODELAGEM_VAZIA, "IF61C", "2027-1");
    v = fixarNoSemestre(v, "IF61C", "2027-2");
    expect(Object.keys(v.fixacoesPorSemestre)).toEqual(["2027-2"]);
  });

  it("preserva as demais alavancas da modelagem", () => {
    const base = { ...MODELAGEM_VAZIA, trilhasAlvo: ["1162"], disciplinasFixadas: ["IF99Z"] };
    const v = fixarNoSemestre(base, "IF61C", "2027-1");
    expect(v.trilhasAlvo).toEqual(["1162"]);
    expect(v.disciplinasFixadas).toEqual(["IF99Z"]);
  });

  it("cada fixação conta no total de ajustes do painel avançado", () => {
    let v = fixarNoSemestre(MODELAGEM_VAZIA, "IF61C", "2027-1");
    expect(totalModelagem(v)).toBe(1);
    v = fixarNoSemestre(v, "IF62C", "2027-2");
    expect(totalModelagem(v)).toBe(2);
    // mover a mesma disciplina não inventa um segundo ajuste
    v = fixarNoSemestre(v, "IF62C", "2028-1");
    expect(totalModelagem(v)).toBe(2);
  });
});
