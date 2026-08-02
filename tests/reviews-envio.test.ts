// Validação do envio do formulário nativo (Estrategia.md §6.6).
// Não toca a rede: a coleta nasce desabilitada, e é isso que estes testes fixam.
import { describe, it, expect } from "vitest";
import { validarEnvio, enviarReview, type EnvioReview } from "../src/domain/reviews/envio";
import { coletaHabilitada, URL_ENDPOINT_REVIEWS } from "../src/domain/reviews/config";
import { LIMITE_COMENTARIO } from "../src/domain/reviews/tipos";

function envio(parcial: Partial<EnvioReview> = {}): EnvioReview {
  return {
    codigo: "ICSD20",
    semestre: "2025/2",
    situacao: "aprovado",
    professorId: "fulano-de-tal",
    autor: "Alguem Ficticio",
    geral: 4,
    didatica: 4,
    dificuldade: 3,
    cargaTrabalho: 3,
    avaliacao: "provas",
    tags: [],
    comentario: "",
    consentimento: true,
    ...parcial,
  };
}

describe("configuração da coleta", () => {
  it("nasce desabilitada: sem endpoint, não há para onde enviar", () => {
    expect(URL_ENDPOINT_REVIEWS).toBe("");
    expect(coletaHabilitada()).toBe(false);
  });

  it("com a coleta desligada, o envio falha antes de tocar a rede", async () => {
    const r = await enviarReview(envio());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros[0]).toMatch(/não está configurada/i);
  });
});

describe("validação do envio", () => {
  it("aceita um envio completo", () => {
    expect(validarEnvio(envio())).toEqual([]);
  });

  it("exige consentimento explícito (RNF07)", () => {
    expect(validarEnvio(envio({ consentimento: false }))).toContain(
      "É preciso aceitar os termos para enviar.",
    );
  });

  it("exige exatamente uma das rotas de professor", () => {
    const semNenhuma = validarEnvio(envio({ professorId: undefined }));
    expect(semNenhuma.join(" ")).toMatch(/Escolha o professor/);

    const comAmbas = validarEnvio(envio({ professorTexto: "Outro Docente" }));
    expect(comAmbas.join(" ")).toMatch(/não os dois/);

    // só a rota de escape também é válida
    expect(validarEnvio(envio({ professorId: undefined, professorTexto: "Outro Docente" }))).toEqual([]);
  });

  it("recusa nota fora de 1 a 5 e não inteira", () => {
    expect(validarEnvio(envio({ geral: 0 as never })).join(" ")).toMatch(/avaliação geral/i);
    expect(validarEnvio(envio({ didatica: 6 as never })).join(" ")).toMatch(/didática/i);
    expect(validarEnvio(envio({ dificuldade: 2.5 as never })).join(" ")).toMatch(/dificuldade/i);
  });

  it("recusa semestre fora do formato AAAA/S", () => {
    expect(validarEnvio(envio({ semestre: "2025-2" })).join(" ")).toMatch(/formato/i);
    expect(validarEnvio(envio({ semestre: "2025/3" })).join(" ")).toMatch(/formato/i);
  });

  it("recusa tag fora do vocabulário fechado", () => {
    expect(validarEnvio(envio({ tags: ["gente-boa" as never] })).join(" ")).toMatch(/desconhecida/i);
  });

  it("recusa comentário acima do limite", () => {
    const longo = "x".repeat(LIMITE_COMENTARIO + 1);
    expect(validarEnvio(envio({ comentario: longo })).join(" ")).toMatch(/passa de/i);
    expect(validarEnvio(envio({ comentario: "x".repeat(LIMITE_COMENTARIO) }))).toEqual([]);
  });
});
