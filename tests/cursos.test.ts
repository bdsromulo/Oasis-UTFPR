import { describe, expect, it } from "vitest";
import matriz981 from "../data/matriz-981.json";
import matriz844 from "../data/eng-comp/matriz-844.json";
import {
  BSI_981,
  ENG_COMP_844,
  descricaoDoCurso,
  ehTrilha,
  exigeExtensao,
  rotuloDoConjunto,
  trilhasDaMatriz,
} from "../src/domain/cursos";
import type { Matriz } from "../src/domain/tipos";

const bsi = matriz981 as unknown as Matriz;
const engComp = matriz844 as unknown as Matriz;

describe("descrição de curso", () => {
  it("escolhe a descrição pela matriz", () => {
    expect(descricaoDoCurso(bsi)).toBe(BSI_981);
    expect(descricaoDoCurso(engComp)).toBe(ENG_COMP_844);
    // matriz desconhecida cai na BSI, que é o curso base da plataforma
    expect(descricaoDoCurso(999)).toBe(BSI_981);
  });

  it("deriva as trilhas da própria matriz, sem intervalo fixo no código", () => {
    const daBsi = trilhasDaMatriz(bsi);
    expect(daBsi).toHaveLength(12);
    // nem o agregador nem as categorias simples entram
    expect(daBsi).not.toContain("1160");
    expect(daBsi).not.toContain("1159");
    expect(daBsi).not.toContain("1161");
    expect(daBsi).not.toContain("1199");

    const daEng = trilhasDaMatriz(engComp);
    expect(daEng).toHaveLength(13);
    expect(daEng).not.toContain("959"); // agregador
    expect(daEng).not.toContain("973"); // optativas isoladas: soma, mas não valida
  });

  it("reflete a exigência de trilhas de cada curso", () => {
    expect(BSI_981.trilhasExigidas).toBe(3);
    expect(ENG_COMP_844.trilhasExigidas).toBe(2);
  });

  it("sabe que Eng. Comp. não tem 2º estrato nem humanidades", () => {
    expect(ENG_COMP_844.categorias).toHaveLength(0);
    expect(BSI_981.categorias.map((c) => c.id)).toContain("segundoEstrato");
    expect(BSI_981.categorias.map((c) => c.id)).toContain("humanidades");
  });

  it("rotula conjunto conforme o curso", () => {
    expect(rotuloDoConjunto(bsi, null)).toBe("obrigatória");
    expect(rotuloDoConjunto(bsi, 1159)).toBe("2º estrato");
    expect(rotuloDoConjunto(bsi, 1161)).toBe("humanidades");
    expect(rotuloDoConjunto(bsi, 1199)).toBe("eletiva");
    expect(rotuloDoConjunto(bsi, 1165)).toContain("Banco");

    // em Eng. Comp. o mesmo número não significa nada; vale o nome do conjunto
    expect(rotuloDoConjunto(engComp, null)).toBe("obrigatória");
    expect(rotuloDoConjunto(engComp, 960)).toContain("Controle");
  });

  it("não confunde agregador com trilha em nenhum dos cursos", () => {
    expect(ehTrilha(BSI_981, 1160)).toBe(false);
    expect(ehTrilha(BSI_981, 1165)).toBe(true);
    expect(ehTrilha(ENG_COMP_844, 959)).toBe(false);
    expect(ehTrilha(ENG_COMP_844, 960)).toBe(true);
  });

  it("só habilita extensão para a matriz que a exige", () => {
    expect(exigeExtensao(bsi)).toBe(true);
    expect(exigeExtensao(engComp)).toBe(false);
  });
});
