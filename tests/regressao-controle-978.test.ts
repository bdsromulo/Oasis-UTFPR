import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matriz978Json from "../data/eng-controle/matriz-978.json";
import oferta20262Json from "../data/eng-controle/turmas/2026-2.json";
import oferta20261Json from "../data/eng-controle/turmas/2026-1.json";
import oferta20252Json from "../data/eng-controle/turmas/2025-2.json";
import {
  ENG_CONTROLE_978,
  contaNoBlocoOptativo,
  ehGrupoOpcao,
  ehTrilha,
  grupoOpcaoDe,
  trilhasDaMatriz,
} from "../src/domain/cursos";
import { dadosDoCursoPorMatriz } from "../src/domain/dadosCurso";
import { extrairLinhas } from "../src/domain/historico/extrair-linhas";
import { parseHistorico } from "../src/domain/historico/parser";
import { montarPainel } from "../src/domain/motor/situacao";
import { calcularResumoProgressoGrade } from "../src/domain/motor/progressoGrade";
import { codigosOfertados, montarBoardOpcoes } from "../src/domain/motor/fluxograma";
import { simularFormatura } from "../src/domain/motor/simuladorFormatura";
import { reviewsHabilitadasPara } from "../src/domain/reviews/config";
import type { Matriz, OfertaSemestre, PerfilAluno, ResumoConjunto } from "../src/domain/tipos";

/**
 * Rede de proteção da matriz 978 de Engenharia de Controle e Automação.
 *
 * O ponto fora da curva é o desenho das optativas: são cinco exigências de
 * 135h, uma por trilha, e não "escolha N trilhas". A quinta exigência agrega
 * quatro subáreas. Os testes impedem tanto a duplicação dos filhos quanto a
 * perda do crédito deles para o conjunto-pai.
 */
const matriz = matriz978Json as unknown as Matriz;
const oferta20262 = oferta20262Json as unknown as OfertaSemestre;
const ofertas = [
  oferta20262,
  oferta20261Json as unknown as OfertaSemestre,
  oferta20252Json as unknown as OfertaSemestre,
];

function resumo(
  conjunto: string,
  nome: string,
  exigido: number,
  cursado: number,
  validado = 0,
): ResumoConjunto {
  return {
    conjunto,
    nome,
    chObrigatoria: exigido,
    chCursadaAprovada: cursado,
    chFaltante: Math.max(0, exigido - validado),
    chValidada: validado,
  };
}

function perfil978(): PerfilAluno {
  return {
    nome: "ALUNO FICTÍCIO",
    matricula: "0000000",
    curso: "252 - Eng Controle e Automação",
    matriz: 978,
    periodo: 6,
    coefAbsoluto: 0.8,
    coefNormalizado: 0.7,
    ingresso: "1/2023",
    cursadas: [],
    aprovadas: new Set<string>(),
    matriculadas: [],
    obrigatoriasFaltantes: [],
    dependencias: [],
    resumoConjuntos: [
      resumo("1136", "Trilha De Ciências Hum Ling Letras Artes", 135, 165, 135),
      resumo("1137", "Trilha Empregabilidade E Empreendedor", 135, 75),
      resumo("1138", "Trilha De Modelagem E Controle", 135, 0),
      resumo("1139", "Trilha De Automação E Sistemas", 135, 0),
      resumo("1140", "Trilha De Formação Complementar", 135, 0),
    ],
    eletivas: null,
    extensao: { chTotal: 420, chCursada: 195, chFaltante: 225 },
    resumoGeral: {
      obrigatorias: { total: 3525, cursada: 2700, aprovada: 2400, faltante: 1125, aprovadaTotal: 2400 },
      optativas: { total: 675, cursada: 240, aprovada: 135, faltante: 540, aprovadaTotal: 240 },
      eletivas: { total: 0, aprovada: 0, faltante: 0 },
    },
    avisos: [],
  };
}

describe("matriz 978 — integridade da fonte", () => {
  it("preserva os totais declarados no PPC", () => {
    expect(matriz.matriz).toBe(978);
    expect(matriz.campus).toBe("Curitiba");
    expect(matriz.disciplinas).toHaveLength(173);
    expect(matriz.cargas).toMatchObject({
      obrigatorias: 3525,
      optativas: 675,
      extensao: 420,
      eletiva: 0,
      ch_total_ppc: 4200,
    });
    expect(
      matriz.disciplinas
        .filter((d) => d.conjunto === null)
        .reduce((total, d) => total + d.horas.total, 0),
    ).toBe(3525);
  });

  it("declara cinco trilhas de topo e quatro subáreas somente sob a 1140", () => {
    const topo = Object.entries(matriz.conjuntos).filter(([, c]) => c.pai == null);
    expect(topo.map(([codigo]) => codigo)).toEqual(["1136", "1137", "1138", "1139", "1140"]);
    expect(topo.reduce((total, [, c]) => total + c.ch, 0)).toBe(675);
    for (const filho of ["1146", "1147", "1148", "1149"]) {
      expect(String(matriz.conjuntos[filho].pai)).toBe("1140");
    }
  });

  it("não deixa código, conjunto ou pré-requisito órfão", () => {
    const codigos = new Set(matriz.disciplinas.map((d) => d.codigo));
    expect(codigos.size).toBe(matriz.disciplinas.length);
    for (const d of matriz.disciplinas) {
      if (d.conjunto !== null) expect(matriz.conjuntos[String(d.conjunto)]).toBeDefined();
      for (const requisito of d.prerequisitos) {
        if (!requisito.startsWith("Período:")) expect(codigos.has(requisito), `${d.codigo} → ${requisito}`).toBe(true);
      }
      if (!d.codigo.startsWith("ENADE")) expect(d.horas.total, d.codigo).toBeGreaterThan(0);
    }
  });

  it("preserva o estágio oficial de 360h", () => {
    const estagio = matriz.disciplinas.find((d) => d.codigo === "ELT78C");
    expect(estagio).toMatchObject({ nome: "Estágio Curricular Obrigatório", modelo: "Estágio" });
    expect(estagio?.horas.total).toBe(360);
    expect(ENG_CONTROLE_978.estagios).toEqual([
      { codigo: "ELT78C", rotulo: "Estágio Curricular Obrigatório", ch: 360 },
    ]);
  });
});

describe("descrição e motores da matriz 978", () => {
  it("liga a matriz às ofertas próprias e habilita avaliações", () => {
    const curso = dadosDoCursoPorMatriz(978);
    expect(curso?.id).toBe("eng-controle-978");
    expect(Object.keys(curso?.ofertas ?? {})).toEqual(["2026-2", "2026-1", "2025-2"]);
    expect(reviewsHabilitadasPara(978)).toBe(true);
    expect(ofertas.map((o) => o.semestre)).toEqual(["2026-2", "2026-1", "2025-2"]);
  });

  it("modela as cinco trilhas como exigências, não como trilhas escolhíveis", () => {
    expect(trilhasDaMatriz(matriz)).toEqual([]);
    expect(ENG_CONTROLE_978.gruposOpcao).toEqual([1136, 1137, 1138, 1139, 1140]);
    expect(ehTrilha(ENG_CONTROLE_978, 1136)).toBe(false);
    expect(ehGrupoOpcao(ENG_CONTROLE_978, 1136)).toBe(true);
    expect(contaNoBlocoOptativo(ENG_CONTROLE_978, 1136)).toBe(false);
  });

  it("faz o crédito das quatro subáreas subir para a trilha 1140", () => {
    for (const filho of [1146, 1147, 1148, 1149]) {
      expect(grupoOpcaoDe(ENG_CONTROLE_978, filho)).toBe(1140);
      expect(ehGrupoOpcao(ENG_CONTROLE_978, filho)).toBe(true);
    }
  });

  it("monta o painel com 675h distribuídas nas cinco trilhas", () => {
    const painel = montarPainel(perfil978(), matriz);
    expect(painel.inconsistencias).toEqual([]);
    expect(painel.blocoOptativo).toBeNull();
    expect(painel.trilhas).toEqual([]);
    expect(painel.opcoes).toMatchObject({ exigido: 675, cumprido: 210, gruposCumpridos: 1 });
    expect(painel.extensao).toEqual({ exigido: 420, cumprido: 195 });
  });

  it("credita uma disciplina de subárea no resumo da quinta trilha", () => {
    const disciplina = matriz.disciplinas.find((d) => d.codigo === "ELT7CA")!;
    expect(String(disciplina.conjunto)).toBe("1146");
    const linhas = calcularResumoProgressoGrade(
      [{ disciplina: { codigo: disciplina.codigo, nome: disciplina.nome, turmas: [] } as any, turma: {} as any }],
      perfil978(),
      matriz,
    );
    expect(linhas.find((l) => l.categoriaId === "1140")?.impulsoGrade).toBe(disciplina.horas.total);
    expect(linhas.find((l) => l.categoriaId === "trilhas_geral")).toBeUndefined();
  });

  it("exibe as cinco trilhas no board de opções sem duplicar as subáreas", () => {
    const abertos = codigosOfertados(matriz, [oferta20262]);
    const board = montarBoardOpcoes(matriz, abertos);
    expect(board.faixas.map((f) => f.id).sort()).toEqual(["1136", "1137", "1138", "1139", "1140"]);
    expect(board.nos.filter((n) => !n.externo).length).toBeGreaterThan(20);
  });

  it("simula o curso sem inventar um requisito agregado de trilhas", () => {
    const sim = simularFormatura(perfil978(), matriz, ofertas, {
      ritmo: 6,
      semestreInicial: "2026-2",
      horizonte: 20,
    });
    const por = (id: string) => sim.requisitos.find((r) => r.id === id);
    expect(por("obrigatorias")).toMatchObject({ exigido: 3525 });
    // O simulador parte das 240h aprovadas no Quadro Resumo. O painel limita
    // cada trilha a 135h para mostrar o fechamento de cada exigência.
    expect(por("opcoes")).toMatchObject({ exigido: 675, cumprido: 240 });
    expect(por("trilhas")).toBeUndefined();
    expect(por("eletivas")).toBeUndefined();
    expect(por("extensao")).toMatchObject({ exigido: 420, cumprido: 195 });
  });
});

describe("ofertas de Controle e Automação", () => {
  it("preserva as contagens auditadas das três ofertas", () => {
    const contagens = ofertas.map((oferta) => ({
      semestre: oferta.semestre,
      disciplinas: oferta.disciplinas.length,
      turmas: oferta.disciplinas.reduce((total, d) => total + d.turmas.length, 0),
      horarios: oferta.disciplinas.reduce(
        (total, d) => total + d.turmas.reduce((subtotal, t) => subtotal + t.horarios.length, 0),
        0,
      ),
    }));
    expect(contagens).toEqual([
      { semestre: "2026-2", disciplinas: 147, turmas: 410, horarios: 1371 },
      { semestre: "2026-1", disciplinas: 147, turmas: 417, horarios: 1384 },
      { semestre: "2025-2", disciplinas: 150, turmas: 411, horarios: 1364 },
    ]);
  });
});

/** Auditoria opt-in: os históricos pessoais permanecem fora do repositório. */
const PASTA_REFERENCIA =
  process.env.OASIS_MATERIAL_CONTROLE_978 ?? "materiais-referencia/Eng-Controle-978";
const HISTORICOS = existsSync(PASTA_REFERENCIA)
  ? readdirSync(PASTA_REFERENCIA)
      .filter((nome) => /^Histórico do Aluno.*\.pdf$/i.test(nome))
      .map((nome) => join(PASTA_REFERENCIA, nome))
  : [];

describe.skipIf(HISTORICOS.length === 0)("histórico real da matriz 978", () => {
  it("encontra ao menos um PDF textual e reproduz o Quadro Resumo", async () => {
    const perfis: PerfilAluno[] = [];
    for (const caminho of HISTORICOS) {
      const arquivo = readFileSync(caminho);
      const linhas = await extrairLinhas(
        arquivo.buffer.slice(arquivo.byteOffset, arquivo.byteOffset + arquivo.byteLength) as ArrayBuffer,
      );
      const perfil = parseHistorico(linhas.map((linha) => linha.texto));
      if (perfil.matriz === 978 && perfil.cursadas.length > 0) perfis.push(perfil);
    }
    expect(perfis.length).toBeGreaterThan(0);
    const perfil = perfis[0];
    expect(perfil.avisos).toEqual([]);
    expect(perfil.resumoGeral?.obrigatorias).toMatchObject({
      total: 3525, cursada: 2700, aprovada: 2400, faltante: 1125,
    });
    expect(perfil.resumoGeral?.optativas).toMatchObject({
      total: 675, cursada: 240, aprovada: 135, faltante: 540, aprovadaTotal: 240,
    });
    expect(perfil.extensao).toEqual({ chTotal: 420, chCursada: 195, chFaltante: 225 });
    expect(perfil.obrigatoriasFaltantes).toHaveLength(14);
  });
});
