import { describe, expect, it } from "vitest";
import matriz806Json from "../data/matriz-806.json";
import turmas20261 from "../data/turmas/2026-1.json";
import { descricaoDoCurso, ehTrilha, trilhasDaMatriz } from "../src/domain/cursos";
import { criarMapaIdentidade } from "../src/domain/motor/identidade";
import { dadosDoCursoPorMatriz, CURSOS } from "../src/domain/dadosCurso";
import { simularFormatura } from "../src/domain/motor/simuladorFormatura";
import type { Matriz, OfertaSemestre, PerfilAluno } from "../src/domain/tipos";

/**
 * Matriz 806: a BSI anterior à 981.
 *
 * O que estes testes protegem, além da leitura em si:
 *
 * 1. A 806 NÃO tem extensão curricular. A 981 tem 330h, e o motor precisa parar
 *    de cobrar extensão sozinho quando a matriz declara 0h.
 * 2. A oferta de turmas é COMPARTILHADA com a 981 e vem publicada com os códigos
 *    novos. Sem a camada de equivalências, um aluno da 806 veria a oferta quase
 *    vazia — 8 disciplinas de 77.
 * 3. As eletivas não formam conjunto na 806. Um conjunto de eletivas aparecendo
 *    aqui seria confundido com trilha e viraria uma 13ª no painel do 3º estrato.
 *
 * Sem histórico real: dado pessoal não entra no repositório.
 */

const matriz = matriz806Json as unknown as Matriz;
const oferta = turmas20261 as unknown as OfertaSemestre;

describe("matriz 806 — dados", () => {
  it("traz as 162 disciplinas e os 15 conjuntos da fonte", () => {
    expect(matriz.matriz).toBe(806);
    expect(matriz.disciplinas).toHaveLength(162);
    expect(Object.keys(matriz.conjuntos)).toHaveLength(15);
  });

  it("fecha as cargas declaradas no rodapé da matriz", () => {
    const obrigatorias = matriz.disciplinas
      .filter((d) => d.conjunto === null)
      .reduce((a, d) => a + d.horas.total, 0);
    expect(obrigatorias).toBe(matriz.cargas.obrigatorias);
    expect(obrigatorias).toBe(2095);

    const topo = Object.entries(matriz.conjuntos)
      .filter(([, c]) => (c as { pai?: unknown }).pai == null)
      .reduce((a, [, c]) => a + c.ch, 0);
    expect(topo).toBe(matriz.cargas.optativas);
    expect(topo).toBe(765);
  });

  it("não cobra extensão curricular", () => {
    expect(matriz.cargas.extensao).toBe(0);
  });

  it("só o ENADE fica sem carga horária", () => {
    const semCarga = matriz.disciplinas.filter((d) => d.horas.total <= 0).map((d) => d.codigo);
    expect(semCarga.sort()).toEqual(["ENADEC", "ENADEI"]);
  });

  it("não deixa pré-requisito apontando para fora da matriz", () => {
    const codigos = new Set(matriz.disciplinas.map((d) => d.codigo));
    const orfaos = matriz.disciplinas.flatMap((d) =>
      d.prerequisitos.filter((p) => !p.startsWith("Período:") && !codigos.has(p)),
    );
    expect(orfaos).toEqual([]);
  });
});

describe("matriz 806 — descrição do curso", () => {
  const curso = descricaoDoCurso(matriz);

  it("é reconhecida como curso próprio, e não cai no padrão da 981", () => {
    expect(curso.matriz).toBe(806);
    expect(curso.agregadorTrilhas).toBe(934);
  });

  it("lista as 12 trilhas do 3º estrato, sem o agregador", () => {
    const trilhas = trilhasDaMatriz(matriz);
    expect(trilhas).toHaveLength(12);
    expect(trilhas).not.toContain("934");
    expect(ehTrilha(curso, 934)).toBe(false);
    expect(ehTrilha(curso, 938)).toBe(true);
  });

  it("não trata o 2º estrato nem as optativas como trilha", () => {
    expect(ehTrilha(curso, 947)).toBe(false);
    expect(ehTrilha(curso, 948)).toBe(false);
  });

  it("traz os dois estágios da BSI com os códigos antigos", () => {
    expect(curso.estagios).toEqual([
      { codigo: "CSX51", rotulo: "Estágio 1", ch: 200 },
      { codigo: "CSX52", rotulo: "Estágio 2", ch: 200 },
    ]);
  });

  it("está registrada entre os cursos cobertos", () => {
    expect(dadosDoCursoPorMatriz(806)?.matriz.matriz).toBe(806);
    expect(CURSOS.map((c) => c.id)).toContain("bsi-806");
  });
});

describe("matriz 806 — oferta compartilhada com a 981", () => {
  it("resolve a maioria da oferta pela camada de equivalências", () => {
    const identidade = criarMapaIdentidade(matriz);
    const daMatriz = new Set(matriz.disciplinas.map((d) => d.codigo));
    const resolvidas = oferta.disciplinas.filter((d) => daMatriz.has(identidade.resolver(d.codigo)));

    // sem equivalência seriam 8 de 77, e a tela pareceria vazia para o aluno da 806
    expect(resolvidas.length).toBeGreaterThan(oferta.disciplinas.length * 0.75);
  });
});

describe("matriz 806 — simulador", () => {
  /** Perfil sintético: nada de dado pessoal real entra no repositório. */
  const perfil = {
    nome: "FULANO DE TAL",
    matricula: "0000000",
    curso: "BSI",
    matriz: 806,
    periodo: 4,
    coefAbsoluto: 0.8,
    coefNormalizado: 0.75,
    ingresso: "2022/1",
    cursadas: [],
    aprovadas: new Set<string>(),
    matriculadas: [],
    obrigatoriasFaltantes: [],
    dependencias: [],
    resumoConjuntos: [],
    eletivas: { chCursadaAprovada: 0, chFaltante: 180, chValidada: 0, chTotal: 180 },
    extensao: { chTotal: 0, chCursada: 0, chFaltante: 0 },
    resumoGeral: {
      obrigatorias: { total: 2095, aprovada: 0, faltante: 2095 },
      optativas: { total: 765, aprovada: 0, faltante: 765 },
      eletivas: { total: 180, aprovada: 0, faltante: 180 },
    },
    avisos: [],
  } as unknown as PerfilAluno;

  const resultado = simularFormatura(perfil, matriz, [oferta], {
    ritmo: 5,
    semestreInicial: "2026-1",
    horizonte: 16,
  });

  it("não cria requisito de extensão para quem a matriz não cobra", () => {
    expect(resultado.requisitos.find((r) => r.id === "extensao")).toBeUndefined();
  });

  it("cobra as categorias que a 806 realmente tem", () => {
    const ids = resultado.requisitos.map((r) => r.id);
    expect(ids).toContain("obrigatorias");
    expect(ids).toContain("segundoEstrato");
    expect(ids).toContain("trilhas");
    expect(ids).toContain("eletivas");
  });

  it("projeta semestres com disciplinas de verdade", () => {
    expect(resultado.semestres.length).toBeGreaterThan(0);
    for (const s of resultado.semestres) {
      expect(s.disciplinas.length, `semestre ${s.semestre} vazio`).toBeGreaterThan(0);
    }
  });
});
