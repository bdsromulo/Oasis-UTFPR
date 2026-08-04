// Ingestão semanal das avaliações da comunidade (Estrategia.md §6.6).
//
// Lê o CSV da aba `Homologado` — que já contém SÓ linhas aprovadas e SÓ colunas
// públicas —, valida cada linha contra a matriz, a oferta e o vocabulário, e
// REGENERA `data/reviews.json` por inteiro.
//
// Regeneração total, nunca append: com `id` estável por linha, o JSON é função
// pura das linhas aprovadas. Rodar duas vezes dá o mesmo resultado, e desaprovar
// uma linha na planilha a remove da publicação seguinte. Mesma disciplina dos
// parsers de `tools/`.
//
// Escrito em TypeScript, e não em Python como o resto de `tools/`, por um motivo
// de correção: o vocabulário de tags, os limites e o tipo `Review` moram no
// domínio TS. Reimplementá-los em Python criaria duas fontes da verdade que
// divergiriam em silêncio — exatamente o que o validador existe para impedir.
//
// Uso:
//   npx tsx scripts/ingerir-reviews.ts <url-do-csv>
//   URL_CSV_REVIEWS=<url> npx tsx scripts/ingerir-reviews.ts
import { createHash } from "node:crypto";
import { writeFileSync, readFileSync } from "node:fs";
import {
  LIMITE_COMENTARIO,
  MAX_AVALIACOES_NO_SEMESTRE,
  type Review,
  type SistemaAvaliativo,
} from "../src/domain/reviews/tipos";
import {
  construirRoster,
  idDaUnidade,
  type Roster,
} from "../src/domain/reviews/professores";
import { CURSOS } from "../src/domain/dadosCurso";

const CAMINHO_SAIDA = "data/reviews.json";

/** Padrões que não podem chegar ao acervo público, mesmo aprovados na planilha. */
const PII: { re: RegExp; rotulo: string }[] = [
  { re: /\b\d{7}\b/, rotulo: "RA" },
  { re: /[\w.+-]+@[\w-]+\.[\w.]+/, rotulo: "e-mail" },
  { re: /\(?\d{2}\)?\s*9?\d{4}[-\s]?\d{4}/, rotulo: "telefone" },
];

/**
 * Parser de CSV conforme RFC 4180.
 *
 * Escrito à mão de propósito: o campo de comentário é texto livre e pode conter
 * vírgula, aspas e quebra de linha. Um `split(",")` corromperia essas linhas em
 * silêncio, que é justamente a classe de erro que este pipeline não pode ter.
 */
export function parseCsv(texto: string): string[][] {
  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let dentroDeAspas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (dentroDeAspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') { campo += '"'; i++; }
        else dentroDeAspas = false;
      } else campo += c;
      continue;
    }
    if (c === '"') { dentroDeAspas = true; continue; }
    if (c === ",") { linha.push(campo); campo = ""; continue; }
    if (c === "\r") continue;
    if (c === "\n") { linha.push(campo); linhas.push(linha); linha = []; campo = ""; continue; }
    campo += c;
  }
  if (campo.length || linha.length) { linha.push(campo); linhas.push(linha); }
  return linhas.filter((l) => l.some((v) => v.trim() !== ""));
}

/** Identidade estável da avaliação: mesma linha, mesmo id, em qualquer execução. */
function idDaLinha(campos: Record<string, string>): string {
  const semente = [
    campos.carimbo, campos.autor, campos.codigo, campos.semestre, campos.professor,
  ].join("|");
  return createHash("sha256").update(semente).digest("hex").slice(0, 12);
}

/** Rótulos da pergunta de sistema avaliativo → o valor do domínio. */
const SISTEMAS: Record<string, SistemaAvaliativo> = {
  "provas": "provas",
  "trabalhos": "trabalhos",
  "provas e trabalhos": "misto",
};

export function resolverSistemaAvaliativo(rotulo: string): SistemaAvaliativo | null {
  return SISTEMAS[rotulo.trim().toLowerCase()] ?? null;
}

/**
 * Nome digitado ou pré-preenchido → id da unidade docente.
 *
 * O formulário carrega NOME, não slug: o campo é lido por gente, e um id opaco no
 * meio dele seria ruído para quem responde e convite a erro para quem edita. A
 * tradução mora aqui, contra o mesmo roster que a validação usa.
 *
 * `null` não é erro — é a rota "Professor Não Ofertado", e a linha fica pendente
 * até que o nome seja promovido ao roster.
 */
export function resolverProfessor(nome: string, roster: Roster): string | null {
  const partes = nome.split("/").map((p) => p.trim()).filter(Boolean);
  if (!partes.length) return null;
  const id = idDaUnidade(partes);
  return id && roster.porId(id) ? id : null;
}

export interface ResultadoIngestao {
  reviews: Review[];
  erros: string[];
  ignoradas: number;
}

export function validarEConverter(tabela: string[][]): ResultadoIngestao {
  const erros: string[] = [];
  if (!tabela.length) return { reviews: [], erros: ["CSV vazio ou inacessível."], ignoradas: 0 };

  const cabecalho = tabela[0].map((c) => c.trim());
  const obrigatorias = [
    "carimbo", "autor", "codigo", "semestre", "professor",
    "personalidade", "didatica", "dificuldade", "cargaTrabalho", "avaliacao", "comentario",
  ];
  for (const col of obrigatorias) {
    if (!cabecalho.includes(col)) erros.push(`Coluna obrigatória ausente no CSV: "${col}".`);
  }
  // colunas que JAMAIS podem aparecer: a projeção da aba Homologado não as inclui,
  // e se aparecerem é porque a fórmula foi alterada e está vazando dado privado
  for (const proibida of ["ra", "identidade"]) {
    if (cabecalho.includes(proibida)) {
      erros.push(`Coluna privada "${proibida}" presente no CSV público — corrija a projeção da aba Homologado.`);
    }
  }
  if (erros.length) return { reviews: [], erros, ignoradas: 0 };

  const roster = construirRoster(CURSOS);
  const codigosConhecidos = new Set<string>();
  for (const curso of CURSOS) {
    for (const d of curso.matriz.disciplinas) codigosConhecidos.add(d.codigo);
    for (const oferta of Object.values(curso.ofertas)) {
      for (const d of oferta.disciplinas) codigosConhecidos.add(d.codigo);
    }
  }

  const reviews: Review[] = [];
  const vistos = new Set<string>();
  let ignoradas = 0;

  for (let i = 1; i < tabela.length; i++) {
    const campos: Record<string, string> = {};
    cabecalho.forEach((col, j) => (campos[col] = (tabela[i][j] ?? "").trim()));
    const onde = `linha ${i + 1}`;
    const problemas: string[] = [];

    // ---- coerência com o dado oficial (o que o Apps Script não consegue checar)
    if (!codigosConhecidos.has(campos.codigo)) {
      problemas.push(`código "${campos.codigo}" não existe em nenhuma matriz ou oferta`);
    }
    const professorId = resolverProfessor(campos.professor ?? "", roster);
    if (!professorId) {
      // rota "Professor Não Ofertado": não é erro, é linha que ainda não publica
      ignoradas++;
      continue;
    }

    // ---- forma
    if (!/^20\d{2}\/[12]$/.test(campos.semestre)) problemas.push(`semestre "${campos.semestre}" fora de AAAA/S`);
    if (!campos.autor) problemas.push("autor vazio");
    const avaliacao = resolverSistemaAvaliativo(campos.avaliacao ?? "");
    if (!avaliacao) problemas.push(`sistema avaliativo "${campos.avaliacao}" inválido`);

    const notas: Record<string, number> = {};
    for (const campo of ["personalidade", "didatica", "dificuldade", "cargaTrabalho"]) {
      const v = Number(campos[campo]);
      if (!Number.isInteger(v) || v < 1 || v > 5) problemas.push(`${campo} "${campos[campo]}" fora de 1–5`);
      else notas[campo] = v;
    }

    // detalhamento opcional: célula vazia é "não informado", e não zero
    const quantidades: Record<string, number | undefined> = {};
    for (const campo of ["qtdProvas", "qtdTrabalhos"]) {
      const bruto = campos[campo] ?? "";
      if (bruto === "") continue;
      const v = Number(bruto);
      if (!Number.isInteger(v) || v < 0 || v > MAX_AVALIACOES_NO_SEMESTRE) {
        problemas.push(`${campo} "${bruto}" fora de 0–${MAX_AVALIACOES_NO_SEMESTRE}`);
      } else {
        quantidades[campo] = v;
      }
    }

    if (campos.comentario.length > LIMITE_COMENTARIO) {
      problemas.push(`comentário com ${campos.comentario.length} caracteres (máximo ${LIMITE_COMENTARIO})`);
    }
    for (const { re, rotulo } of PII) {
      if (re.test(campos.comentario)) problemas.push(`comentário contém ${rotulo}`);
    }

    if (problemas.length) {
      erros.push(`${onde}: ${problemas.join("; ")}`);
      continue;
    }

    const id = idDaLinha(campos);
    if (vistos.has(id)) {
      // mesma pessoa, mesma disciplina, mesmo semestre e professor: a última vence
      const anterior = reviews.findIndex((r) => r.id === id);
      if (anterior >= 0) reviews.splice(anterior, 1);
    }
    vistos.add(id);

    reviews.push({
      id,
      professorId,
      codigo: campos.codigo,
      semestre: campos.semestre,
      autor: campos.autor,
      personalidade: notas.personalidade as Review["personalidade"],
      didatica: notas.didatica as Review["didatica"],
      dificuldade: notas.dificuldade as Review["dificuldade"],
      cargaTrabalho: notas.cargaTrabalho as Review["cargaTrabalho"],
      avaliacao: avaliacao!,
      ...(quantidades.qtdProvas !== undefined ? { qtdProvas: quantidades.qtdProvas } : {}),
      ...(quantidades.qtdTrabalhos !== undefined ? { qtdTrabalhos: quantidades.qtdTrabalhos } : {}),
      comentario: campos.comentario,
    });
  }

  // ordem determinística: sem isso o JSON muda de ordem a cada execução e o Action
  // commita ruído mesmo quando nada mudou de fato
  reviews.sort((a, b) => a.id.localeCompare(b.id));
  return { reviews, erros, ignoradas };
}

async function principal() {
  const url = process.argv[2] || process.env.URL_CSV_REVIEWS;
  if (!url) {
    console.error("uso: npx tsx scripts/ingerir-reviews.ts <url-do-csv-publicado>");
    process.exit(1);
  }

  const resposta = await fetch(url, { redirect: "follow" });
  if (!resposta.ok) {
    console.error(`falha ao baixar o CSV: HTTP ${resposta.status}`);
    process.exit(1);
  }
  const csv = await resposta.text();
  if (/<html/i.test(csv.slice(0, 200))) {
    console.error("a URL devolveu HTML, não CSV — a aba provavelmente não está publicada na web.");
    process.exit(1);
  }

  const { reviews, erros, ignoradas } = validarEConverter(parseCsv(csv));

  if (erros.length) {
    console.error(`\n${erros.length} erro(s) na ingestão — nada foi publicado:\n`);
    erros.forEach((e) => console.error("  - " + e));
    process.exit(1);
  }

  // preserva `geradoEm` quando o conteúdo não mudou, para o Action não commitar
  // um arquivo idêntico só porque a data avançou
  const anterior = (() => {
    try { return JSON.parse(readFileSync(CAMINHO_SAIDA, "utf-8")); } catch { return null; }
  })();
  const mudou = JSON.stringify(anterior?.reviews ?? null) !== JSON.stringify(reviews);

  const acervo = {
    fonte: "Avaliações da Comunidade — Oásis UTFPR (ver Estrategia.md §6)",
    geradoEm: mudou ? new Date().toISOString() : (anterior?.geradoEm ?? new Date().toISOString()),
    reviews,
  };
  writeFileSync(CAMINHO_SAIDA, JSON.stringify(acervo, null, 2) + "\n", "utf-8");
  console.log(
    `${reviews.length} avaliação(ões) publicada(s); ${ignoradas} pendente(s) de roster. ` +
      (mudou ? "Acervo alterado." : "Sem mudanças."),
  );
}

// só executa quando chamado direto; importar para teste não dispara a rede
if (process.argv[1]?.includes("ingerir-reviews")) await principal();
