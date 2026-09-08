import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DURACAO_PADRAO_MS,
  DURACAO_SAIDA_MS,
  ESTADO_INICIAL,
  TETO_PILHA,
  dispensar,
  pausar,
  publicar,
  publicarUmaVez,
  retomar,
  varrer,
  type EstadoToasts,
  type PedidoToast,
} from "../src/ui/toasts/pilha";

function fonte(caminho: string) {
  return readFileSync(new URL(`../${caminho}`, import.meta.url), "utf8");
}

const AVISO: PedidoToast = { chave: "sim:aviso:extensao", tom: "aviso", titulo: "Extensão" };

describe("pilha de avisos flutuantes", () => {
  it("publica uma vez só e não reinicia o relógio na repetição", () => {
    let e = publicarUmaVez(ESTADO_INICIAL, AVISO, 1_000);
    expect(e.pilha).toHaveLength(1);
    expect(e.pilha[0].criadoEm).toBe(1_000);

    // é o que impede o Simulador de reciclar o mesmo aviso a cada recálculo
    e = publicarUmaVez(e, AVISO, 9_000);
    expect(e.pilha).toHaveLength(1);
    expect(e.pilha[0].criadoEm).toBe(1_000);
  });

  it("não republica nem depois do cartão ter saído da tela", () => {
    let e = publicarUmaVez(ESTADO_INICIAL, AVISO, 0);
    e = varrer(e, DURACAO_PADRAO_MS);
    e = varrer(e, DURACAO_PADRAO_MS + DURACAO_SAIDA_MS);
    expect(e.pilha).toHaveLength(0);

    e = publicarUmaVez(e, AVISO, 100_000);
    expect(e.pilha).toHaveLength(0);
  });

  it("publicar reinicia o relógio da mesma chave em vez de duplicar o cartão", () => {
    const choque: PedidoToast = { chave: "choque:ICSX30:S73", tom: "alerta", titulo: "Choque" };
    let e = publicar(ESTADO_INICIAL, choque, 1_000);
    e = publicar(e, choque, 5_000);

    expect(e.pilha).toHaveLength(1);
    expect(e.pilha[0].criadoEm).toBe(5_000);
  });

  it("expira no tempo certo e só remove depois do fade de saída", () => {
    let e = publicarUmaVez(ESTADO_INICIAL, AVISO, 0);

    e = varrer(e, DURACAO_PADRAO_MS - 1);
    expect(e.pilha[0].saindo).toBe(false);

    e = varrer(e, DURACAO_PADRAO_MS);
    expect(e.pilha).toHaveLength(1);
    expect(e.pilha[0].saindo).toBe(true);

    e = varrer(e, DURACAO_PADRAO_MS + DURACAO_SAIDA_MS - 1);
    expect(e.pilha).toHaveLength(1);

    e = varrer(e, DURACAO_PADRAO_MS + DURACAO_SAIDA_MS);
    expect(e.pilha).toHaveLength(0);
  });

  it("duração zero nunca expira sozinha, só no X", () => {
    let e = publicar(
      ESTADO_INICIAL,
      { chave: "choque:X:S01", tom: "alerta", titulo: "Choque", duracaoMs: 0 },
      0,
    );
    e = varrer(e, 10 * 60 * 1_000);
    expect(e.pilha).toHaveLength(1);
    expect(e.pilha[0].saindo).toBe(false);

    e = dispensar(e, "choque:X:S01", 0);
    expect(e.pilha[0].saindo).toBe(true);
    e = varrer(e, DURACAO_SAIDA_MS);
    expect(e.pilha).toHaveLength(0);
  });

  it("pausar congela o relógio e retomar devolve o tempo parado", () => {
    let e = publicarUmaVez(ESTADO_INICIAL, AVISO, 0);

    e = pausar(e, AVISO.chave, 5_000);
    e = varrer(e, 5_000 + DURACAO_PADRAO_MS);
    expect(e.pilha[0].saindo).toBe(false);

    // parou por 30s: o vencimento anda 30s para a frente, não recomeça do zero
    e = retomar(e, AVISO.chave, 35_000);
    expect(e.pilha[0].criadoEm).toBe(30_000);
    e = varrer(e, 30_000 + DURACAO_PADRAO_MS - 1);
    expect(e.pilha[0].saindo).toBe(false);
    e = varrer(e, 30_000 + DURACAO_PADRAO_MS);
    expect(e.pilha[0].saindo).toBe(true);
  });

  it("acima do teto o mais antigo cede a vez", () => {
    let e: EstadoToasts = ESTADO_INICIAL;
    for (let i = 0; i <= TETO_PILHA; i++) {
      e = publicarUmaVez(e, { chave: `aviso-${i}`, tom: "aviso", titulo: `#${i}` }, i);
    }

    expect(e.pilha.filter((t) => !t.saindo)).toHaveLength(TETO_PILHA);
    expect(e.pilha.find((t) => t.chave === "aviso-0")?.saindo).toBe(true);
    expect(e.pilha.find((t) => t.chave === `aviso-${TETO_PILHA}`)?.saindo).toBe(false);
  });

  it("varrer devolve o mesmo objeto quando nada mudou, para não re-renderizar à toa", () => {
    const e = publicarUmaVez(ESTADO_INICIAL, AVISO, 0);
    expect(varrer(e, 1)).toBe(e);
  });
});

describe("contrato de animação dos avisos", () => {
  it("declara os keyframes próprios em vez das classes mortas do tailwindcss-animate", () => {
    const css = fonte("src/index.css");

    expect(css).toContain("--animate-toast-entra");
    expect(css).toContain("--animate-toast-sai");
    expect(css).toContain("@keyframes toast-entra");
    expect(css).toContain("@keyframes toast-sai");
    expect(css).toContain("prefers-reduced-motion");
  });

  it("a pilha não usa nenhuma classe do plugin que o projeto nunca instalou", () => {
    const pacote = JSON.parse(fonte("package.json"));
    expect({ ...pacote.dependencies, ...pacote.devDependencies }).not.toHaveProperty(
      "tailwindcss-animate",
    );

    for (const arquivo of ["src/ui/toasts/PilhaToasts.tsx", "src/ui/toasts/pilha.ts"]) {
      const texto = fonte(arquivo);
      for (const morta of ["animate-in", "fade-in", "zoom-in-95", "slide-in-from"]) {
        expect(texto).not.toContain(morta);
      }
    }
  });
});
