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
  it("a coleta só está ligada quando há endpoint", () => {
    expect(coletaHabilitada()).toBe(URL_ENDPOINT_REVIEWS.trim().length > 0);
  });

  it("o endpoint configurado é uma URL /exec do Apps Script", () => {
    // guarda contra a armadilha da URL /dev, que o editor também exibe: ela só
    // funciona para quem está logado como dono e falha para todo o resto
    if (!URL_ENDPOINT_REVIEWS) return;
    expect(URL_ENDPOINT_REVIEWS).toMatch(
      /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/,
    );
  });

  it("envio inválido falha na validação, sem tocar a rede", async () => {
    const original = globalThis.fetch;
    let chamou = false;
    globalThis.fetch = (async () => {
      chamou = true;
      throw new Error("a rede não deveria ter sido tocada");
    }) as typeof fetch;
    try {
      const r = await enviarReview(envio({ consentimento: false }));
      expect(r.ok).toBe(false);
      expect(chamou, "validação precisa barrar antes do fetch").toBe(false);
    } finally {
      globalThis.fetch = original;
    }
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
