import { describe, expect, it } from "vitest";
import matriz844 from "../data/eng-comp/matriz-844.json";
import matriz981 from "../data/matriz-981.json";

const m = matriz844 as any;

describe("matriz 844 — procedência e schema", () => {
  it("é a matriz de Eng. Comp., lida do mesmo tipo de documento que a 981", () => {
    expect(m.matriz).toBe(844);
    expect(m.curso.toUpperCase()).toContain("COMPUTA");
    expect(m.fonte).toContain("Consulta Curso e Matriz Curricular");
  });

  it("tem exatamente os mesmos campos de topo que a matriz 981", () => {
    for (const campo of Object.keys(matriz981 as any)) {
      expect(m[campo], `falta o campo ${campo}`).toBeDefined();
    }
  });

  it("tem exatamente os mesmos campos de disciplina que a 981", () => {
    const esperados = Object.keys((matriz981 as any).disciplinas[0]);
    for (const d of m.disciplinas) {
      for (const campo of esperados) {
        expect(d[campo], `${d.codigo}: falta ${campo}`).toBeDefined();
      }
    }
  });
});

describe("matriz 844 — identidade das disciplinas", () => {
  it("usa o código da matriz como identidade e a oferta como equivalente", () => {
    // Confirmado no Histórico Escolar do aluno:
    //   CSR31 Comunicação De Dados ... [disciplina ELET30 - Cursou Equivalente(s)]
    // O histórico registra CSR31; ELET30 é onde o crédito foi cursado.
    const casos: [string, string][] = [
      ["CSR31", "ELET30"],
      ["CSW30", "ELEW30"],
      ["CSD20", "ICSD20"],
    ];
    for (const [codigoMatriz, codigoOferta] of casos) {
      const d = m.disciplinas.find((x: any) => x.codigo === codigoMatriz);
      expect(d, `${codigoMatriz} deveria existir`).toBeDefined();
      expect(d.equivalentes.map((e: any) => e.codigo)).toContain(codigoOferta);
    }
  });

  it("traz a carga horária em horas, não em horas-aula", () => {
    // A Figura 5 do PPC publica horas-aula (CSD20 = 54); o documento oficial
    // publica a carga horária real (45h). Fonte oficial manda.
    const casos: [string, number][] = [
      ["CSD20", 45],
      ["CSF13", 90],
      ["CSR31", 30],
    ];
    for (const [codigo, ch] of casos) {
      const d = m.disciplinas.find((x: any) => x.codigo === codigo);
      expect(d.horas.total, `${codigo}`).toBe(ch);
    }
  });
});

describe("matriz 844 — trilhas e optativas", () => {
  it("traz o agregador de optativas com 270h", () => {
    expect(m.conjuntos["959"]).toBeDefined();
    expect(m.conjuntos["959"].ch).toBe(270);
    expect(m.cargas.optativas).toBe(270);
    expect(m.cargas.eletiva).toBe(90);
  });

  it("traz 13 trilhas mais as optativas isoladas, de 90h cada", () => {
    const subs = Object.entries(m.conjuntos as Record<string, any>).filter(
      ([id]) => id !== "959",
    );
    expect(subs.length).toBe(14);
    for (const [id, c] of subs) {
      expect(c.ch, `conjunto ${id}`).toBe(90);
    }
  });

  it("associa disciplinas a cada trilha", () => {
    // O que faltava quando a única fonte era a Figura 6 do PPC, que lista as
    // disciplinas de cada trilha apenas por nome, sem código.
    const porConjunto = new Map<number, number>();
    for (const d of m.disciplinas) {
      if (d.conjunto === null) continue;
      porConjunto.set(d.conjunto, (porConjunto.get(d.conjunto) ?? 0) + 1);
    }
    for (const id of Object.keys(m.conjuntos)) {
      if (id === "959") continue; // agregador não tem disciplina própria
      expect(porConjunto.get(Number(id)) ?? 0, `trilha ${id} sem disciplina`).toBeGreaterThan(0);
    }

    // a trilha de Controle é a que o PPC tem e a BSI não
    const controle = m.disciplinas
      .filter((d: any) => d.conjunto === 960)
      .map((d: any) => d.codigo);
    expect(controle).toContain("EEC41");
    expect(controle.length).toBeGreaterThanOrEqual(8);
  });

  it("tem trilhas próprias, diferentes das da BSI", () => {
    const nomes = Object.values(m.conjuntos as Record<string, any>).map((c: any) =>
      c.nome.toLowerCase(),
    );
    for (const propria of ["controle", "física", "biomédica"]) {
      expect(nomes.some((n) => n.includes(propria)), `faltou ${propria}`).toBe(true);
    }
    for (const daBSI of ["gestão de sistemas", "linguagens de programação"]) {
      expect(nomes.some((n) => n.includes(daBSI)), `${daBSI} é da BSI`).toBe(false);
    }
  });

  it("herda o período do agregador nas trilhas, que não o declaram", () => {
    // A legenda declara período só para o agregador (959 = 08/10); as trilhas
    // herdam dele. O Resumo Optativas do histórico confirma 8–10.
    for (const [id, c] of Object.entries(m.conjuntos as Record<string, any>)) {
      expect(c.periodo_inicial, `conjunto ${id}`).toBe(8);
      expect(c.periodo_final, `conjunto ${id}`).toBe(10);
    }
  });
});

describe("matriz 844 — integridade dos pré-requisitos", () => {
  it("não tem pré-requisito órfão", () => {
    const codigos = new Set(m.disciplinas.map((d: any) => d.codigo));
    for (const d of m.disciplinas) {
      for (const p of d.prerequisitos) {
        if (/^Per[ií]odo:/i.test(p)) continue;
        expect(codigos.has(p), `${d.codigo} depende de ${p}, inexistente`).toBe(true);
      }
    }
  });

  it("não tem ciclo na cadeia de pré-requisitos", () => {
    const porCodigo = new Map(m.disciplinas.map((d: any) => [d.codigo, d]));
    const estado = new Map<string, number>();
    const visitar = (codigo: string, caminho: string[]): void => {
      if (estado.get(codigo) === 2) return;
      expect(estado.get(codigo), `ciclo: ${[...caminho, codigo].join(" -> ")}`).not.toBe(1);
      estado.set(codigo, 1);
      for (const p of (porCodigo.get(codigo) as any)?.prerequisitos ?? []) {
        if (porCodigo.has(p)) visitar(p, [...caminho, codigo]);
      }
      estado.set(codigo, 2);
    };
    for (const d of m.disciplinas) visitar(d.codigo, []);
  });
});
