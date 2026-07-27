import { describe, expect, it } from "vitest";
import { BSI, ENG_COMP, ENG_COMP_962, ENG_ELETRONICA } from "../src/domain/dadosCurso";
import { gerarSugestaoGrade } from "../src/domain/motor/grade-magica";
import { haveriaConflito, itensDaSelecao } from "../src/domain/motor/grade";
import { criarMapaIdentidade } from "../src/domain/motor/identidade";

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
