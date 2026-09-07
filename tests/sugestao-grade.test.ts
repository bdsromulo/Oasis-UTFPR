import { describe, expect, it } from "vitest";
import { BSI, ENG_COMP, ENG_COMP_962, ENG_ELETRONICA } from "../src/domain/dadosCurso";
import { gerarSugestaoGrade } from "../src/domain/motor/grade-magica";
import { haveriaConflito, itensDaSelecao } from "../src/domain/motor/grade";
import { criarMapaIdentidade } from "../src/domain/motor/identidade";
import { indiceDoSlot, PRIMEIRO_SLOT, ULTIMO_SLOT } from "../src/domain/horarios";

/**
 * Contrato da Grade Inteligente, igual para todo curso servido.
 *
 * A sugestão só vale se a grade conseguir montar o que ela devolveu. O que
 * quebrava isso: `buscarOfertaParaPlanejamento` casa a disciplina por
 * equivalência, então a turma pode existir na oferta sob OUTRO código — em Eng.
 * Comp. 844, EEC21, CSR41, CSR42 e EEF31. Gravando o código da matriz em vez do
 * código da oferta, `itensDaSelecao` não achava a disciplina e ela sumia: a
 * sugestão devolvia seis matérias e a grade montava duas.
 *
 * Roda sem perfil, então não depende de histórico pessoal e vale em CI.
 */
const cursos = [BSI, ENG_COMP, ENG_COMP_962, ENG_ELETRONICA];
const OPCOES = {
  estrategia: "adiantar_maximo" as const,
  naoManha: false,
  naoTarde: false,
  naoNoite: false,
};

describe("Grade Inteligente em todos os cursos cobertos", () => {
  for (const curso of cursos) {
    describe(curso.rotuloCurto, () => {
      const oferta = curso.ofertas[curso.semestrePadrao];
      const selecao = gerarSugestaoGrade(null, curso.matriz, oferta, OPCOES);

      it("sugere alguma coisa", () => {
        expect(selecao.length).toBeGreaterThan(0);
      });

      it("toda disciplina sugerida existe na oferta sob o código emitido", () => {
        const ausentes = selecao.filter(
          (s) => !oferta.disciplinas.some((d) => d.codigo === s.codDisciplina),
        );
        expect(ausentes.map((a) => `${a.codDisciplina}/${a.codTurma}`)).toEqual([]);
        // e a grade monta a seleção inteira, sem perder item pelo caminho
        expect(itensDaSelecao(oferta, selecao)).toHaveLength(selecao.length);
      });

      it("não devolve grade com choque nem matéria repetida", () => {
        const mapa = criarMapaIdentidade(curso.matriz);
        const canonicos = new Set<string>();
        for (let i = 0; i < selecao.length; i++) {
          const d = oferta.disciplinas.find((x) => x.codigo === selecao[i].codDisciplina)!;
          const t = d.turmas.find((x) => x.codigo === selecao[i].codTurma)!;
          expect(
            haveriaConflito(itensDaSelecao(oferta, selecao.slice(0, i)), d, t),
            `${selecao[i].codDisciplina}/${selecao[i].codTurma}`,
          ).toBe(false);

          const canon = mapa.resolver(selecao[i].codDisciplina);
          expect(canonicos.has(canon), `${canon} sugerida duas vezes`).toBe(false);
          canonicos.add(canon);
        }
      });

      it("respeita o pedido de evitar um turno inteiro", () => {
        const semManha = gerarSugestaoGrade(null, curso.matriz, oferta, {
          ...OPCOES,
          naoManha: true,
        });
        const naManha = itensDaSelecao(oferta, semManha).filter((i) =>
          i.turma.horarios.some((h) => h.turno === "M"),
        );
        expect(naManha.map((i) => i.disciplina.codigo)).toEqual([]);
      });
    });
  }
});

/**
 * TASK-46 — janela de aulas.
 *
 * Os checkboxes de turno são grossos demais: quem não consegue chegar antes das
 * 13h50 não tem como pedir "tarde a partir de T2". A janela recorta a régua
 * contínua M1→N5, e compõe com os turnos em vez de substituí-los.
 */
describe("janela de aulas", () => {
  for (const curso of cursos) {
    describe(curso.rotuloCurto, () => {
      const oferta = curso.ofertas[curso.semestrePadrao];
      const slotsDe = (selecao: ReturnType<typeof gerarSugestaoGrade>) =>
        itensDaSelecao(oferta, selecao).flatMap((i) =>
          i.turma.horarios.map((h) => indiceDoSlot(h.turno, h.aula)),
        );

      it("a janela cheia M1–N5 não muda nada", () => {
        const comJanela = gerarSugestaoGrade(null, curso.matriz, oferta, {
          ...OPCOES,
          aulaInicial: PRIMEIRO_SLOT,
          aulaFinal: ULTIMO_SLOT,
        });
        expect(comJanela).toEqual(gerarSugestaoGrade(null, curso.matriz, oferta, OPCOES));
      });

      it("a ausência de janela é equivalente à janela cheia", () => {
        expect(gerarSugestaoGrade(null, curso.matriz, oferta, OPCOES)).toEqual(
          gerarSugestaoGrade(null, curso.matriz, oferta, {
            ...OPCOES,
            aulaInicial: undefined,
            aulaFinal: undefined,
          }),
        );
      });

      it("nenhuma aula antes do início pedido", () => {
        const selecao = gerarSugestaoGrade(null, curso.matriz, oferta, {
          ...OPCOES,
          aulaInicial: "T2",
        });
        const minimo = indiceDoSlot("T", 2);
        for (const idx of slotsDe(selecao)) expect(idx).toBeGreaterThanOrEqual(minimo);
      });

      it("nenhuma aula depois do fim pedido", () => {
        const selecao = gerarSugestaoGrade(null, curso.matriz, oferta, {
          ...OPCOES,
          aulaFinal: "T5",
        });
        const maximo = indiceDoSlot("T", 5);
        for (const idx of slotsDe(selecao)) expect(idx).toBeLessThanOrEqual(maximo);
      });

      it("turno e janela compõem: sem tarde, e nada depois de N3", () => {
        const selecao = gerarSugestaoGrade(null, curso.matriz, oferta, {
          ...OPCOES,
          naoTarde: true,
          aulaFinal: "N3",
        });
        const limite = indiceDoSlot("N", 3);
        for (const item of itensDaSelecao(oferta, selecao)) {
          for (const h of item.turma.horarios) {
            expect(h.turno, `${item.disciplina.codigo}`).not.toBe("T");
            expect(indiceDoSlot(h.turno, h.aula)).toBeLessThanOrEqual(limite);
          }
        }
      });

      it("a turma é cortada por inteiro quando um só slot cai fora", () => {
        // meia-turma não existe: se qualquer horário viola a janela, a turma sai
        const selecao = gerarSugestaoGrade(null, curso.matriz, oferta, {
          ...OPCOES,
          aulaInicial: "T1",
          aulaFinal: "T3",
        });
        const dentro = [indiceDoSlot("T", 1), indiceDoSlot("T", 3)];
        for (const idx of slotsDe(selecao)) {
          expect(idx).toBeGreaterThanOrEqual(dentro[0]);
          expect(idx).toBeLessThanOrEqual(dentro[1]);
        }
      });

      it("janela impossível devolve grade vazia em vez de ignorar o pedido", () => {
        const selecao = gerarSugestaoGrade(null, curso.matriz, oferta, {
          ...OPCOES,
          naoManha: true,
          naoTarde: true,
          naoNoite: true,
          aulaInicial: "M1",
          aulaFinal: "M1",
        });
        expect(selecao).toEqual([]);
      });
    });
  }
});
