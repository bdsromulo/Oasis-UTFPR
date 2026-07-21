import { describe, expect, it } from "vitest";
import matriz844 from "../data/eng-comp/matriz-844.json";
import turmas20261 from "../data/eng-comp/turmas/2026-1.json";
import turmas20252 from "../data/eng-comp/turmas/2025-2.json";

const m = matriz844 as any;

describe("matriz 844 — identidade das disciplinas", () => {
  it("usa o código da MATRIZ como identidade, não o da oferta", () => {
    // Confirmado no Histórico Escolar do aluno de Eng. Comp.:
    //   CSR31 Comunicação De Dados ... [disciplina ELET30 - Cursou Equivalente(s)]
    // O histórico registra CSR31; ELET30 é onde o crédito foi cursado.
    const casos: [string, string][] = [
      ["CSR31", "ELET30"],
      ["CSW30", "ELEW30"],
      ["MA70G", "MAT7ED"],
      ["CSD20", "ICSD20"],
    ];
    for (const [codigoMatriz, codigoOferta] of casos) {
      const d = m.disciplinas.find((x: any) => x.codigo === codigoMatriz);
      expect(d, `${codigoMatriz} deveria existir com o código da matriz`).toBeDefined();
      expect(
        d.equivalentes.map((e: any) => e.codigo),
        `${codigoMatriz} deveria ter ${codigoOferta} como equivalente`,
      ).toContain(codigoOferta);
    }
  });

  it("nunca usa um código de oferta como identidade", () => {
    const codigosDeOferta = new Set<string>([
      ...(turmas20261 as any).disciplinas.map((d: any) => d.codigo),
      ...(turmas20252 as any).disciplinas.map((d: any) => d.codigo),
    ]);
    // Um código só pode coincidir se a matriz e a oferta usarem mesmo o mesmo
    // código; o que não pode é a disciplina ter perdido o código do PPC.
    for (const d of m.disciplinas) {
      if (!codigosDeOferta.has(d.codigo)) continue;
      const temEquivalenteDiferente = d.equivalentes.some((e: any) => e.codigo !== d.codigo);
      expect(
        temEquivalenteDiferente,
        `${d.codigo} parece ser código de oferta usado como identidade`,
      ).toBe(false);
    }
  });
});

describe("matriz 844 — carga horária", () => {
  it("converte horas-aula da figura em carga horária de 60 min", () => {
    // A Figura 5 publica TA (horas-aula de 50 min); a tabela de equivalências
    // do PPC (p.50) publica as duas colunas lado a lado e fixa a razão 5/6.
    const casos: [string, number, number][] = [
      ["CSD20", 54, 45],
      ["CSF13", 108, 90],
      ["MA71A", 108, 90],
      ["CSR31", 36, 30],
    ];
    for (const [codigo, ta, ch] of casos) {
      const d = m.disciplinas.find((x: any) => x.codigo === codigo);
      expect(d.horas_aula_figura, `${codigo}: horas-aula`).toBe(ta);
      expect(d.horas.total, `${codigo}: carga horária`).toBe(ch);
    }
  });

  it("mantém a conversão coerente em toda a matriz", () => {
    for (const d of m.disciplinas) {
      if (!d.horas_aula_figura) continue;
      expect(d.horas.total, `${d.codigo}`).toBe(Math.round((d.horas_aula_figura * 5) / 6));
    }
  });

  it("soma as cargas declaradas pelo PPC", () => {
    // PPC: 270h em optativas (2 trilhas de 90h + isoladas) e 90h em eletivas
    expect(m.cargas.optativas).toBe(270);
    expect(m.cargas.eletiva).toBe(90);
    expect(m.cargas.soma).toBe(m.cargas.obrigatorias + 270 + 90);
  });
});

describe("matriz 844 — schema compatível com o app", () => {
  it("traz os campos que o domínio consome da matriz 981", () => {
    for (const campo of ["matriz", "curso", "campus", "cargas", "conjuntos", "eletiva", "disciplinas"]) {
      expect(m[campo], `falta o campo ${campo}`).toBeDefined();
    }
    for (const d of m.disciplinas) {
      for (const campo of ["codigo", "nome", "periodo", "conjunto", "modelo", "aulas_semanais", "horas", "prerequisitos", "equivalentes"]) {
        expect(d[campo], `${d.codigo}: falta ${campo}`).toBeDefined();
      }
    }
  });

  it("não tem pré-requisito órfão", () => {
    const codigos = new Set(m.disciplinas.map((d: any) => d.codigo));
    for (const d of m.disciplinas) {
      for (const p of d.prerequisitos) {
        expect(codigos.has(p), `${d.codigo} depende de ${p}, que não existe na matriz`).toBe(true);
      }
    }
  });

  it("mantém pré-requisito sempre em período anterior", () => {
    const porCodigo = new Map(m.disciplinas.map((d: any) => [d.codigo, d]));
    for (const d of m.disciplinas) {
      for (const p of d.prerequisitos) {
        const pre: any = porCodigo.get(p);
        expect(pre.periodo, `${d.codigo} (P${d.periodo}) depende de ${p} (P${pre.periodo})`).toBeLessThan(d.periodo);
      }
    }
  });
});
