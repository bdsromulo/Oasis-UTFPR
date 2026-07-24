import { describe, expect, it } from "vitest";
import { dadosDoCurso } from "../src/domain/dadosCurso";
import { criarMapaIdentidade } from "../src/domain/motor/identidade";
import { cumpre } from "../src/domain/motor/elegiveis";
import type { PerfilAluno } from "../src/domain/tipos";

describe("Equivalência Eng Comp (844 vs 962)", () => {
  const matriz844 = dadosDoCurso("eng-comp").matriz;
  const matriz962 = dadosDoCurso("eng-comp-962").matriz;

  const mapa844 = criarMapaIdentidade(matriz844);
  const mapa962 = criarMapaIdentidade(matriz962);

  // Exemplo de aluno da 844:
  // Ele tem aprovado CSW40 ("Microcontroladores" ou afim) da matriz 844.
  const perfil844 = {
    cursadas: [
      { codigo: "CSW40", nome: "Microcontroladores", situacao: "aprovado", ano: 2020, semestre: 1, cht: 60, origem: "obrigatoria", media: 100, frequencia: 100 },
    ],
    aprovadas: new Set(["CSW40"]),
    matriculadas: [],
  } as unknown as PerfilAluno;

  it("Aluno 844 tentando cursar Sistemas Embarcados na matriz 844", () => {
    // Sistemas Embarcados (CSW41) na matriz 844 exige CSW40.
    // O aluno tem CSW40 aprovado.
    const req = matriz844.disciplinas.find(d => d.codigo === "CSW41")!.prerequisitos;
    expect(cumpre(req[0], perfil844, mapa844)).toBe(true);
  });
  
  it("A 962 reconhece a aprovação de uma disciplina feita com o código antigo/novo", () => {
    // "Fundamentos de Programação 1" deve existir em ambas, talvez com códigos diferentes
    const resolveC844 = mapa844.resolverPorNome("fundamentos de programação 1");
    const resolveC962 = mapa962.resolverPorNome("fundamentos de programação 1");
    
    // Se o código mudou, os mapas retornarão os códigos específicos de sua matriz.
    expect(resolveC844).toBeDefined();
    expect(resolveC962).toBeDefined();
  });
});
