import { describe, expect, it } from "vitest";
import turmas20262 from "../data/turmas/2026-2.json";
import {
  conflitosDaAdicao,
  detectarConflitos,
  horariosUnicos,
  itensDaSelecao,
} from "../src/domain/motor/grade";
import type { OfertaSemestre, SelecaoTurma } from "../src/domain/tipos";

/**
 * Bloqueio de adição por choque, no espírito do Grade na Hora: a turma que se
 * sobrepõe a outra já escolhida não entra na grade. A regra vive no domínio para
 * os dois layouts do Planejamento usarem exatamente a mesma checagem.
 */
const oferta = turmas20262 as unknown as OfertaSemestre;

/** Primeiro par (disciplinas distintas, turmas distintas) que se choca de fato. */
function acharParQueChoca() {
  const comHorario = oferta.disciplinas
    .map((d) => ({ d, turmas: d.turmas.filter((t) => t.horarios?.length) }))
    .filter((x) => x.turmas.length > 0);

  for (let i = 0; i < comHorario.length; i++) {
    for (let j = i + 1; j < comHorario.length; j++) {
      for (const ta of comHorario[i].turmas) {
        for (const tb of comHorario[j].turmas) {
          const conflitos = detectarConflitos([
            { disciplina: comHorario[i].d, turma: ta },
            { disciplina: comHorario[j].d, turma: tb },
          ]);
          if (conflitos.some((c) => c.tipo === "choque")) {
            return { a: { d: comHorario[i].d, t: ta }, b: { d: comHorario[j].d, t: tb } };
          }
        }
      }
    }
  }
  return null;
}

describe("conflitosDaAdicao", () => {
  const par = acharParQueChoca();

  it("a oferta real tem algum par que se choca (senão o teste não prova nada)", () => {
    expect(par).not.toBeNull();
  });

  it("acusa o choque da turma que se quer adicionar", () => {
    const { a, b } = par!;
    const itensAtuais = itensDaSelecao(oferta, [{ codDisciplina: a.d.codigo, codTurma: a.t.codigo }]);
    const conflitos = conflitosDaAdicao(itensAtuais, b.d, b.t);
    expect(conflitos.length).toBeGreaterThan(0);
    expect(conflitos.some((c) => c.tipo === "choque")).toBe(true);
    // o outro lado do conflito é justamente quem já estava na grade
    for (const c of conflitos) {
      const outro = c.a.turma === b.t ? c.b : c.a;
      expect(outro.disciplina.codigo).toBe(a.d.codigo);
    }
  });

  it("devolve só os conflitos que envolvem a turma nova", () => {
    const { a, b } = par!;
    // grade já em conflito de propósito: as duas turmas que se chocam
    const itensAtuais = itensDaSelecao(oferta, [
      { codDisciplina: a.d.codigo, codTurma: a.t.codigo },
      { codDisciplina: b.d.codigo, codTurma: b.t.codigo },
    ]);
    // uma terceira turma qualquer, sem choque com as duas
    const livre = oferta.disciplinas
      .flatMap((d) => d.turmas.filter((t) => t.horarios?.length).map((t) => ({ d, t })))
      .find(
        ({ d, t }) =>
          d.codigo !== a.d.codigo &&
          d.codigo !== b.d.codigo &&
          detectarConflitos([...itensAtuais, { disciplina: d, turma: t }]).length ===
            detectarConflitos(itensAtuais).length,
      );
    if (!livre) return;
    // o conflito preexistente entre A e B não pode ser atribuído à turma nova
    expect(conflitosDaAdicao(itensAtuais, livre.d, livre.t)).toEqual([]);
  });

  it("não acusa nada quando a turma cabe na grade", () => {
    const comHorario = oferta.disciplinas
      .map((d) => ({ d, turmas: d.turmas.filter((t) => t.horarios?.length) }))
      .filter((x) => x.turmas.length > 0);
    const base = comHorario[0];
    const itensAtuais = itensDaSelecao(oferta, [
      { codDisciplina: base.d.codigo, codTurma: base.turmas[0].codigo },
    ]);
    const slotsOcupados = new Set(
      horariosUnicos(base.turmas[0]).map((h) => `${h.dia}${h.turno}${h.aula}`),
    );
    const semChoque = comHorario
      .filter((x) => x.d.codigo !== base.d.codigo)
      .flatMap((x) => x.turmas.map((t) => ({ d: x.d, t })))
      .find(({ t }) =>
        horariosUnicos(t).every((h) => !slotsOcupados.has(`${h.dia}${h.turno}${h.aula}`)),
      );
    expect(semChoque, "não achei turma livre na oferta").toBeDefined();
    const conflitos = conflitosDaAdicao(itensAtuais, semChoque!.d, semChoque!.t);
    expect(conflitos.filter((c) => c.tipo === "choque")).toEqual([]);
  });

  it("trocar de turma na mesma matéria não conflita consigo mesma", () => {
    // é o caso que a tela trata removendo a disciplina da conta antes de checar
    const comDuas = oferta.disciplinas.find(
      (d) => d.turmas.filter((t) => t.horarios?.length).length >= 2,
    )!;
    const [t1, t2] = comDuas.turmas.filter((t) => t.horarios?.length);
    const selecao: SelecaoTurma[] = [{ codDisciplina: comDuas.codigo, codTurma: t1.codigo }];
    const semADisciplina = selecao.filter((s) => s.codDisciplina !== comDuas.codigo);
    const conflitos = conflitosDaAdicao(itensDaSelecao(oferta, semADisciplina), comDuas, t2);
    expect(conflitos).toEqual([]);
  });
});
