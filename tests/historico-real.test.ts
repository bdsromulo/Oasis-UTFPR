// Valida o parser de histórico contra PDFs REAIS que ficam FORA do repositório
// (dados pessoais). Quando os arquivos não existem (CI, outra máquina), os testes
// são pulados — a fixture sintética em historico-sintetico.test.ts roda sempre.
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { extrairLinhas } from "../src/domain/historico/extrair-linhas";
import { parseHistorico } from "../src/domain/historico/parser";
import { montarPainel } from "../src/domain/motor/situacao";
import { listarElegiveis, cumpre } from "../src/domain/motor/elegiveis";
import { nomeDeEletiva } from "../src/domain/eletivas";
import type { Matriz, OfertaSemestre } from "../src/domain/tipos";
import matrizJson from "../data/matriz-981.json";
import turmasJson from "../data/turmas/2026-1.json";

const matriz = matrizJson as unknown as Matriz;
const oferta = turmasJson as unknown as OfertaSemestre;

const PASTA = "I:\\Meu Drive\\Oásis UTFPR\\";
const CASOS = [
  { arquivo: PASTA + "Histórico Completo.pdf", nomeContem: "ROMULO" },
  { arquivo: PASTA + "namie.pdf", nomeContem: "NAMIE" },
  { arquivo: PASTA + "historico2026-1.pdf", nomeContem: "YAGO" },
];

async function carregar(arquivo: string) {
  const buf = readFileSync(arquivo);
  const linhas = await extrairLinhas(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
  );
  return parseHistorico(linhas.map((l) => l.texto));
}

for (const caso of CASOS) {
  describe.skipIf(!existsSync(caso.arquivo))(`histórico real: ${caso.nomeContem}`, () => {
    it("parse completo com invariantes do curso", async () => {
      const perfil = await carregar(caso.arquivo);

      // cabeçalho
      expect(perfil.nome).toContain(caso.nomeContem);
      expect(perfil.matriz).toBe(981);
      expect(perfil.periodo).toBeGreaterThanOrEqual(1);
      expect(perfil.coefAbsoluto).toBeGreaterThan(0);

      // resumos consolidados presentes
      expect(perfil.resumoConjuntos.length).toBeGreaterThanOrEqual(14);
      expect(perfil.eletivas).not.toBeNull();
      expect(perfil.extensao?.chTotal).toBe(330);
      expect(perfil.resumoGeral?.obrigatorias.total).toBe(2005);

      // INVARIANTE FORTE: toda obrigatória da matriz (exceto ENADE) ou é cumprida
      // (aprovada/equivalente) ou consta na lista de faltantes do próprio histórico
      const faltantes = new Set(perfil.obrigatoriasFaltantes.map((f) => f.codigo));
      const problemas: string[] = [];
      for (const d of matriz.disciplinas) {
        if (d.conjunto !== null || d.codigo.startsWith("ENADE")) continue;
        const ok = cumpre(d.codigo, perfil, matriz);
        const listada = faltantes.has(d.codigo);
        if (ok === listada) {
          problemas.push(`${d.codigo}: cumprida=${ok} listadaComoFaltante=${listada}`);
        }
      }
      expect(problemas, problemas.join("; ")).toEqual([]);

      // parser não pode ter engolido anomalias em silêncio
      expect(perfil.avisos, perfil.avisos.join("; ")).toEqual([]);

      // painel e elegíveis não explodem e fazem sentido
      const painel = montarPainel(perfil, matriz);
      expect(painel.inconsistencias).toEqual([]);
      expect(painel.trilhas.length).toBe(12);
      const elegiveis = listarElegiveis(perfil, matriz, oferta);
      expect(elegiveis.length).toBeGreaterThan(0);
      // nenhuma elegível pode já estar cumprida
      for (const e of elegiveis) {
        expect(cumpre(e.disciplina.codigo, perfil, matriz)).toBe(false);
      }
    });
  });
}

describe.skipIf(!existsSync(CASOS[0].arquivo))("fatos específicos: Rômulo", () => {
  it("reprovações recuperadas contam como aprovadas; faltantes batem", async () => {
    const perfil = await carregar(CASOS[0].arquivo);
    // ICSA30 e ICSB56: reprovado e depois aprovado
    expect(perfil.aprovadas.has("ICSA30")).toBe(true);
    expect(perfil.aprovadas.has("ICSB56")).toBe(true);
    expect(perfil.cursadas.filter((c) => c.codigo === "ICSA30").length).toBe(2);
    // faltantes conhecidas do histórico
    expect(new Set(perfil.obrigatoriasFaltantes.map((f) => f.codigo))).toEqual(
      new Set(["ICSS30", "ICSX30", "ICSX40", "ICSX41"]),
    );
    // trilha Banco de Dados validada (90h) e eletivas fechadas
    const bd = perfil.resumoConjuntos.find((r) => r.conjunto === "1165");
    expect(bd?.chValidada).toBe(90);
    expect(perfil.eletivas?.chFaltante).toBe(0);
    expect(perfil.extensao?.chFaltante).toBe(270);
  });

  it("eletivas fora da matriz entram individualmente, sem virar carga", async () => {
    const perfil = await carregar(CASOS[0].arquivo);
    const eletivas = perfil.cursadas.filter((c) => c.origem === "eletiva");
    expect(eletivas.map((c) => c.codigo).sort()).toEqual(["EEX11", "FI71S", "FI72N", "MA72A"]);
    // nome quebrado em 4 pedaços no PDF: o código é o que importa, a pool resolve o nome
    expect(nomeDeEletiva("EEX11")).toContain("Laboratório");
    expect(eletivas.find((c) => c.codigo === "EEX11")).toMatchObject({ cht: 45, media: 8.9 });
    // as 4 somam 195h, mas o teto da matriz é 105h: a carga vem do Resumo, não da soma
    expect(eletivas.reduce((s, c) => s + (c.cht ?? 0), 0)).toBe(195);
    expect(perfil.eletivas?.chValidada).toBe(105);
    expect(perfil.resumoGeral?.eletivas.aprovada).toBe(105);
  });
});

describe.skipIf(!existsSync(CASOS[1].arquivo))("fatos específicos: Namie", () => {
  it("equivalência aplicada e dependência detectadas", async () => {
    const perfil = await carregar(CASOS[1].arquivo);
    // EST70C consignada via equivalente EST70A
    expect(cumpre("EST70C", perfil, matriz)).toBe(true);
    // ICSD20 aprovada (o ENADE vizinho dizia "Dispensado" e não pode contaminar)
    expect(perfil.cursadas.find((c) => c.codigo === "ICSD20")?.situacao).toBe("aprovado");
    // dependência: Estágio 1
    expect(perfil.dependencias.map((d) => d.codigo)).toContain("ICSX51");
    // cancelamento seguido de aprovação (ICSG20)
    expect(perfil.aprovadas.has("ICSG20")).toBe(true);
    expect(perfil.eletivas?.chFaltante).toBe(45);
  });

  it("eletiva validada é lida; a convalidada em obrigatória fica de fora", async () => {
    const perfil = await carregar(CASOS[1].arquivo);
    const eletivas = perfil.cursadas.filter((c) => c.origem === "eletiva");
    // GEE74F é eletiva genuína (Validado=Sim) e precisa constar como cursada, não
    // apenas em `aprovadas` — era o que a fazia aparecer como não concluída
    expect(eletivas.map((c) => c.codigo)).toEqual(["GEE74F"]);
    expect(eletivas[0]).toMatchObject({ cht: 60, media: 10, ano: 2026, semestre: 1 });
    // GE71A tem Validado=Não: virou a obrigatória GEE7A1 por convalidação
    expect(eletivas.some((c) => c.codigo === "GE71A")).toBe(false);
    expect(perfil.cursadas.find((c) => c.codigo === "GEE7A1")?.situacao).toBe("consignado");
  });
});

describe.skipIf(!existsSync(CASOS[2].arquivo))("fatos específicos: Yago", () => {
  it("eletivas fechadas, consignação e dependência de estágio", async () => {
    const perfil = await carregar(CASOS[2].arquivo);
    expect(perfil.eletivas?.chFaltante).toBe(0);
    expect(perfil.eletivas?.chValidada).toBe(105);
    expect(perfil.dependencias.map((d) => d.codigo)).toContain("ICSX51");
    expect(perfil.cursadas.filter((c) => c.situacao === "consignado").length).toBe(1);
    expect(perfil.cursadas.filter((c) => c.situacao === "cancelado").length).toBe(1);
  });
});
