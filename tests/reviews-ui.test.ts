import { describe, expect, it } from "vitest";
import { VERTICAIS } from "../src/ui/telas/reviewsComuns";

describe("régua qualitativa das avaliações", () => {
  it("descreve carga de trabalho sem estimar horas por semana", () => {
    const carga = VERTICAIS.find((vertical) => vertical.chave === "cargaTrabalho");

    expect(carga?.regua).toEqual([
      "Muito leve: pouquíssimo tempo fora da aula",
      "Leve: pouco tempo fora da aula",
      "Moderada: tempo razoável fora da aula",
      "Pesada: bastante tempo fora da aula",
      "Muito pesada: muito tempo fora da aula",
    ]);
    expect(carga?.regua.join(" ")).not.toMatch(/\b\d+\s*(?:h|horas?)\b|horas? por semana/i);
  });
});
