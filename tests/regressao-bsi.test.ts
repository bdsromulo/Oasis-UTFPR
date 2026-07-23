import { describe, expect, it } from "vitest";
import matrizJson from "../data/matriz-981.json";
import turmas20261 from "../data/turmas/2026-1.json";
import { montarPainel } from "../src/domain/motor/situacao";
import { listarElegiveis } from "../src/domain/motor/elegiveis";
import { calcularProgressoMateria, calcularResumoProgressoGrade } from "../src/domain/motor/progressoGrade";
import type { Matriz, OfertaSemestre, PerfilAluno, ResumoConjunto } from "../src/domain/tipos";

/**
 * Rede de proteção da parametrização de categorias.
 *
 * As regras da BSI estão hoje escritas como número fixo no código (1159, 1161,
 * 1162..1173) espalhado por 9 arquivos. Ao trocar isso por uma descrição de
 * curso, o risco é alterar em silêncio o comportamento da BSI — que já está no
 * ar. Estes testes fixam a saída atual: se a refatoração mudar qualquer número
 * visível ao aluno, eles falham.
 *
 * Não usam histórico real (dado pessoal): montam um perfil sintético que
 * exercita todas as categorias da matriz 981.
 */

const matriz = matrizJson as unknown as Matriz;
const oferta = turmas20261 as unknown as OfertaSemestre;

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

/** Perfil que toca 2º estrato, humanidades, três trilhas, eletivas e extensão. */
function perfilCompleto(): PerfilAluno {
  const aprovadas = new Set<string>(
    matriz.disciplinas
      .filter((d) => d.conjunto === null && !d.codigo.startsWith("ENADE"))
      .slice(0, 20)
      .map((d) => d.codigo),
  );
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
    resumoConjuntos: [
      conjunto("1159", "Segundo Estrato", 360, 225),
      conjunto("1161", "Optativas Do Ciclo De Humanidades", 135, 45),
      conjunto("1160", "Terceiro Estrato - Trilhas Em Computação", 345, 225),
      conjunto("1164", "Desenvolvimento Baseado Em Plataformas", 90, 60),
      conjunto("1165", "Banco De Dados", 90, 120),
      conjunto("1171", "Sistemas Embarcados E Robótica", 90, 45),
    ],
    eletivas: { chCursadaAprovada: 60, chFaltante: 45, chValidada: 60, chTotal: 105 },
    extensao: { chTotal: 330, chCursada: 90, chFaltante: 240 },
    resumoGeral: {
      obrigatorias: { total: 2005, aprovada: 1200, faltante: 805 },
      optativas: { total: 840, aprovada: 285, faltante: 555 },
      eletivas: { total: 105, aprovada: 60, faltante: 45 },
    },
    avisos: [],
  };
}

describe("regressão BSI — painel de situação", () => {
  const painel = montarPainel(perfilCompleto(), matriz);

  it("separa 2º estrato e humanidades com os números do histórico", () => {
    expect(painel.segundoEstrato).toMatchObject({ conjunto: "1159", exigido: 360, cumprido: 225 });
    expect(painel.humanidades).toMatchObject({ conjunto: "1161", exigido: 135, cumprido: 45 });
  });

  it("lista as 12 trilhas do 3º estrato, e só elas", () => {
    expect(painel.trilhas).toHaveLength(12);
    for (const t of painel.trilhas) {
      const id = Number(t.conjunto);
      expect(id).toBeGreaterThanOrEqual(1162);
      expect(id).toBeLessThanOrEqual(1173);
      expect(t.ehTrilha).toBe(true);
    }
    // o agregador 1160 não é trilha e não pode aparecer na lista
    expect(painel.trilhas.some((t) => t.conjunto === "1160")).toBe(false);
  });

  it("conta as trilhas validadas", () => {
    // só 1165 fechou as 90h
    expect(painel.trilhasValidadas).toBe(1);
  });

  it("mantém o total do 3º estrato separado das demais optativas", () => {
    expect(painel.blocoOptativo).toEqual({ exigido: 345, cumprido: 225 });
  });

  it("ordena as trilhas por carga cumprida, decrescente", () => {
    const cumpridos = painel.trilhas.map((t) => t.cumprido);
    expect([...cumpridos].sort((a, b) => b - a)).toEqual(cumpridos);
  });

  it("traz eletivas e extensão consolidadas do histórico", () => {
    expect(painel.eletivas).toEqual({ exigido: 105, cumprido: 60 });
    expect(painel.extensao).toEqual({ exigido: 330, cumprido: 90 });
  });

  it("aponta divergência de matriz", () => {
    const p = perfilCompleto();
    p.matriz = 844;
    expect(montarPainel(p, matriz).inconsistencias[0]).toContain("844");
  });
});

describe("regressão BSI — rótulo de categoria em elegíveis", () => {
  const elegiveis = listarElegiveis(perfilCompleto(), matriz, oferta);

  it("classifica cada disciplina ofertada numa categoria conhecida", () => {
    const rotulos = new Set(elegiveis.map((e: any) => e.categoria));
    // os rótulos que a BSI usa hoje; a refatoração não pode inventar nem perder
    for (const esperado of ["obrigatória", "2º estrato", "humanidades"]) {
      expect(rotulos.has(esperado), `sumiu o rótulo "${esperado}"`).toBe(true);
    }
  });

  it("dá à trilha o nome do conjunto, não o número", () => {
    const daTrilha = elegiveis.find((e: any) => {
      const d = matriz.disciplinas.find((x) => x.codigo === e.disciplina.codigo);
      return d?.conjunto && d.conjunto >= 1162 && d.conjunto <= 1173;
    });
    if (!daTrilha) return; // nem toda oferta tem trilha
    expect((daTrilha as any).categoria).not.toMatch(/^\d+$/);
    expect((daTrilha as any).categoria.length).toBeGreaterThan(3);
  });
});

describe("regressão BSI — progresso por categoria na grade", () => {
  const perfil = perfilCompleto();

  it("classifica cada categoria com a chave e o rótulo de hoje", () => {
    const casos: [string, string, string][] = [
      // código, categoriaId esperado, trecho do nome
      ["ICSD20", "obrigatorias", "Obrigatórias"],
      ["ICSA31", "1159", "2º Estrato"],
      ["FCH7HB", "1161", "Humanidades"],
      ["ICSB41", "1165", "Banco"],
    ];
    for (const [codigo, id, trecho] of casos) {
      const d = matriz.disciplinas.find((x) => x.codigo === codigo);
      if (!d) continue;
      const info = calcularProgressoMateria(d.codigo, d.nome, d.horas.total, perfil, matriz);
      expect(info.categoriaId, `${codigo}: categoriaId`).toBe(id);
      expect(info.categoriaNome, `${codigo}: nome`).toContain(trecho);
    }
  });

  it("marca a trilha com o sufixo de estrato da BSI", () => {
    const d = matriz.disciplinas.find((x) => x.conjunto === 1165)!;
    const info = calcularProgressoMateria(d.codigo, d.nome, d.horas.total, perfil, matriz);
    expect(info.categoriaNome).toContain("(3º Estrato)");
  });

  it("agrega o bloco de trilhas com as 345h da matriz", () => {
    const itens = matriz.disciplinas
      .filter((d) => d.conjunto === 1165)
      .slice(0, 2)
      .map((d) => ({ disciplina: { codigo: d.codigo, nome: d.nome, horas: d.horas } })) as any;
    const resumo = calcularResumoProgressoGrade(itens, perfil, matriz);
    const geral = resumo.find((r) => r.categoriaId === "trilhas_geral");
    expect(geral, "bloco trilhas_geral sumiu").toBeDefined();
    expect(geral!.exigido).toBe(345);
    expect(geral!.categoriaNome).toContain("3º Estrato");
  });

  it("mantém a ordem das categorias principais", () => {
    const resumo = calcularResumoProgressoGrade([], perfil, matriz);
    const ids = resumo.map((r) => r.categoriaId);
    for (const esperado of ["obrigatorias", "1159", "1161", "trilhas_geral", "eletivas", "extensao"]) {
      expect(ids, `sumiu a categoria ${esperado}`).toContain(esperado);
    }
    expect(ids.indexOf("obrigatorias")).toBeLessThan(ids.indexOf("1159"));
    expect(ids.indexOf("1161")).toBeLessThan(ids.indexOf("trilhas_geral"));
  });
});
