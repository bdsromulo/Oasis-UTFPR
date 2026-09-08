import { describe, expect, it } from "vitest";
import {
  CURSOS,
  carregarOfertasHistoricasMecatronica,
  ofertaDoSemestre,
  semestresDoCurso,
  semestresReaisDoCurso,
} from "../src/domain/dadosCurso";
import {
  descritorDoSemestre,
  estadoDoSemestre,
  formatarSemestre,
  ofertaReferenciaDoSemestre,
  proximoSemestre,
  SEMESTRE_CORRENTE,
  SEMESTRE_PLANEJAMENTO,
} from "../src/domain/semestres";

/**
 * A virada de semestre é a operação que mais se repete na vida da plataforma, e
 * a que mais espalhou literais pelo código. Estes testes fixam o contrato dos
 * três estados e — o que mais importa — provam que o semestre em planejamento
 * enxerga turmas reais em TODOS os cursos, inclusive nos que carregam a oferta
 * de forma assíncrona.
 */

describe("estados do semestre", () => {
  it("separa planejamento, corrente e passado", () => {
    expect(estadoDoSemestre(SEMESTRE_PLANEJAMENTO)).toBe("planejamento");
    expect(estadoDoSemestre(SEMESTRE_CORRENTE)).toBe("corrente");
    expect(estadoDoSemestre("2026-1")).toBe("passado");
    expect(estadoDoSemestre("2025-2")).toBe("passado");
  });

  it("aceita as duas grafias que a fonte usa", () => {
    expect(estadoDoSemestre("2026.2")).toBe("corrente");
    expect(formatarSemestre("2027-1")).toBe("2027.1");
  });

  it("o planejamento é sempre o semestre seguinte ao corrente", () => {
    expect(proximoSemestre(SEMESTRE_CORRENTE)).toBe(SEMESTRE_PLANEJAMENTO);
  });
});

describe("descritor do semestre", () => {
  const reais = ["2026-2", "2026-1", "2025-2"];

  it("aponta 2027.1 para a oferta real de 2026.1, a última de mesma paridade", () => {
    const d = descritorDoSemestre(SEMESTRE_PLANEJAMENTO, reais);

    expect(d.estado).toBe("planejamento");
    expect(d.projetado).toBe(true);
    expect(d.ofertaEspelhada).toBe("2026-1");
    expect(d.rotulo).toBe("2027.1");
    expect(d.rotuloEstado).toBe("Planejamento");
    expect(d.tom).toBe("ok");
  });

  it("o semestre com PDF publicado não é projetado e não espelha ninguém", () => {
    const d = descritorDoSemestre(SEMESTRE_CORRENTE, reais);

    expect(d.projetado).toBe(false);
    expect(d.ofertaEspelhada).toBeNull();
    expect(d.rotuloEstado).toBe("Corrente");
    expect(d.tom).toBe("aviso");
  });

  it("o semestre encerrado fica em cinza", () => {
    const d = descritorDoSemestre("2026-1", reais);

    expect(d.rotuloEstado).toBe("Passado");
    expect(d.tom).toBe("neutro");
  });
});

describe("o semestre de planejamento em todos os cursos servidos", () => {
  it("navega acima dos semestres com oferta, sem virar entrada de dado", async () => {
    await carregarOfertasHistoricasMecatronica();

    for (const curso of CURSOS) {
      expect(semestresDoCurso(curso)[0], curso.id).toBe(SEMESTRE_PLANEJAMENTO);
      // a procedência continua honesta: não existe PDF de 2027.1
      expect(curso.ofertas, curso.id).not.toHaveProperty(SEMESTRE_PLANEJAMENTO);
      expect(semestresReaisDoCurso(curso), curso.id).not.toContain(SEMESTRE_PLANEJAMENTO);
    }
  });

  it("mostra turmas reais de 2026.1, inclusive na Mecatrônica que carrega assíncrona", async () => {
    await carregarOfertasHistoricasMecatronica();

    for (const curso of CURSOS) {
      const oferta = ofertaDoSemestre(curso, SEMESTRE_PLANEJAMENTO);

      expect(oferta, curso.id).toBeDefined();
      expect(oferta.semestre, curso.id).toBe("2026-1");
      expect(oferta.disciplinas.length, curso.id).toBeGreaterThan(0);
      // é a mesma oferta que o motor usa para projetar aquele semestre
      expect(oferta, curso.id).toBe(
        ofertaReferenciaDoSemestre(SEMESTRE_PLANEJAMENTO, Object.values(curso.ofertas)),
      );
    }
  });

  it("o semestre com PDF próprio continua servindo a própria oferta", () => {
    for (const curso of CURSOS) {
      expect(ofertaDoSemestre(curso, SEMESTRE_CORRENTE).semestre, curso.id).toBe(
        SEMESTRE_CORRENTE,
      );
    }
  });
});

describe("as duas paridades continuam obrigatórias", () => {
  it("todo curso tem ao menos uma oferta par e uma ímpar", async () => {
    await carregarOfertasHistoricasMecatronica();

    for (const curso of CURSOS) {
      const reais = semestresReaisDoCurso(curso);
      expect(reais.some((s) => s.endsWith("-2")), curso.id).toBe(true);
      // sem a ímpar, 2027.1 seria projetado sobre um semestre par
      expect(reais.some((s) => s.endsWith("-1")), curso.id).toBe(true);
    }
  });
});
