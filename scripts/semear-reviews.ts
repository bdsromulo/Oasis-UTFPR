// Semeia `data/reviews.json` com avaliações FICTÍCIAS, para inspecionar o caminho
// de leitura antes de a planilha existir (Estrategia.md §6, "Fase 1").
//
// NÃO COMMITAR A SAÍDA. Para desfazer:  git checkout -- data/reviews.json
//
// Os autores são fictícios, mas as unidades docentes e os códigos de disciplina
// são REAIS, tirados das ofertas versionadas — do contrário a consulta não acharia
// nada ao clicar num professor de verdade no planejamento, e a semente não serviria
// para testemunhar o fluxo.
//
// Uso: npx tsx scripts/semear-reviews.ts
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { construirRoster } from "../src/domain/reviews/professores";
import { BSI } from "../src/domain/dadosCurso";
import type { Review, Estrelas, SistemaAvaliativo } from "../src/domain/reviews/tipos";

const AUTORES = [
  "Ana Fictícia Pereira", "Bruno Fictício Almeida", "Carla Fictícia Nunes",
  "Diego Fictício Ramos", "Elisa Fictícia Tavares", "Felipe Fictício Moraes",
  "Gabriela Fictícia Lopes", "Henrique Fictício Duarte",
];

const COMENTARIOS = [
  "Matéria puxada, mas a explicação em aula dá conta. Faça as listas.",
  "As provas cobram exatamente o que foi visto. Só não deixe para estudar na véspera.",
  "Bastante trabalho em grupo. Se organize com o grupo cedo.",
  "Aula bem estruturada; os slides sozinhos já ajudam bastante.",
  "Correção demorou, mas a devolutiva veio detalhada.",
  "Consegui tirar dúvida por e-mail sem problema nenhum.",
  "Ritmo rápido no começo do semestre, depois estabiliza.",
];

const SEMESTRES = ["2024/2", "2025/1", "2025/2", "2026/1"];
const SISTEMAS: SistemaAvaliativo[] = ["provas", "trabalhos", "misto"];

/** Gerador determinístico: rodar duas vezes dá a mesma semente. */
function baralho(semente: number) {
  let estado = semente;
  return () => {
    estado = (estado * 1103515245 + 12345) % 2147483648;
    return estado / 2147483648;
  };
}

const roster = construirRoster([BSI]);
// unidades com disciplina conhecida, para o clique no planejamento cair em algo
const alvos = roster.unidades.filter((u) => u.disciplinas.length > 0).slice(0, 12);
if (!alvos.length) {
  console.error("nenhuma unidade docente encontrada nas ofertas — nada a semear.");
  process.exit(1);
}

const aleatorio = baralho(42);
const reviews: Review[] = [];

alvos.forEach((unidade, i) => {
  // varia o volume de propósito: algumas unidades ficam ABAIXO do limiar de 3,
  // para dar de cara com o estado "poucas avaliações, sem média" também
  const quantas = [1, 2, 3, 4, 5][i % 5];
  const codigo = unidade.disciplinas[0];

  for (let n = 0; n < quantas; n++) {
    const nota = () => (1 + Math.floor(aleatorio() * 5)) as Estrelas;
    const autor = AUTORES[Math.floor(aleatorio() * AUTORES.length)];
    const semestre = SEMESTRES[Math.floor(aleatorio() * SEMESTRES.length)];

    reviews.push({
      id: createHash("sha256").update(`${unidade.id}|${codigo}|${n}`).digest("hex").slice(0, 12),
      professorId: unidade.id,
      codigo,
      semestre,
      autor,
      personalidade: nota(),
      didatica: nota(),
      dificuldade: nota(),
      cargaTrabalho: nota(),
      avaliacao: SISTEMAS[Math.floor(aleatorio() * SISTEMAS.length)],
      comentario: COMENTARIOS[Math.floor(aleatorio() * COMENTARIOS.length)],
    });
  }
});

reviews.sort((a, b) => a.id.localeCompare(b.id));

writeFileSync(
  "data/reviews.json",
  JSON.stringify(
    {
      fonte: "SEMENTE LOCAL — dados fictícios para inspeção. NÃO COMMITAR.",
      geradoEm: new Date().toISOString(),
      reviews,
    },
    null,
    2,
  ) + "\n",
  "utf-8",
);

console.log(`${reviews.length} avaliações fictícias em ${alvos.length} unidades docentes.`);
console.log("\nUnidades semeadas (clique numa destas no Planejamento de Matrícula):");
alvos.forEach((u, i) => {
  const n = [1, 2, 3, 4, 5][i % 5];
  console.log(`  ${u.disciplinas[0].padEnd(8)} ${u.nome}  (${n} avaliação${n > 1 ? "ões" : ""}${n < 3 ? " — abaixo do limiar" : ""})`);
});
console.log("\nPara desfazer:  git checkout -- data/reviews.json");
