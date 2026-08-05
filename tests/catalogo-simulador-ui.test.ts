import { describe, expect, it } from "vitest";
import matriz978Json from "../data/eng-controle/matriz-978.json";
import type { Matriz, SelecaoTurma } from "../src/domain/tipos";
import { rotulosClassificacaoCatalogo } from "../src/ui/telas/Catalogo";
import { listarGradesDoPlanejamento } from "../src/ui/telas/TelaSimuladorFormatura";

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
