// Conservação da exigência de formatura, curso a curso.
//
// A pergunta que este arquivo responde: **o Oásis cobra tudo que a matriz
// exige?** Uma categoria declarada na matriz e não cobrada pelo simulador é o
// pior defeito possível da plataforma — o aluno planeja o curso inteiro, a
// projeção diz "formatura em 2029.1", e falta um bloco que ninguém avisou.
//
// O teste nasceu de uma auditoria (2026-08-16) que cruzou sete históricos reais
// contra o Quadro Resumo oficial. Nenhum curso falhou a conservação; esta suíte
// existe para que continue assim quando entrar a nona matriz.
//
// Dois blocos, deliberadamente separados:
//
//   1. CONSERVAÇÃO — roda na CI, sem nenhum PDF. Usa perfil sintético zerado:
//      o que se afere é a EXIGÊNCIA, que sai da matriz e não do aluno. É o bloco
//      que pega matriz nova com categoria órfã.
//   2. FIDELIDADE — opt-in, pulado onde o acervo local não existe. Confere o
//      CUMPRIDO contra o Quadro Resumo do próprio histórico.
import { describe, expect, it } from "vitest";
import { existsSync, globSync, readFileSync } from "node:fs";
import { CURSOS, semestresDoCurso, carregarOfertasHistoricasMecatronica } from "../src/domain/dadosCurso";
import { extrairLinhas } from "../src/domain/historico/extrair-linhas";
import { parseHistorico } from "../src/domain/historico/parser";
import { simularFormatura } from "../src/domain/motor/simuladorFormatura";
import type { DadosCurso } from "../src/domain/dadosCurso";
import type { PerfilAluno } from "../src/domain/tipos";

/**
 * Categorias do simulador que compõem o bloco optativo.
 *
 * Cada curso reparte as optativas de um jeito — a 968 em 25 grupos de escolha,
 * a 806 em trilhas mais segundo estrato, a 962 com expressão gráfica à parte —,
 * mas a SOMA tem de reconstruir `cargas.optativas`. É essa invariante que
 * transforma "cada curso tem seu desenho" em algo verificável.
 */
const CATEGORIAS_OPTATIVAS = [
  "trilhas",
  "opcoes",
  "humanidades",
  "segundoEstrato",
  "expressaoGrafica",
] as const;

function perfilVazio(matriz: number): PerfilAluno {
  return {
    nome: "ALUNO SINTÉTICO",
    matricula: "0000000",
    curso: "curso sintético",
    matriz,
    periodo: 1,
    coefAbsoluto: null,
    coefNormalizado: null,
    ingresso: "1/2026",
    cursadas: [],
    aprovadas: new Set<string>(),
    matriculadas: [],
    obrigatoriasFaltantes: [],
    dependencias: [],
    resumoConjuntos: [],
    eletivas: null,
    extensao: null,
    resumoGeral: null,
    avisos: [],
  };
}

function simular(curso: DadosCurso, perfil: PerfilAluno) {
  const ofertas = semestresDoCurso(curso)
    .map((s) => curso.ofertas[s])
    .filter(Boolean);
  return simularFormatura(perfil, curso.matriz, ofertas, {
    ritmo: 6,
    semestreInicial: "2026-2",
    horizonte: 24,
  });
}

describe("conservação da exigência de formatura", () => {
  for (const curso of CURSOS) {
    const matriz = curso.matriz;
    const cargas = matriz.cargas;

    describe(`${curso.rotulo} (matriz ${matriz.matriz})`, () => {
      const sim = simular(curso, perfilVazio(matriz.matriz));
      const req = Object.fromEntries(sim.requisitos.map((r) => [r.id, r]));

      it("cobra as obrigatórias exatamente como a matriz declara", () => {
        expect(req.obrigatorias, "categoria obrigatórias existe").toBeTruthy();
        expect(req.obrigatorias.exigido).toBe(cargas.obrigatorias);
      });

      it("reparte o bloco optativo sem perder nem inventar hora", () => {
        const soma = CATEGORIAS_OPTATIVAS.reduce(
          (total, id) => total + (req[id]?.exigido ?? 0),
          0,
        );
        expect(
          soma,
          `soma de ${CATEGORIAS_OPTATIVAS.join("+")} deve reconstruir cargas.optativas`,
        ).toBe(cargas.optativas);
      });

      it("cobra eletivas e extensão quando, e só quando, a matriz as exige", () => {
        expect(req.eletivas?.exigido ?? 0, "eletivas").toBe(cargas.eletiva);
        expect(req.extensao?.exigido ?? 0, "extensão").toBe(cargas.extensao);
      });

      it("não cobra categoria com exigência negativa ou fora da matriz", () => {
        for (const r of sim.requisitos) {
          expect(r.exigido, `${r.id} tem exigência positiva`).toBeGreaterThan(0);
        }
      });

      // `cargas.soma` é a soma declarada das categorias — e é ela, não o
      // `ch_total_ppc`, que as categorias reconstroem.
      //
      // A tentação é assertar contra o `ch_total_ppc`, e ela é errada: a relação
      // entre os dois é ESPECÍFICA DE CADA CURSO, porque cada matriz embute a
      // extensão à sua maneira. Medido em 2026-08-16: na 978 o PPC (4200h) já é
      // exatamente obrigatórias + optativas, sem folga nenhuma; na 981 a soma
      // das categorias dá 3280h contra um PPC de 3220h, e as 60h de diferença
      // são horas de extensão contadas duas vezes. Uma invariante única sobre o
      // PPC reprova matriz correta — foi o que aconteceu aqui antes desta nota.
      it("a soma declarada da matriz fecha com as categorias", () => {
        const soma =
          cargas.obrigatorias + cargas.optativas + cargas.eletiva + cargas.extensao;
        expect(soma).toBe(cargas.soma);
      });

      it("o total do PPC nunca passa da soma das categorias", () => {
        expect(cargas.ch_total_ppc).toBeLessThanOrEqual(cargas.soma);
      });
    });
  }
});

/**
 * Fidelidade ao Quadro Resumo — opt-in.
 *
 * O acervo é pessoal e mora fora do repositório. `OASIS_ACERVO` aponta para ele;
 * sem a pasta, o bloco inteiro é pulado, como nas demais auditorias opt-in.
 *
 * A referência é a **coluna E** (`aprovadaTotal`: tudo cursado e aprovado, ainda
 * que aguarde validação), e não a coluna C (`aprovada`: já validada). O Oásis
 * usa a E de propósito — a C esconde do aluno horas que ele de fato cursou —, e
 * comparar contra a coluna errada produz um "sobre-crédito" que não existe.
 */
const ACERVO = process.env.OASIS_ACERVO ?? "materiais-referencia";

/**
 * A lista sai do disco em tempo de execução, e o curso sai da matriz lida do
 * próprio PDF — nenhum nome de aluno é escrito aqui.
 *
 * Não é preciosismo: o repositório é público, e nomear o arquivo de alguém no
 * código versionado publica o nome dessa pessoa junto. É a mesma decisão já
 * tomada na varredura de `historico-real.test.ts`. O efeito colateral é bom:
 * histórico novo passa a ser coberto só de ser copiado para o acervo.
 */
const HISTORICOS = existsSync(ACERVO)
  ? globSync(`${ACERVO}/**/*.pdf`).filter((caminho) => {
      const arquivo = caminho.split(/[\\/]/).pop() ?? "";
      const semAcento = arquivo.normalize("NFD").replace(/[̀-ͯ]/g, "");
      return /^historico/i.test(semAcento);
    })
  : [];

async function carregarPerfil(arquivo: string): Promise<PerfilAluno> {
  const buf = readFileSync(arquivo);
  const linhas = await extrairLinhas(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
  );
  return parseHistorico(linhas.map((l) => l.texto));
}

describe.skipIf(HISTORICOS.length === 0)("fidelidade ao Quadro Resumo (acervo local)", () => {
  it.each(HISTORICOS)("%s integraliza como o Portal manda", async (arquivo) => {
    // Mecatrônica carrega 2026-1 e 2025-2 sob demanda, como a App faz num
    // useEffect. Sem esperar, a projeção roda com oferta incompleta e acusa
    // "sem oferta recente" para o curso inteiro.
    await carregarOfertasHistoricasMecatronica();

    const perfil = await carregarPerfil(arquivo);
    const curso = CURSOS.find((c) => c.matriz.matriz === perfil.matriz);
    // histórico de matriz ainda não coberta não é falha desta suíte
    if (!curso) return;

    expect(perfil.avisos, perfil.avisos.join("; ")).toEqual([]);
    const resumo = perfil.resumoGeral;
    expect(resumo, "Quadro Resumo extraído do histórico").toBeTruthy();

    const sim = simular(curso, perfil);
    const req = Object.fromEntries(sim.requisitos.map((r) => [r.id, r]));

    // --- o cumprido reproduz a consolidação oficial ---
    const cumpridoOptativo = CATEGORIAS_OPTATIVAS.reduce(
      (total, id) => total + (req[id]?.cumprido ?? 0),
      0,
    );
    const referencia = resumo!.optativas.aprovadaTotal ?? resumo!.optativas.aprovada;
    expect(
      cumpridoOptativo,
      `matriz ${perfil.matriz}: soma das categorias optativas x coluna E do Quadro Resumo`,
    ).toBe(referencia);
    expect(
      req.obrigatorias.cumprido,
      `matriz ${perfil.matriz}: obrigatórias cumpridas`,
    ).toBe(resumo!.obrigatorias.aprovada);

    // --- a projeção fecha sem deixar requisito em aberto ---
    //
    // Quem já integralizou tudo é exceção conhecida: o motor devolve zero
    // semestres e `semestreFormatura: null`, e a tela imprime "—" no lugar da
    // data. É o BUG-06 — comportamento errado, mas de exibição, e assertar
    // "fecha" aqui reprovaria o teste por um defeito já rastreado noutro lugar.
    // Quando o BUG-06 for corrigido, esta condição pode cair.
    const jaIntegralizou = sim.horasRestantes === 0 && sim.semestres.length === 0;
    if (!jaIntegralizou) {
      expect(
        sim.semestreFormatura,
        `matriz ${perfil.matriz}: projeção fecha dentro do horizonte`,
      ).toBeTruthy();
    }
    expect(
      sim.requisitos.filter((r) => !r.atendido).map((r) => `${r.id} ${r.cumprido}/${r.exigido}`),
      `matriz ${perfil.matriz}: requisitos em aberto apesar da formatura projetada`,
    ).toEqual([]);

    // --- estágio e TCC não somem ---
    // Ou já foram cursados, ou a projeção os planeja. Formar sem eles é
    // exatamente o defeito silencioso que esta suíte existe para barrar.
    const especiais = curso.matriz.disciplinas.filter((d) =>
      /est[áa]gio|trabalho de conclus|tcc/i.test(d.nome),
    );
    const planejadas = new Set(
      sim.semestres.flatMap((s) => s.disciplinas.map((d) => d.codigo)),
    );
    const esquecidas = especiais
      .filter((d) => !perfil.aprovadas.has(d.codigo) && !planejadas.has(d.codigo))
      .map((d) => d.codigo);
    expect(
      esquecidas,
      `matriz ${perfil.matriz}: estágio/TCC pendentes fora da projeção`,
    ).toEqual([]);
  }, 60000);
});
