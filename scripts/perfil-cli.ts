// Gera o PerfilAluno em JSON a partir de um Histórico Escolar em PDF (uso local).
// O resultado contém dados pessoais — NUNCA commitar a saída.
//
// Uso: npx tsx scripts/perfil-cli.ts "caminho/historico.pdf" saida.json
import { readFileSync, writeFileSync } from "node:fs";
import { extrairLinhas } from "../src/domain/historico/extrair-linhas";
import { parseHistorico } from "../src/domain/historico/parser";

const [arquivo, saida] = process.argv.slice(2);
if (!arquivo || !saida) {
  console.error('uso: npx tsx scripts/perfil-cli.ts "historico.pdf" saida.json');
  process.exit(1);
}
const buf = readFileSync(arquivo);
const linhas = await extrairLinhas(
  buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
);
const perfil = parseHistorico(linhas.map((l) => l.texto));
writeFileSync(saida, JSON.stringify({ ...perfil, aprovadas: [...perfil.aprovadas] }), {
  encoding: "utf-8",
});
console.error(`perfil salvo em ${saida} (${perfil.cursadas.length} cursadas)`);
