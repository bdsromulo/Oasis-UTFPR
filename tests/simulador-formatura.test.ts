import { describe, expect, it } from "vitest";
import matrizJson from "../data/matriz-981.json";
import turmas20252 from "../data/turmas/2025-2.json";
import turmas20261 from "../data/turmas/2026-1.json";
import {
  inferirSazonalidade,
  proximoSemestre,
  simularFormatura,
} from "../src/domain/motor/simuladorFormatura";
import type { Matriz, OfertaSemestre, PerfilAluno, ResumoConjunto } from "../src/domain/tipos";

const matriz = matrizJson as unknown as Matriz;
const ofertas = [turmas20252, turmas20261] as unknown as OfertaSemestre[];

/** Perfil sintético: nada de dado pessoal real entra no repositório. */
function perfilFake(over: Partial<PerfilAluno> = {}): PerfilAluno {
  const aprovadas = over.aprovadas ?? new Set<string>();
  return {
    nome: "FULANO DE TAL",
    matricula: "0000000",
    curso: "BSI",
    matriz: 981,
    periodo: 6,
    coefAbsoluto: 0.8,
    coefNormalizado: 0.75,
    ingresso: "2023/1",
    cursadas: [],
    aprovadas,
    matriculadas: [],
    obrigatoriasFaltantes: [],
    dependencias: [],
    resumoConjuntos: [],
    eletivas: { chCursadaAprovada: 105, chFaltante: 0, chValidada: 105, chTotal: 105 },
    extensao: { chTotal: 330, chCursada: 330, chFaltante: 0 },
    resumoGeral: {
      obrigatorias: { total: 2005, aprovada: 0, faltante: 2005 },
      optativas: { total: 840, aprovada: 0, faltante: 840 },
      eletivas: { total: 105, aprovada: 105, faltante: 0 },
    },
    avisos: [],
    ...over,
  };
}

function conjunto(cod: string, nome: string, exigido: number, cursado: number): ResumoConjunto {
  return {
    conjunto: cod,
    nome,
    chObrigatoria: exigido,
    chCursadaAprovada: cursado,
    chFaltante: Math.max(0, exigido - cursado),
    chValidada: cursado >= exigido ? exigido : 0,
  };
}

describe("sazonalidade empírica", () => {
  const saz = inferirSazonalidade(ofertas);

  it("classifica pelo que a oferta real mostra, não pela paridade do período", () => {
    // todas as obrigatórias de sala de aula da 981 abriram nos dois semestres
    const obrigatorias = matriz.disciplinas.filter(
      (d) => d.conjunto === null && !d.codigo.startsWith("ENADE") && !/^ICSX5/.test(d.codigo),
    );
    for (const d of obrigatorias) {
      expect(saz.de(d.codigo), `${d.codigo} deveria abrir nos dois semestres`).toBe("ambos");
    }
  });

  it("marca como exclusiva de um semestre quem só apareceu num deles", () => {
    // GEE7G1 (2º estrato) só consta na oferta de 2026.1
    expect(saz.de("GEE7G1")).toBe("primeiro");
    // FCH7GA (humanidades) só consta na oferta de 2025.2
    expect(saz.de("FCH7GA")).toBe("segundo");
  });

  it("marca como sem oferta quem não apareceu em semestre nenhum", () => {
    expect(saz.de("ICSW22")).toBe("sem_oferta");
  });

  it("não afirma exclusividade quando só um semestre foi observado", () => {
    const soUm = inferirSazonalidade([turmas20252 as unknown as OfertaSemestre]);
    expect(soUm.de("FCH7GA")).toBe("ambos");
  });
});

describe("avanço de semestre", () => {
  it("alterna 1 e 2 virando o ano", () => {
    expect(proximoSemestre("2026-1")).toBe("2026-2");
    expect(proximoSemestre("2026-2")).toBe("2027-1");
    expect(proximoSemestre("2027-2")).toBe("2028-1");
  });
});

describe("simulação de formatura", () => {
  /** Aluno em fim de curso: espelha a estrutura de um 6º período adiantado. */
  function perfilFimDeCurso() {
    const aprovadas = new Set<string>(
      matriz.disciplinas
        .filter((d) => d.conjunto === null && !d.codigo.startsWith("ENADE"))
        .filter((d) => !["ICSX30", "ICSX40", "ICSX41", "ICSS30"].includes(d.codigo))
        .map((d) => d.codigo),
    );
    return perfilFake({
      aprovadas,
      resumoConjuntos: [
        conjunto("1159", "Segundo Estrato", 360, 225),
        conjunto("1161", "Optativas Do Ciclo De Humanidades", 135, 45),
        conjunto("1164", "Desenvolvimento Baseado Em Plataformas", 90, 60),
        conjunto("1165", "Banco De Dados", 90, 120),
        conjunto("1171", "Sistemas Embarcados E Robótica", 90, 45),
      ],
      resumoGeral: {
        obrigatorias: { total: 2005, aprovada: 1840, faltante: 165 },
        optativas: { total: 840, aprovada: 90, faltante: 750 },
        eletivas: { total: 105, aprovada: 105, faltante: 0 },
      },
    });
  }

  it("fecha todas as categorias no mínimo exigido", () => {
    const r = simularFormatura(perfilFimDeCurso(), matriz, ofertas, {
      ritmo: 5,
      semestreInicial: "2026-2",
    });
    expect(r.semestreFormatura).not.toBeNull();
    for (const q of r.requisitos) {
      expect(q.atendido, `${q.nome} não fechou`).toBe(true);
    }
  });

  it("respeita a cadeia TI2 → TC1 → TC2, um por semestre", () => {
    const r = simularFormatura(perfilFimDeCurso(), matriz, ofertas, {
      ritmo: 6,
      semestreInicial: "2026-2",
    });
    const semestreDe = (cod: string) =>
      r.semestres.findIndex((s) => s.disciplinas.some((d) => d.codigo === cod));

    const ti2 = semestreDe("ICSX30");
    const tc1 = semestreDe("ICSX40");
    const tc2 = semestreDe("ICSX41");
    expect(ti2).toBeGreaterThanOrEqual(0);
    expect(tc1).toBeGreaterThan(ti2);
    expect(tc2).toBeGreaterThan(tc1);
  });

  it("nunca agenda uma disciplina antes dos seus pré-requisitos", () => {
    const r = simularFormatura(perfilFimDeCurso(), matriz, ofertas, {
      ritmo: 6,
      semestreInicial: "2026-2",
    });
    const cursadasAte = new Set(perfilFimDeCurso().aprovadas);
    for (const s of r.semestres) {
      for (const d of s.disciplinas) {
        const dm = matriz.disciplinas.find((x) => x.codigo === d.codigo);
        if (!dm) continue; // eletiva genérica
        for (const p of dm.prerequisitos) {
          if (/^Per[ií]odo:/i.test(p)) continue;
          expect(cursadasAte.has(p), `${d.codigo} agendada sem ${p}`).toBe(true);
        }
      }
      for (const d of s.disciplinas) cursadasAte.add(d.codigo);
    }
  });

  it("respeita a sazonalidade observada de cada disciplina", () => {
    const saz = inferirSazonalidade(ofertas);
    const r = simularFormatura(perfilFimDeCurso(), matriz, ofertas, {
      ritmo: 6,
      semestreInicial: "2026-2",
    });
    for (const s of r.semestres) {
      const ehPar = s.semestre.endsWith("-2");
      for (const d of s.disciplinas) {
        if (d.codigo === "ELETIVA") continue;
        const e = saz.de(d.codigo);
        if (e === "primeiro") expect(ehPar, `${d.codigo} em semestre par`).toBe(false);
        if (e === "segundo") expect(ehPar, `${d.codigo} em semestre ímpar`).toBe(true);
      }
    }
  });

  it("conta no máximo a exigência de cada trilha para o total do 3º estrato", () => {
    const r = simularFormatura(perfilFimDeCurso(), matriz, ofertas, {
      ritmo: 6,
      semestreInicial: "2026-2",
    });
    const porTrilha = new Map<number, number>();
    for (const s of r.semestres) {
      for (const d of s.disciplinas) {
        if (d.categoria !== "trilhas" || d.conjunto === null) continue;
        porTrilha.set(d.conjunto, (porTrilha.get(d.conjunto) ?? 0) + d.horas);
      }
    }
    // nenhuma trilha recebe disciplina depois de já ter fechado as próprias horas
    for (const [conj, horas] of porTrilha) {
      const exig = matriz.conjuntos[String(conj)]?.ch ?? 90;
      const jaTinha =
        perfilFimDeCurso().resumoConjuntos.find((c) => c.conjunto === String(conj))
          ?.chCursadaAprovada ?? 0;
      // a última disciplina pode ultrapassar, mas não se começa uma já fechada
      expect(jaTinha, `trilha ${conj} já estava fechada`).toBeLessThan(exig);
      expect(horas).toBeGreaterThan(0);
    }
  });

  it("nunca enche uma trilha além do teto que ela contribui", () => {
    // Regressão: o guloso enfiava uma 3ª disciplina numa trilha já em 60h, e o
    // aluno cursava 120h onde só 90h contam para as 345h do 3º estrato — uma
    // matéria inteira a mais no plano, contra a premissa de cursar só o mínimo.
    // Aluno sem nenhuma trilha feita é o caso que expõe o problema.
    const aprovadas = new Set<string>(
      matriz.disciplinas
        .filter((d) => d.conjunto === null && !d.codigo.startsWith("ENADE"))
        .filter((d) => !["ICSX30", "ICSX40", "ICSX41", "ICSS30"].includes(d.codigo))
        .map((d) => d.codigo),
    );
    const perfil = perfilFake({
      aprovadas,
      resumoConjuntos: [
        conjunto("1159", "Segundo Estrato", 360, 180),
        conjunto("1161", "Humanidades", 135, 45),
      ],
      resumoGeral: {
        obrigatorias: { total: 2005, aprovada: 1440, faltante: 565 },
        optativas: { total: 840, aprovada: 0, faltante: 840 },
        eletivas: { total: 105, aprovada: 105, faltante: 0 },
      },
    });

    for (const ritmo of [4, 5, 6]) {
      const r = simularFormatura(perfil, matriz, ofertas, { ritmo, semestreInicial: "2026-2" });
      const porTrilha = new Map<number, number>();
      for (const s of r.semestres) {
        for (const d of s.disciplinas) {
          if (d.categoria !== "trilhas" || d.conjunto === null) continue;
          porTrilha.set(d.conjunto, (porTrilha.get(d.conjunto) ?? 0) + d.horas);
        }
      }
      for (const [conj, horas] of porTrilha) {
        const teto = matriz.conjuntos[String(conj)]?.ch ?? 90;
        expect(horas, `ritmo ${ritmo}: trilha ${conj} recebeu ${horas}h para um teto de ${teto}h`).toBeLessThanOrEqual(teto);
      }
    }
  });

  it("não ocupa vaga de aula com estágio nem atividades complementares", () => {
    const aprovadas = new Set<string>(
      matriz.disciplinas
        .filter((d) => d.conjunto === null && !d.codigo.startsWith("ENADE"))
        .filter((d) => !["ICSX50", "ICSX51", "ICSX52"].includes(d.codigo))
        .map((d) => d.codigo),
    );
    const r = simularFormatura(
      perfilFake({
        aprovadas,
        resumoGeral: {
          obrigatorias: { total: 2005, aprovada: 1600, faltante: 405 },
          optativas: { total: 840, aprovada: 840, faltante: 0 },
          eletivas: { total: 105, aprovada: 105, faltante: 0 },
        },
        resumoConjuntos: [
          conjunto("1159", "Segundo Estrato", 360, 360),
          conjunto("1161", "Humanidades", 135, 135),
          conjunto("1165", "Banco De Dados", 90, 90),
          conjunto("1166", "Inteligência Artificial", 90, 90),
          conjunto("1168", "Algoritmos E Complexidade", 90, 90),
          conjunto("1170", "Redes De Computadores", 90, 90),
        ],
      }),
      matriz,
      ofertas,
      { ritmo: 1, semestreInicial: "2026-2" },
    );
    // com ritmo 1, estágio e atividades ainda assim cabem no mesmo semestre
    const primeiro = r.semestres[0];
    expect(primeiro.materias).toBeLessThanOrEqual(1);
    expect(primeiro.disciplinas.length).toBeGreaterThan(1);
  });

  it("nunca contabiliza mais horas do que a categoria exige", () => {
    // perfil incoerente de propósito: Quadro Resumo diz 1200h de obrigatórias,
    // mas nenhuma disciplina consta como aprovada. O cumprido de obrigatórias
    // vem do roster, então cumprido + planejado tem de fechar exatamente no piso.
    const r = simularFormatura(
      perfilFake({
        aprovadas: new Set<string>(),
        resumoGeral: {
          obrigatorias: { total: 2005, aprovada: 1200, faltante: 805 },
          optativas: { total: 840, aprovada: 0, faltante: 840 },
          eletivas: { total: 105, aprovada: 0, faltante: 105 },
        },
      }),
      matriz,
      ofertas,
      { ritmo: 6, semestreInicial: "2026-2" },
    );
    const obr = r.requisitos.find((q) => q.id === "obrigatorias")!;
    expect(obr.cumprido).toBe(0);
    expect(obr.cumprido + obr.planejado).toBe(2005);
  });

  it("soma do roster obrigatório bate com a carga declarada na matriz", () => {
    const soma = matriz.disciplinas
      .filter((d) => d.conjunto === null && !d.codigo.startsWith("ENADE"))
      .reduce((a, d) => a + d.horas.total, 0);
    expect(soma).toBe(matriz.cargas.obrigatorias);
  });

  it("um ritmo maior nunca atrasa a formatura", () => {
    const semestres = [4, 5, 6, 7].map(
      (ritmo) =>
        simularFormatura(perfilFimDeCurso(), matriz, ofertas, {
          ritmo,
          semestreInicial: "2026-2",
        }).semestres.length,
    );
    for (let i = 1; i < semestres.length; i++) {
      expect(semestres[i]).toBeLessThanOrEqual(semestres[i - 1]);
    }
  });

  it("sem histórico, projeta o curso inteiro a partir do zero", () => {
    const r = simularFormatura(null, matriz, ofertas, { ritmo: 6, semestreInicial: "2026-2" });
    expect(r.semestres.length).toBeGreaterThan(4);
    expect(r.requisitos.find((q) => q.id === "obrigatorias")!.faltante).toBe(2005);
  });
});
