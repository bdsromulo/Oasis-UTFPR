import { describe, expect, it } from "vitest";
import turmas20252 from "../data/turmas/2025-2.json";
import { itensDaSelecao, relatorioTexto } from "../src/domain/motor/grade";
import type { OfertaSemestre } from "../src/domain/tipos";

const oferta = turmas20252 as unknown as OfertaSemestre;

describe("relatorioTexto", () => {
  it("gera a lista concisa de disciplina e turma no formato do Grade na Hora", () => {
    const itens = itensDaSelecao(oferta, [
      { codDisciplina: "FCH7HC", codTurma: "S01" },
      { codDisciplina: "ICSB41", codTurma: "S73" },
    ]);

    expect(relatorioTexto(itens)).toBe("FCH7HC — S01\nICSB41 — S73");
  });
});
