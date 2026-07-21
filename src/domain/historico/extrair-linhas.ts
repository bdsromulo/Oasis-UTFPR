// Extração de linhas de texto de um PDF (pdf.js), preservando a ordem visual.
// Agrupa itens por coordenada Y (com tolerância) e ordena por X — mesmo método
// dos parsers Python de tools/, portado para TypeScript.
//
// O setup do worker do pdf.js é responsabilidade de quem chama (a UI configura
// GlobalWorkerOptions; os testes em Node usam o build legacy com fake worker).
import * as pdfjs from "pdfjs-dist";

export interface LinhaPdf {
  pagina: number;
  texto: string;
}

interface Item {
  x: number;
  y: number;
  largura: number;
  str: string;
}

/**
 * Espaço horizontal, em pontos, a partir do qual dois trechos de texto contíguos
 * são considerados palavras separadas.
 *
 * Juntar tudo com espaço quebra PDFs que emitem o acento como item próprio: o
 * Histórico Escolar de Eng. de Computação sai como "Disciplinas Obrigat ó rias",
 * e nenhum rótulo de seção casa. Os de BSI não têm o problema porque gravam a
 * letra acentuada num item só — por isso o defeito passou despercebido.
 */
const LACUNA_DE_ESPACO = 0.6;

/** Junta os trechos de uma linha, inserindo espaço só onde havia lacuna. */
function juntarTrechos(itens: Item[]): string {
  let texto = "";
  let fimAnterior: number | null = null;
  for (const item of itens) {
    if (fimAnterior !== null && item.x - fimAnterior > LACUNA_DE_ESPACO) texto += " ";
    texto += item.str;
    fimAnterior = item.x + item.largura;
  }
  return texto.replace(/\s+/g, " ").trim();
}

export async function extrairLinhas(dados: ArrayBuffer): Promise<LinhaPdf[]> {
  const doc = await pdfjs.getDocument({ data: dados }).promise;
  const linhas: LinhaPdf[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const conteudo = await page.getTextContent();
    const itens: Item[] = [];
    for (const it of conteudo.items) {
      if (!("str" in it) || !it.str.trim()) continue;
      itens.push({
        x: it.transform[4],
        y: it.transform[5],
        largura: "width" in it && typeof it.width === "number" ? it.width : 0,
        str: it.str,
      });
    }
    // agrupa por y (tolerância 2.5pt), topo da página primeiro
    itens.sort((a, b) => b.y - a.y || a.x - b.x);
    let atual: Item[] = [];
    const fecha = () => {
      if (!atual.length) return;
      atual.sort((a, b) => a.x - b.x);
      linhas.push({ pagina: p, texto: juntarTrechos(atual) });
      atual = [];
    };
    for (const it of itens) {
      if (atual.length && Math.abs(atual[atual.length - 1].y - it.y) > 2.5) fecha();
      atual.push(it);
    }
    fecha();
  }
  await doc.destroy();
  return linhas;
}
