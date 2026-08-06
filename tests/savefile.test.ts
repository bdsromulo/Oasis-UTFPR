import { describe, expect, it } from "vitest";
import {
  criarSavefile,
  desserializarPerfil,
  lerSavefile,
} from "../src/domain/savefile";
import type { PerfilAluno } from "../src/domain/tipos";

const base = {
  preferencias: { curso: "bsi-981", matriz: "981", semestreAtivo: "2026-2" },
  cestasPorSemestre: { "2026-2": { A: [{ codDisciplina: "IF66H", codTurma: "S71" }] } },
  exclusoesPorSemestre: { "2026-2": { A: { disciplinas: [], professores: [] } } },
  gradeAtiva: "A",
  gradeParaSimulador: null,
  ritmoSimulador: 5,
  exclusoesSimulador: { disciplinas: [], professores: [] },
};

describe("savefile portátil", () => {
  it("serializa a aprovação do perfil e a restaura como Set", () => {
    const perfil = {
      nome: "Estudante Fictício",
      curso: "Sistemas de Informação",
      cursadas: [],
      aprovadas: new Set(["IF66H"]),
    } as unknown as PerfilAluno;
    const salvo = criarSavefile({ ...base, perfil });
    const lido = lerSavefile(JSON.stringify(salvo));
    const restaurado = desserializarPerfil(lido.dados.perfil);

    expect(lido.dados.cestasPorSemestre["2026-2"].A).toEqual([{ codDisciplina: "IF66H", codTurma: "S71" }]);
    expect(restaurado?.aprovadas).toEqual(new Set(["IF66H"]));
  });

  it("aceita exportar planejamento mesmo sem histórico", () => {
    const salvo = criarSavefile({ ...base, perfil: null });
    expect(lerSavefile(JSON.stringify(salvo)).dados.perfil).toBeNull();
  });

  it("rejeita arquivo que não é um savefile do Oásis", () => {
    expect(() => lerSavefile('{"formato":"outro"}')).toThrow("não é um savefile");
  });

  it("rejeita seleção de turma incompleta", () => {
    const salvo = criarSavefile({ ...base, perfil: null });
    salvo.dados.cestasPorSemestre = { "2026-2": { A: [{ codDisciplina: "IF66H" } as never] } };
    expect(() => lerSavefile(JSON.stringify(salvo))).toThrow("incompleto");
  });
});
