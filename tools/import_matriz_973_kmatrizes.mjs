#!/usr/bin/env node
/**
 * Converte a grade 973 do K-Matrizes para o contrato JSON do Oásis.
 *
 * Esta é uma importação de apoio autorizada pelo mantenedor, não um parser do
 * Portal do Aluno. O HTML de entrada não é versionado aqui: informe o caminho
 * da página `Skill tree Mecatronica.html` e o destino do JSON.
 *
 * Uso:
 *   node tools/import_matriz_973_kmatrizes.mjs origem.html destino.json
 */
import { readFile, writeFile } from "node:fs/promises";
import vm from "node:vm";

const [, , origem, destino] = process.argv;
if (!origem || !destino) {
  console.error("Uso: node tools/import_matriz_973_kmatrizes.mjs origem.html destino.json");
  process.exit(2);
}

const html = await readFile(origem, "utf8");

function lerArray(nome) {
  const marcador = `const ${nome} = `;
  const inicio = html.indexOf(marcador);
  if (inicio < 0) throw new Error(`Array ${nome} não encontrado`);

  const abre = html.indexOf("[", inicio + marcador.length);
  let nivel = 0;
  let aspas = null;
  let escape = false;
  let fecha = -1;
  for (let i = abre; i < html.length; i += 1) {
    const caractere = html[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (aspas) {
      if (caractere === "\\") escape = true;
      else if (caractere === aspas) aspas = null;
      continue;
    }
    if (caractere === "'" || caractere === '"' || caractere === "`") {
      aspas = caractere;
    } else if (caractere === "[") {
      nivel += 1;
    } else if (caractere === "]") {
      nivel -= 1;
      if (nivel === 0) {
        fecha = i;
        break;
      }
    }
  }
  if (fecha < 0) throw new Error(`Fim do array ${nome} não encontrado`);

  // O contexto contém somente o literal selecionado, sem DOM nem acesso ao host.
  return vm.runInNewContext(`(${html.slice(abre, fecha + 1)})`, Object.create(null), {
    timeout: 1_000,
  });
}

const obrigatorias = lerArray("allNodesData");
const humanidades = lerArray("allHumanitiesData");
const optativas = lerArray("allOptionalNodesData");
const todas = [...obrigatorias, ...humanidades, ...optativas];

function conjuntoDe(no) {
  const correspondencia = no.groupId?.match(/\d+/);
  return correspondencia ? Number(correspondencia[0]) : null;
}

function modeloDe(no, conjunto) {
  if (no.id === "ELN70B") return "Estágio";
  if (no.id === "ELN70C") return "Atividades Complementares";
  if (no.id === "ELN79A" || no.id === "ELN70A") return "TCC";
  if (conjunto === 1224) return "Extensão";
  if (conjunto !== null) return "Optativa";
  return "Formação Profissional";
}

function converter(no) {
  const conjunto = conjuntoDe(no);
  const extensionista = conjunto === 1224;
  return {
    codigo: no.id,
    nome: no.name,
    periodo: no.period,
    conjunto,
    modelo: modeloDe(no, conjunto),
    aulas_semanais: {
      teoricas: no.chs,
      praticas: 0,
      total: no.chs,
      aps: 0,
      apcc: 0,
    },
    horas: {
      ad: no.cht,
      chext: extensionista ? no.cht : 0,
      chead: 0,
      total: no.cht,
    },
    prerequisitos: no.dependencies.map((codigo) =>
      codigo.replace(/^Periodo:/, "Período:"),
    ),
    equivalentes: (no.equivalents ?? []).map((equivalente) => ({
      codigo: equivalente.id,
      cht: equivalente.cht ?? null,
      grupo: null,
    })),
  };
}

const matriz = {
  matriz: 973,
  curso: "ENGENHARIA MECATRÔNICA (341)",
  campus: "Curitiba",
  fonte: "K-Matrizes — grade 973 indicada pelo mantenedor como fonte de apoio",
  fonte_url: "https://github.com/Kcaiooooo/MatrizEngEletronicaUTFPR",
  cargas: {
    obrigatorias: 3435,
    optativas: 360,
    extensao: 420,
    eletiva: 0,
    soma: 4215,
    soma_sem_ext: 3795,
    chext_disc_obrigatorias: 0,
    chext_disc_optativas: 0,
    ch_total_ppc: 3795,
  },
  conjuntos: {
    1120: {
      nome: "Trilha Formativa em Eletrônica",
      pai: null,
      periodo_inicial: 6,
      periodo_final: 10,
      ch: 120,
      ch_semanal: 8,
    },
    1121: {
      nome: "Trilha Formativa em Mecânica",
      pai: null,
      periodo_inicial: 6,
      periodo_final: 10,
      ch: 120,
      ch_semanal: 8,
    },
    1122: {
      nome: "Ciclo de Humanidades",
      pai: null,
      periodo_inicial: 4,
      periodo_final: 10,
      ch: 120,
      ch_semanal: 8,
    },
    1135: {
      nome: "Ciências Humanas",
      pai: "1122",
      periodo_inicial: 4,
      periodo_final: 10,
      ch: 30,
      ch_semanal: 2,
    },
    1222: {
      nome: "Ciclo de Humanidades — opções adicionais",
      pai: "1122",
      periodo_inicial: 4,
      periodo_final: 10,
      ch: 30,
      ch_semanal: 2,
    },
    1224: {
      nome: "Unidades Curriculares Extensionistas",
      pai: null,
      periodo_inicial: 2,
      periodo_final: 10,
      ch: 0,
      ch_semanal: null,
    },
  },
  eletiva: null,
  disciplinas: todas.map(converter),
};

await writeFile(destino, `${JSON.stringify(matriz, null, 1)}\n`, "utf8");
console.log(
  `matriz 973: ${matriz.disciplinas.length} disciplinas (${obrigatorias.length} obrigatórias, ` +
    `${humanidades.length} de humanidades e ${optativas.length} optativas/extensionistas)`,
);
