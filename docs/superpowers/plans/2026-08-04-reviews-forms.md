# Avaliações via Google Forms — plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use `superpowers:subagent-driven-development`
> (recomendado) ou `superpowers:executing-plans` para executar tarefa a tarefa. Os
> passos usam checkbox (`- [ ]`) para acompanhamento.

**Objetivo:** trocar a superfície de coleta de avaliações — de formulário nativo mais
endpoint em Apps Script para um Google Forms do domínio UTFPR — preservando o caminho
de leitura já construído.

**Arquitetura:** o Oásis monta uma URL de prefill e abre o Forms; a planilha de
respostas é moderada à mão; a aba `Homologado`, publicada como CSV, é ingerida por uma
GitHub Action que regenera `data/reviews.json` por inteiro. Sem back-end em nenhum
ponto.

**Stack:** TypeScript, React, Vite, Vitest, `tsx` para scripts. Sem dependências novas.

**Spec:** `docs/superpowers/specs/2026-08-04-reviews-forms-design.md` — leia antes da
Tarefa 1. As referências `§N` abaixo apontam para ele.

## Restrições globais

- Código, comentários, mensagens de commit e textos de interface **em português**.
- **Nenhum trailer `Co-Authored-By`** nem crédito de IA em commit algum (CLAUDE.md).
- **Sem back-end**: tudo precisa funcionar como site estático no GitHub Pages.
- **Dado pessoal não entra no repo**: nem PDF de histórico, nem RA, nem e-mail.
- `LIMITE_COMENTARIO = 1000`; escalas inteiras de 1 a 5; `SistemaAvaliativo` é
  `"provas" | "trabalhos" | "misto"`.
- Rodar a suíte com `npm test` — precisa terminar com 0 falhas antes de cada commit.
- Branch de trabalho: `reviews-comunidade-forms`.

## Estrutura de arquivos

| Arquivo | Responsabilidade | Tarefa |
|---|---|---|
| `src/domain/reviews/tipos.ts` | tipos e limites do domínio; perde as tags | 1, 2 |
| `src/domain/reviews/professores.ts` | roster de docentes a partir das ofertas | 1 (intacto) |
| `src/domain/reviews/acervo.ts` | leitura e agregação do acervo publicado | 1, 2 |
| `src/domain/reviews/config.ts` | quais matrizes exibem a camada; URL do Forms | 3, 5 |
| `src/domain/reviews/forms.ts` | **novo** — monta a URL de prefill | 4 |
| `src/ui/telas/ModalEnvioForms.tsx` | **novo** — escolhe professor e abre o Forms | 5 |
| `src/ui/telas/Situacao.tsx` | convite pós-semestre; troca de modal | 5 |
| `src/ui/telas/Grade.tsx`, `PainelProfessor.tsx` | exibição; perdem as tags | 2 |
| `scripts/ingerir-reviews.ts` | valida o CSV e regenera o acervo | 2, 6 |
| `.github/workflows/ingerir-reviews.yml` | ingestão semanal | 6 |

**Removidos:** `src/ui/telas/ModalAvaliacao.tsx`, `src/domain/reviews/envio.ts`,
`tools/apps-script/recebe-review.gs`, `tests/reviews-envio.test.ts`,
`src/ui/telas/ModalMinhasAvaliacoes.tsx`.

---

### Tarefa 1: Trazer a camada de avaliações para a branch

A branch `reviews-comunidade-forms` saiu de `main`, que **não tem** nada de
`src/domain/reviews`. Todo o caminho de leitura já existe em `feat/reviews-comunidade` e
é reaproveitado — reimplementar seria jogar fora 3.500 linhas testadas.

**Arquivos:** merge de `feat/reviews-comunidade`.

**Interfaces produzidas:** `Review`, `AcervoReviews`, `AgregadoReviews`, `Estrelas`,
`SistemaAvaliativo`, `LIMITE_COMENTARIO`, `construirRoster(cursos): Roster`,
`Roster.elencoDaDisciplina(codigo): UnidadeDocente[]`, `slugProfessor(nome): string`,
`idDaUnidade(nomes): string`, `reviewsHabilitadasPara(matriz): boolean`.

- [ ] **Passo 1: Conferir que a branch de trabalho está limpa**

```bash
git status --short
```

Esperado: nenhuma saída além, possivelmente, dos arquivos de `docs/superpowers/`.

- [ ] **Passo 2: Trazer a camada**

```bash
git merge feat/reviews-comunidade --no-ff -m "merge: base da camada de avaliações da comunidade"
```

Esperado: merge sem conflito — `main` não tocou nesses arquivos desde a bifurcação. Se
houver conflito em `Estrategia.md` ou `Tasks.md`, resolva mantendo **os dois** lados: o
texto da branch antiga descreve a arquitetura reaproveitada e o de `main` a documenta.

- [ ] **Passo 3: Rodar a suíte inteira**

```bash
npm test
```

Esperado: PASS em todos os arquivos, incluindo `tests/reviews.test.ts`,
`tests/reviews-envio.test.ts` e `tests/reviews-ingestao.test.ts`. Se algo falhar aqui, é
regressão do merge — conserte antes de seguir, porque as tarefas seguintes assumem base
verde.

- [ ] **Passo 4: Conferir que o build passa**

```bash
npm run build
```

Esperado: `tsc -b` sem erro e Vite gerando `dist/`.

---

### Tarefa 2: Remover o sistema de tags

Tags e frases prontas saem de escopo (decisão do dono). São ~120 linhas de vocabulário
em `tipos.ts` mais validação na ingestão e exibição na UI.

**Arquivos:**
- Modificar: `src/domain/reviews/tipos.ts` (remover `TAGS`, `TAGS_OPOSTAS`,
  `CATEGORIAS_TAG`, `DESCRICAO_TAG`, `opostaDe`, tipos `Tag`/`CategoriaTag`, campo
  `tags` de `Review` e de `AgregadoReviews`)
- Modificar: `src/domain/reviews/acervo.ts` (agregação de tags)
- Modificar: `scripts/ingerir-reviews.ts` (validação de tags)
- Modificar: `src/ui/telas/Grade.tsx`, `src/ui/telas/PainelProfessor.tsx` (exibição)
- Modificar: `tests/reviews.test.ts`, `tests/reviews-ingestao.test.ts`

**Interfaces consumidas:** tudo da Tarefa 1.
**Interfaces produzidas:** `Review` sem `tags`; `AgregadoReviews` sem `tags`.

- [ ] **Passo 1: Encontrar todos os pontos de uso**

```bash
grep -rn "TAGS\|CATEGORIAS_TAG\|DESCRICAO_TAG\|opostaDe\|\btags\b\|: Tag" src scripts tests
```

Anote a lista — ela é o roteiro dos passos seguintes.

- [ ] **Passo 2: Ajustar os testes primeiro (eles definem o alvo)**

Em `tests/reviews.test.ts` e `tests/reviews-ingestao.test.ts`, remova os casos que
exercitam tags (`tag desconhecida`, `tags contraditórias`, agregação por tag) e retire a
propriedade `tags` de todos os objetos `Review` de fixture e das linhas de CSV de
fixture, **inclusive do cabeçalho**.

- [ ] **Passo 3: Rodar e ver falhar**

```bash
npm test
```

Esperado: FAIL — erros de tipo/compilação em `tipos.ts` ainda exportando `Tag` usado, ou
asserções sobre `agregado.tags`. É o sinal de que os testes agora descrevem o alvo.

- [ ] **Passo 4: Remover o vocabulário do domínio**

Em `src/domain/reviews/tipos.ts`, apague os blocos `TAGS`, `TAGS_OPOSTAS`,
`CATEGORIAS_TAG`, `DESCRICAO_TAG`, `opostaDe`, e os tipos `Tag` e `CategoriaTag`.
Remova `tags: Tag[];` da interface `Review` e `tags: { tag: Tag; n: number }[];` de
`AgregadoReviews`.

- [ ] **Passo 5: Remover a agregação e a validação**

Em `acervo.ts`, apague a contagem de tags e a propriedade `tags` do objeto agregado.
Em `scripts/ingerir-reviews.ts`, apague o import de `TAGS`/`TAGS_OPOSTAS`/`Tag`, o bloco:

```ts
const tags = campos.tags ? campos.tags.split("|").map((t) => t.trim()).filter(Boolean) : [];
for (const t of tags) {
  if (!TAGS.includes(t as Tag)) problemas.push(`tag desconhecida "${t}"`);
}
for (const [a, b] of TAGS_OPOSTAS) {
  if (tags.includes(a) && tags.includes(b)) problemas.push(`tags contraditórias "${a}" e "${b}"`);
}
```

a linha `tags: tags as Tag[],` do objeto `reviews.push({...})`, e `"tags"` da lista
`obrigatorias`.

- [ ] **Passo 6: Remover a exibição**

Em `Grade.tsx` e `PainelProfessor.tsx`, apague os blocos que renderizam chips de tag e
os imports correspondentes. Não substitua por nada — a ausência é o desenho.

- [ ] **Passo 7: Rodar até passar**

```bash
npm test && npm run build
```

Esperado: PASS e build limpo. `grep -rn "Tag\b" src scripts` não deve devolver nada de
avaliações.

- [ ] **Passo 8: Commit**

```bash
git add -A
git commit -m "feat(reviews): remove o sistema de tags do domínio e da exibição"
```

---

### Tarefa 3: Remover a superfície de envio nativa

O formulário nativo e o endpoint em Apps Script são substituídos pelo Forms. Sair pela
frente evita que a Tarefa 5 conviva com duas superfícies de envio.

**Arquivos:**
- Excluir: `src/ui/telas/ModalAvaliacao.tsx`, `src/ui/telas/ModalMinhasAvaliacoes.tsx`,
  `src/domain/reviews/envio.ts`, `tools/apps-script/recebe-review.gs`,
  `tests/reviews-envio.test.ts`
- Modificar: `src/domain/reviews/config.ts`, `src/ui/telas/Situacao.tsx`,
  `src/ui/App.tsx`

- [ ] **Passo 1: Excluir os arquivos**

```bash
git rm src/ui/telas/ModalAvaliacao.tsx src/ui/telas/ModalMinhasAvaliacoes.tsx src/domain/reviews/envio.ts tools/apps-script/recebe-review.gs tests/reviews-envio.test.ts
```

- [ ] **Passo 2: Limpar a config**

Em `src/domain/reviews/config.ts`, apague `URL_ENDPOINT_REVIEWS`, `TURNSTILE_SITE_KEY` e
`coletaHabilitada()`, junto com o cabeçalho que fala do endpoint e do Turnstile.
Preserve `MATRIZES_COM_REVIEWS` e `reviewsHabilitadasPara`. A URL do Forms entra aqui na
Tarefa 5.

- [ ] **Passo 3: Desligar os pontos de uso**

Em `Situacao.tsx`, remova o import de `ModalAvaliacao`, o estado `avaliando`, o elemento
`<ModalAvaliacao ... />` e a condição `coletaHabilitada()`. **Preserve** o bloco
`doUltimoSemestre` e a `<section>` "Avaliar o semestre {…}" inteira — o botão fica sem
ação até a Tarefa 5; deixe `onClick={() => {}}` com o comentário
`// ligado ao Forms na Tarefa 5`. Em `App.tsx`, remova o que referenciar
`ModalMinhasAvaliacoes`.

- [ ] **Passo 4: Rodar**

```bash
npm test && npm run build
```

Esperado: PASS e build limpo. Se `tsc` acusar import órfão, é ponto de uso que escapou
do Passo 3.

- [ ] **Passo 5: Commit**

```bash
git add -A
git commit -m "feat(reviews): remove o formulário nativo e o endpoint em Apps Script"
```

---

### Tarefa 4: Módulo de URL de prefill

Módulo puro, sem React, testável isoladamente. É o único lugar do código que conhece os
IDs `entry.*` do formulário (§3.6).

**Arquivos:**
- Criar: `src/domain/reviews/forms.ts`
- Criar: `tests/reviews-forms.test.ts`

**Interfaces consumidas:** `UnidadeDocente` de `professores.ts`.
**Interfaces produzidas:**
`montarUrlDeAvaliacao(alvo: AlvoAvaliacao, autor: string, professor: string | null): string`
e `export interface AlvoAvaliacao { codigo: string; nome: string; semestre: string }`.

- [ ] **Passo 1: Escrever o teste que falha**

Crie `tests/reviews-forms.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { montarUrlDeAvaliacao, CAMPOS_FORMS, URL_BASE_FORMS } from "../src/domain/reviews/forms";

const alvo = { codigo: "DAINF31", nome: "Estruturas de Dados 1", semestre: "2025/2" };

describe("montarUrlDeAvaliacao", () => {
  it("preenche os cinco campos na URL", () => {
    const url = new URL(montarUrlDeAvaliacao(alvo, "Fulano de Tal", "Sicrano da Silva"));
    expect(url.searchParams.get(CAMPOS_FORMS.autor)).toBe("Fulano de Tal");
    expect(url.searchParams.get(CAMPOS_FORMS.codigo)).toBe("DAINF31");
    expect(url.searchParams.get(CAMPOS_FORMS.disciplina)).toBe("Estruturas de Dados 1");
    expect(url.searchParams.get(CAMPOS_FORMS.semestre)).toBe("2025/2");
    expect(url.searchParams.get(CAMPOS_FORMS.professor)).toBe("Sicrano da Silva");
  });

  it("marca o formulário como pré-preenchido", () => {
    const url = new URL(montarUrlDeAvaliacao(alvo, "Fulano", "Sicrano"));
    expect(url.searchParams.get("usp")).toBe("pp_url");
  });

  it("omite o professor quando não está no elenco", () => {
    const url = new URL(montarUrlDeAvaliacao(alvo, "Fulano", null));
    expect(url.searchParams.has(CAMPOS_FORMS.professor)).toBe(false);
  });

  it("escapa acento, barra e espaço", () => {
    const url = montarUrlDeAvaliacao(alvo, "Rômulo Silva", "João / Maria");
    expect(url).not.toContain("Rômulo Silva");
    expect(url).toContain("R%C3%B4mulo+Silva");
    expect(new URL(url).searchParams.get(CAMPOS_FORMS.professor)).toBe("João / Maria");
  });

  it("aponta para o formulário publicado", () => {
    expect(montarUrlDeAvaliacao(alvo, "Fulano", null).startsWith(URL_BASE_FORMS)).toBe(true);
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar**

```bash
npx vitest run tests/reviews-forms.test.ts
```

Esperado: FAIL — `Cannot find module '../src/domain/reviews/forms'`.

- [ ] **Passo 3: Implementar**

Crie `src/domain/reviews/forms.ts`:

```ts
// Montagem do link pré-preenchido do Google Forms (spec §3.6).
//
// A pesquisabilidade que o Forms não tem mora no Oásis: o aluno acha a disciplina
// e o professor aqui, onde a busca já funciona, e o formulário chega pronto. O
// prefill NÃO trava campo — o respondente pode editar antes de enviar —, então
// isto é conveniência, e a validação da ingestão continua sendo a defesa real.

/** Alvo da avaliação: uma disciplina cursada num semestre específico. */
export interface AlvoAvaliacao {
  codigo: string;
  nome: string;
  semestre: string;
}

/**
 * Base do formulário publicado, terminada em `/viewform`.
 *
 * Vazia desliga a coleta: a plataforma segue exibindo avaliações e apenas não
 * oferece o botão de avaliar. É a degradação pretendida enquanto não houver
 * formulário publicado.
 */
export const URL_BASE_FORMS = "";

/**
 * IDs dos campos, colhidos em "Obter link pré-preenchido" (spec §3.6).
 *
 * São opacos e pertencem ao formulário, não ao código. EDITAR o enunciado de uma
 * pergunta preserva o id; APAGAR e recriar a pergunta gera um id novo e quebra o
 * prefill em silêncio — o formulário abre, só que com o campo vazio. Ao mexer nas
 * perguntas, colha o link de novo e confira estes cinco valores.
 */
export const CAMPOS_FORMS = {
  autor: "entry.0000000001",
  codigo: "entry.0000000002",
  disciplina: "entry.0000000003",
  semestre: "entry.0000000004",
  professor: "entry.0000000005",
} as const;

/** A coleta só existe quando há formulário para onde mandar. */
export function coletaHabilitada(): boolean {
  return URL_BASE_FORMS.trim().length > 0;
}

/**
 * URL do formulário com os cinco primeiros campos preenchidos.
 *
 * `professor` nulo é a rota "Professor Não Ofertado": o campo vai ausente e a
 * pessoa digita. Pela medição do Estrategia.md isso alcança ~14% dos casos, e 31%
 * para quem está adiantado — é caminho comum, não borda.
 */
export function montarUrlDeAvaliacao(
  alvo: AlvoAvaliacao,
  autor: string,
  professor: string | null,
): string {
  const params = new URLSearchParams({ usp: "pp_url" });
  params.set(CAMPOS_FORMS.autor, autor);
  params.set(CAMPOS_FORMS.codigo, alvo.codigo);
  params.set(CAMPOS_FORMS.disciplina, alvo.nome);
  params.set(CAMPOS_FORMS.semestre, alvo.semestre);
  if (professor) params.set(CAMPOS_FORMS.professor, professor);
  return `${URL_BASE_FORMS}?${params.toString()}`;
}
```

- [ ] **Passo 4: Rodar e ver passar**

```bash
npx vitest run tests/reviews-forms.test.ts
```

Esperado: PASS nos 5 casos. O teste de `URL_BASE_FORMS` passa mesmo com a constante
vazia (`startsWith("")` é sempre verdadeiro) — ele existe para travar o formato quando a
URL real entrar na Tarefa 7.

- [ ] **Passo 5: Commit**

```bash
git add src/domain/reviews/forms.ts tests/reviews-forms.test.ts
git commit -m "feat(reviews): monta o link pré-preenchido do formulário"
```

---

### Tarefa 5: Modal de envio e ligação na tela de Situação

**Arquivos:**
- Criar: `src/ui/telas/ModalEnvioForms.tsx`
- Modificar: `src/ui/telas/Situacao.tsx`

**Interfaces consumidas:** `montarUrlDeAvaliacao`, `AlvoAvaliacao`, `coletaHabilitada`
(Tarefa 4); `construirRoster`, `UnidadeDocente` (Tarefa 1); `CURSOS` de
`src/domain/dadosCurso.ts`; `Botao`, `Card` de `src/ui/componentes`.
**Interfaces produzidas:** `<ModalEnvioForms alvo={AlvoAvaliacao | null} autor={string}
onFechar={() => void} />`.

- [ ] **Passo 1: Criar o modal**

`src/ui/telas/ModalEnvioForms.tsx` — três responsabilidades e nada mais (§5): escolher o
professor, mostrar o que será público, abrir o Forms.

```tsx
import { useMemo, useState } from "react";
import { construirRoster } from "../../domain/reviews/professores";
import { CURSOS } from "../../domain/dadosCurso";
import { montarUrlDeAvaliacao, type AlvoAvaliacao } from "../../domain/reviews/forms";
import { Botao } from "../componentes";

/** Marca a rota "meu professor não está na lista" sem confundir com "nada escolhido". */
const FORA_DO_ELENCO = "__fora__";

export function ModalEnvioForms(props: {
  alvo: AlvoAvaliacao | null;
  autor: string;
  onFechar: () => void;
}) {
  const { alvo, autor, onFechar } = props;
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  const elenco = useMemo(() => {
    if (!alvo) return [];
    return construirRoster(CURSOS).elencoDaDisciplina(alvo.codigo);
  }, [alvo]);

  const filtrado = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return elenco;
    return elenco.filter((u) => u.nome.toLowerCase().includes(q));
  }, [elenco, busca]);

  if (!alvo) return null;

  const professor =
    escolhido === null || escolhido === FORA_DO_ELENCO
      ? null
      : (elenco.find((u) => u.id === escolhido)?.nome ?? null);

  const pronto = escolhido !== null;

  function abrir() {
    window.open(montarUrlDeAvaliacao(alvo!, autor, professor), "_blank", "noopener");
    onFechar();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onFechar}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Avaliar {alvo.nome}
        </h2>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
          {alvo.codigo} · cursada em {alvo.semestre}
        </p>

        <label className="mt-4 block text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          Quem deu a disciplina?
        </label>
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar professor"
          className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        />

        <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
          {filtrado.map((u) => (
            <button
              key={u.id}
              onClick={() => setEscolhido(u.id)}
              className={`w-full rounded-xl px-3 py-2 text-left text-sm ${
                escolhido === u.id
                  ? "bg-utfpr-500/30 font-semibold"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {u.nome}
            </button>
          ))}
          {/* sempre presente, mesmo com a busca vazia: é rota comum, não erro (§5) */}
          <button
            onClick={() => setEscolhido(FORA_DO_ELENCO)}
            className={`w-full rounded-xl px-3 py-2 text-left text-sm ${
              escolhido === FORA_DO_ELENCO
                ? "bg-utfpr-500/30 font-semibold"
                : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            Meu professor não está na lista
            <span className="block text-xs font-normal text-zinc-500">
              Você digita o nome no formulário
            </span>
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-zinc-200 p-3 text-xs dark:border-zinc-800">
          <p className="font-semibold text-zinc-800 dark:text-zinc-200">
            O que fica público na sua avaliação
          </p>
          <p className="mt-1 text-zinc-600 dark:text-zinc-300">
            Seu nome <strong>{autor}</strong>, a disciplina, o semestre, o professor e o
            que você escrever. Seu e-mail institucional é usado só para confirmar que
            você é da UTFPR e não é publicado; seu RA e suas notas também não.
          </p>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Botao variante="sutil" onClick={onFechar}>
            Cancelar
          </Botao>
          <Botao onClick={abrir} desabilitado={!pronto}>
            Abrir formulário
          </Botao>
        </div>
      </div>
    </div>
  );
}
```

Se a prop de desabilitar do `Botao` do projeto tiver outro nome, use o nome real —
confira `src/ui/componentes.tsx` antes de escrever.

- [ ] **Passo 2: Ligar na tela de Situação**

Em `src/ui/telas/Situacao.tsx`: importe `ModalEnvioForms` e
`coletaHabilitada` de `../../domain/reviews/forms` (não mais de `config`), restaure o
estado `const [avaliando, setAvaliando] = useState<AlvoAvaliacao | null>(null);`, troque
o `onClick={() => {}}` da Tarefa 3 por `onClick={() => setAvaliando(d)}`, e substitua o
antigo `<ModalAvaliacao />` por:

```tsx
<ModalEnvioForms alvo={avaliando} autor={perfil.nome} onFechar={() => setAvaliando(null)} />
```

O tipo `AlvoAvaliacao` local de `doUltimoSemestre` tem um campo `situacao` a mais do que
o de `forms.ts`; isso é compatível em TypeScript (excesso de propriedade só é barrado em
literal direto). Importe `AlvoAvaliacao` de `forms.ts` e apague a definição local.

- [ ] **Passo 3: Verificar tipos e build**

```bash
npm run build && npm test
```

Esperado: build limpo e suíte verde.

- [ ] **Passo 4: Conferir no navegador**

```bash
npm run dev
```

Carregue um histórico, vá à tela de Situação, clique em "Avaliar" numa disciplina do
último semestre. Esperado: modal abre, a busca filtra o elenco, "Abrir formulário" fica
desabilitado até escolher, e clicar abre nova aba. Com `URL_BASE_FORMS` ainda vazia a
aba abre em `?usp=pp_url&...` — confira na barra de endereço que os cinco parâmetros
estão lá e com acento escapado.

- [ ] **Passo 5: Commit**

```bash
git add -A
git commit -m "feat(reviews): tela de envio abre o formulário já preenchido"
```

---

### Tarefa 6: Adaptar a ingestão ao CSV do Forms

Três diferenças entre o CSV da aba `Homologado` e o que o script espera hoje: o sistema
avaliativo chega com rótulo em português, o professor chega como **nome** e não como
slug, e `situacao` não existe (§4.3).

**Arquivos:**
- Modificar: `scripts/ingerir-reviews.ts`
- Modificar: `src/domain/reviews/tipos.ts` (`situacao` opcional)
- Modificar: `tests/reviews-ingestao.test.ts`

**Interfaces consumidas:** `slugProfessor`, `idDaUnidade`, `construirRoster` (Tarefa 1).
**Interfaces produzidas:** `resolverSistemaAvaliativo(rotulo: string): SistemaAvaliativo | null`,
`resolverProfessor(nome: string, roster: Roster): string | null`.

- [ ] **Passo 1: Escrever os testes que falham**

Acrescente a `tests/reviews-ingestao.test.ts`:

```ts
import { resolverSistemaAvaliativo, resolverProfessor } from "../scripts/ingerir-reviews";
import { construirRoster } from "../src/domain/reviews/professores";
import { CURSOS } from "../src/domain/dadosCurso";

describe("resolverSistemaAvaliativo", () => {
  it("aceita os três rótulos do formulário", () => {
    expect(resolverSistemaAvaliativo("Provas")).toBe("provas");
    expect(resolverSistemaAvaliativo("Trabalhos")).toBe("trabalhos");
    expect(resolverSistemaAvaliativo("Provas e trabalhos")).toBe("misto");
  });

  it("é indiferente a caixa e a espaço nas pontas", () => {
    expect(resolverSistemaAvaliativo("  provas E TRABALHOS ")).toBe("misto");
  });

  it("recusa rótulo desconhecido", () => {
    expect(resolverSistemaAvaliativo("Seminários")).toBe(null);
  });
});

describe("resolverProfessor", () => {
  const roster = construirRoster(CURSOS);

  it("resolve um nome do elenco ao id da unidade", () => {
    const unidade = roster.unidades[0];
    expect(resolverProfessor(unidade.nome, roster)).toBe(unidade.id);
  });

  it("resolve dupla escrita com barra", () => {
    const dupla = roster.unidades.find((u) => u.nomes.length === 2);
    if (!dupla) return; // ofertas sem dupla: nada a exercitar
    expect(resolverProfessor(dupla.nomes.join(" / "), roster)).toBe(dupla.id);
  });

  it("devolve null para quem não está no roster", () => {
    expect(resolverProfessor("Ninguém Dos Santos", roster)).toBe(null);
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar**

```bash
npx vitest run tests/reviews-ingestao.test.ts
```

Esperado: FAIL — `resolverSistemaAvaliativo is not a function`.

- [ ] **Passo 3: Implementar os dois resolvedores**

Em `scripts/ingerir-reviews.ts`, antes de `validarEConverter`:

```ts
/** Rótulos da pergunta 10 do formulário → o valor do domínio (spec §3.2). */
const SISTEMAS: Record<string, SistemaAvaliativo> = {
  "provas": "provas",
  "trabalhos": "trabalhos",
  "provas e trabalhos": "misto",
};

export function resolverSistemaAvaliativo(rotulo: string): SistemaAvaliativo | null {
  return SISTEMAS[rotulo.trim().toLowerCase()] ?? null;
}

/**
 * Nome digitado ou pré-preenchido → id da unidade docente.
 *
 * O formulário carrega NOME, não slug: o campo é lido por gente, e um id opaco no
 * meio do formulário seria ruído para quem responde e convite a erro para quem
 * edita. A tradução mora aqui, contra o mesmo roster que a validação usa.
 *
 * `null` não é erro — é a rota "Professor Não Ofertado", e a linha fica pendente
 * até que o nome seja promovido ao roster.
 */
export function resolverProfessor(nome: string, roster: Roster): string | null {
  const partes = nome.split("/").map((p) => p.trim()).filter(Boolean);
  if (!partes.length) return null;
  const id = idDaUnidade(partes);
  return id && roster.porId(id) ? id : null;
}
```

Acrescente aos imports: `import { construirRoster, idDaUnidade, type Roster } from "../src/domain/reviews/professores";`
e `type SistemaAvaliativo` ao import de `tipos`.

- [ ] **Passo 4: Rodar e ver passar**

```bash
npx vitest run tests/reviews-ingestao.test.ts
```

Esperado: PASS.

- [ ] **Passo 5: Usar os resolvedores no laço de validação**

Em `validarEConverter`, troque `"professorId"` por `"professor"` na lista
`obrigatorias`, remova `"situacao"` dela, e substitua o bloco de professor:

```ts
    const professorId = resolverProfessor(campos.professor ?? "", roster);
    if (!professorId) {
      // rota "Professor Não Ofertado": não é erro, é linha que ainda não publica
      ignoradas++;
      continue;
    }
```

Troque a validação do sistema avaliativo:

```ts
    const avaliacao = resolverSistemaAvaliativo(campos.avaliacao ?? "");
    if (!avaliacao) problemas.push(`sistema avaliativo "${campos.avaliacao}" inválido`);
```

Remova a linha `if (!["aprovado", "reprovado"].includes(campos.situacao)) ...`. No
`reviews.push({...})`, troque `professorId: campos.professorId` por `professorId`,
`avaliacao: campos.avaliacao as Review["avaliacao"]` por `avaliacao: avaliacao!`, e
remova `situacao: ...`. Em `idDaLinha`, troque `campos.professorId` por
`campos.professor`.

Em `src/domain/reviews/tipos.ts`, torne o campo opcional:

```ts
  /**
   * Vem do histórico do aluno quando conhecido. O formulário não pergunta: quem
   * reprovou não tem por que declarar isso em público, e perguntar convidaria à
   * omissão. Ausente significa "não informado", nunca "aprovado".
   */
  situacao?: "aprovado" | "reprovado";
```

- [ ] **Passo 6: Corrigir as fixtures e rodar tudo**

Nas fixtures de CSV de `tests/reviews-ingestao.test.ts`, renomeie a coluna
`professorId` para `professor` com o **nome** da unidade, remova a coluna `situacao`, e
troque os valores de `avaliacao` para os rótulos do formulário (`Provas`, `Trabalhos`,
`Provas e trabalhos`).

```bash
npm test && npm run build
```

Esperado: PASS e build limpo.

- [ ] **Passo 7: Commit**

```bash
git add -A
git commit -m "feat(reviews): ingestão lê o CSV do formulário"
```

---

### Tarefa 7: Ligar as URLs reais e a automação

Só executável **depois** que o dono entregar os dois valores (§3.6, §4.2): a URL de
prefill com os `entry.*` e a URL do CSV publicado da aba `Homologado`.

**Arquivos:**
- Modificar: `src/domain/reviews/forms.ts`
- Modificar: `.github/workflows/ingerir-reviews.yml`

- [ ] **Passo 1: Preencher a base e os IDs**

Em `forms.ts`, ponha em `URL_BASE_FORMS` a URL até `/viewform` (sem query string) e
substitua os cinco `entry.*` pelos valores reais colhidos do link pré-preenchido.

- [ ] **Passo 2: Conferir o prefill de ponta a ponta**

```bash
npm run dev
```

Abra o modal, escolha um professor, clique em "Abrir formulário". Esperado: o Forms
abre com **os cinco campos visivelmente preenchidos**. Campo vazio = `entry.*` errado
(o formulário abre igual, só que em branco — falha silenciosa). Confira também a rota
"não está na lista": só o campo de professor vem vazio.

- [ ] **Passo 3: Envio de teste e primeira ingestão**

Responda o formulário uma vez. Na planilha, marque `aprovado = SIM` na linha e confira
que ela apareceu na aba `Homologado`. Então:

```bash
npx tsx scripts/ingerir-reviews.ts "<url-do-csv-publicado>"
```

Esperado: `1 avaliação(ões) publicada(s); 0 pendente(s) de roster.` e `data/reviews.json`
com a linha. Se vier `1 pendente de roster`, o nome do professor não casou — confira se
a coluna traz o nome como o roster o escreve.

- [ ] **Passo 4: Apontar o workflow**

Em `.github/workflows/ingerir-reviews.yml`, troque a URL do CSV pela nova. Se ela
estiver como secret, atualize o secret e mantenha a referência.

- [ ] **Passo 5: Rodar o workflow à mão**

Pela aba Actions, dispare o workflow manualmente. Esperado: execução verde e, se houver
avaliação nova aprovada, um commit alterando `data/reviews.json`.

- [ ] **Passo 6: Commit**

```bash
git add -A
git commit -m "feat(reviews): liga o formulário publicado e a ingestão automática"
```

---

## Autorrevisão

**Cobertura do spec:** §3.1–3.5 (montagem do Forms) são trabalho manual do dono, não de
código — cobertos pelo spec e pela Tarefa 7, que os verifica de ponta a ponta. §3.6
prefill → Tarefas 4 e 7. §4.1–4.2 moderação e aba `Homologado` → trabalho manual,
verificado na Tarefa 7 Passo 3. §4.3 ingestão → Tarefas 2 e 6. §5 front-end → Tarefas 3
e 5. §6–7 são justificativa, sem tarefa.

**Pendências fora do código, do dono:** montar o formulário conforme §3.1–3.5, criar a
coluna `aprovado` e a aba `Homologado`, publicá-la como CSV, e definir o canal de
contato citado na caixa de consentimento (§3.4) — hoje o texto diz "entrando em contato"
sem dizer com quem.

**Consistência de tipos:** `AlvoAvaliacao` é definido em `forms.ts` (Tarefa 4) e
consumido em `ModalEnvioForms` e `Situacao.tsx` (Tarefa 5) — a definição local antiga é
apagada no mesmo passo. `coletaHabilitada` migra de `config.ts` (apagada na Tarefa 3)
para `forms.ts` (criada na Tarefa 4); a Tarefa 5 é a única consumidora e importa do
lugar novo. `Review.situacao` vira opcional na Tarefa 6 — confira que nenhum ponto de
exibição a trate como obrigatória.
