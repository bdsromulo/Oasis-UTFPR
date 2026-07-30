import { describe, expect, it } from "vitest";
import matrizJson from "../data/eng-comp/matriz-844.json";
import ofertaJson from "../data/eng-comp/turmas/2026-2.json";
import { listarElegiveis } from "../src/domain/motor/elegiveis";
import { itensDaSelecao } from "../src/domain/motor/grade";
import type { Matriz, OfertaSemestre } from "../src/domain/tipos";

const matriz = matrizJson as unknown as Matriz;
const oferta = ofertaJson as unknown as OfertaSemestre;

/**
 * Regressão do bug relatado: em Eng. Comp. (844), "Lógica Reconfigurável" é
 * CSW42 na matriz, mas só tem turma sob o código equivalente ELEW33. Posso
 * Cursar exibia corretamente o código canônico CSW42 no card, mas gravava
 * esse mesmo código canônico em `selecao` ao clicar "adicionar". Como
 * `itensDaSelecao` resolve por código exato contra `oferta.disciplinas` (que
 * só conhece ELEW33, não CSW42), a seleção nunca virava um item de grade: a
 * matéria ficava marcada em Posso Cursar mas "Minha Grade" continuava vazia.
 *
 * Corrigido gravando `e.oferta?.codigo ?? e.disciplina.codigo` em vez de
 * `e.disciplina.codigo` puro — o mesmo padrão que grade-magica.ts:562 já usava.
 */
describe("seleção de disciplina ofertada só por código equivalente", () => {
  it("Posso Cursar resolve CSW42 com oferta sob o código equivalente ELEW33", () => {
    const elegiveis = listarElegiveis(null, matriz, oferta);
    const logica = elegiveis.find((e) => e.disciplina.codigo === "CSW42");
    expect(logica).toBeDefined();
    expect(logica!.oferta).not.toBeNull();
    expect(logica!.oferta!.codigo).toBe("ELEW33");
    expect(logica!.oferta!.turmas.some((t) => t.codigo === "S71")).toBe(true);
  });

  it("a seleção gravada com o código canônico da matriz NÃO aparece na Grade (bug)", () => {
    // é o que `alternarTurma(e.disciplina.codigo, t.codigo)` gravava antes da correção
    const selecao = [{ codDisciplina: "CSW42", codTurma: "S71" }];
    const itens = itensDaSelecao(oferta, selecao);
    expect(itens).toHaveLength(0);
  });

  it("a seleção gravada com o código da oferta aparece na Grade (comportamento correto)", () => {
    const elegiveis = listarElegiveis(null, matriz, oferta);
    const logica = elegiveis.find((e) => e.disciplina.codigo === "CSW42")!;
    const codIdentificador = logica.oferta?.codigo ?? logica.disciplina.codigo;
    const selecao = [{ codDisciplina: codIdentificador, codTurma: "S71" }];
    const itens = itensDaSelecao(oferta, selecao);
    expect(itens).toHaveLength(1);
    expect(itens[0]?.disciplina.nome).toBe("Lógica Reconfigurável");
  });
});
