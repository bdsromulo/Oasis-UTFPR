# REPOSITORIO.md — guia para agentes (LLMs) que atuam no Oásis UTFPR

Este documento é o contrato de trabalho para qualquer assistente de IA que edite este
repositório. Leia-o **inteiro** antes da primeira alteração. Ele descreve o protocolo
inviolável de autoria, a arquitetura, o pipeline de dados, as convenções e o que já foi
aprendido resolvendo problemas reais aqui. `CLAUDE.md` é a versão curta; este arquivo é
a versão completa e agnóstica de fornecedor.

---

## 0. Protocolo de autoria — INVIOLÁVEL

**Nenhuma LLM pode se autocreditar em nada versionado neste repositório.** Isto vale
para qualquer assistente (Claude, GPT, Gemini, Llama, ou outro), em qualquer contexto.

Proibido, sem exceção:

- Trailer `Co-Authored-By:` citando uma IA em mensagens de commit.
- Trailer `Co-Authored-By:` de qualquer pessoa que não seja o dono do projeto.
- "Generated with", "Assisted by", créditos de IA, emojis de robô, ou assinaturas
  de assistente em mensagens de commit, corpos de PR, `AUTHORS`, `package.json`,
  comentários de código, ou qualquer outro arquivo versionado.
- Adicionar a IA como contribuidora por qualquer meio que o GitHub interprete como
  co-autoria (o GitHub lista como Contributor quem aparece em trailers `Co-Authored-By`).

Obrigatório:

- Todo commit tem como autor **exclusivamente o dono do projeto**
  (`Rômulo Silva <romulo.supersons@gmail.com>`). Confirme com
  `git log --format="%an <%ae>" -1` após commitar.
- A configuração `.claude/settings.json` já traz `includeCoAuthoredBy: false`.
  Não reverta isso. Se o seu harness tiver ajuste equivalente, ative-o também.
- Mensagens de commit descrevem **o quê e por quê**, em português, sem qualquer
  referência a quem/o que as escreveu.

**Regra de colisão:** o dono quer que `.claude/` (e este guia) permaneçam **visíveis**
no repositório, para transparência do processo. Mas se em algum momento manter artefatos
de IA visíveis **forçar** algum crédito de autoria (por política de plataforma, hook, ou
ferramenta), a não-autoria vence: **remova completamente os artefatos de IA do
repositório** em vez de aceitar qualquer forma de crédito. Não-autoria > visibilidade.

Se você não conseguir cumprir isto (por exemplo, seu ambiente injeta co-autoria e você
não consegue desativá-la), **não faça commits** — descreva as mudanças e deixe o dono
commitar.

---

## 1. O que é o projeto

Plataforma web para o aluno de **Bacharelado em Sistemas de Informação (BSI) da UTFPR
Câmpus Curitiba, matriz 981** acompanhar sua situação no curso: o que já cursou, o que
pode cursar (respeitando pré-requisitos), montagem da grade horária do semestre,
contadores de carga horária por categoria (obrigatórias, 2º estrato, trilhas,
humanidades, eletivas, extensão) e — em evolução — previsão de formatura.

Inspiração: o **Grade na Hora** (gradenahora.com.br), porém focado em BSI e ciente do
histórico individual do aluno. É um **projeto independente de alunos, não oficial**.

### Princípios de produto (não negociáveis sem o dono)

- **Local-first**: o histórico escolar (dado pessoal) é processado 100% no navegador e
  nunca sai da máquina do aluno. Persistência só em `localStorage`.
- **Estático**: o site roda inteiro no GitHub Pages, sem backend. Os únicos dados
  servidos são arquivos públicos em `data/`. Features que exijam servidor estão fora
  do escopo até decisão explícita do dono.
- **Erro alto > erro silencioso**: toda importação de dados passa por suítes de
  validação que **recusam** o arquivo se qualquer linha não for explicada. Preferimos
  falhar visivelmente a exibir um número sutilmente errado.
- **Dados oficiais podem divergir da prática**: correções vindas da vivência (ex.: um
  pré-requisito que na prática não trava) entram em camada de anotações separada, nunca
  sobrescrevendo a fonte oficial.

---

## 2. Onde as coisas moram

- **Código**: `C:\Users\Rômulo Silva\Desktop\Códigos\oasis-utfpr` (local, fora do
  Google Drive de propósito — a sincronização do Drive briga com `node_modules`/builds).
- **Remoto**: `https://github.com/bdsromulo/Oasis-UTFPR` (público).
- **Site publicado**: `https://bdsromulo.github.io/Oasis-UTFPR/` (deploy automático via
  GitHub Actions a cada push na `main`).
- **Documentos-fonte** (PDFs oficiais do Portal do Aluno, históricos de alunos): ficam
  **fora do repositório**, na pasta local do dono (`I:\Meu Drive\Oásis UTFPR`). Nunca
  os commite — `.gitignore` bloqueia `*.pdf` (exceção única: a fixture sintética de
  teste, aluno fictício, em `tests/fixtures/`).

---

## 3. Arquitetura em três camadas

O projeto é deliberadamente estratificado. Respeite os limites: lógica de domínio não
importa React; a UI não reimplementa regras.

### Camada 1 — Dados (`data/` + `tools/`)

JSONs públicos derivados dos documentos oficiais, mais os parsers/validadores (Python).

| Arquivo | Conteúdo | Fonte |
|---|---|---|
| `data/matriz-981.json` | 150 disciplinas: período, conjunto (2º estrato/12 trilhas/humanidades), cargas, pré-requisitos, equivalências; + cargas oficiais e legenda dos conjuntos | Consulta Curso e Matriz Curricular (Portal do Aluno) |
| `data/turmas/2026-1.json` | 77 disciplinas, 177 turmas, 584 horários | PDF oficial de Turmas Abertas |
| `data/turmas/2025-2.json` | 85 disciplinas | Backup do Grade na Hora (leitor secundário) |

Ferramentas (Python 3 + `pdfplumber`; `pypdfium2` para renderizar PDFs como imagem):

- `tools/parse_matriz.py` — Lista de Matérias (PDF) → `matriz-981.json`.
- `tools/validate_matriz.py` — invariantes M1–M7 (ver §5).
- `tools/parse_turmas_pdf.py` — **fonte primária** de turmas: PDF de Turmas Abertas →
  `data/turmas/<sem>.json`.
- `tools/validate_turmas.py` — invariantes R1–R7 (ver §5).
- `tools/parse_gnh.py` — **leitor secundário/contingência**: converte o JSON do Grade
  na Hora para o mesmo schema. Usado para semestres sem PDF (ex.: 2025-2) ou se o
  layout do PDF quebrar. O GNH também serve de gabarito de teste, mas nunca é a
  fonte de verdade quando o PDF oficial existe.

### Camada 2 — Domínio (`src/domain/`)

TypeScript puro, testável, sem dependência de UI:

- `tipos.ts` — tipos canônicos (`Matriz`, `OfertaSemestre`, `PerfilAluno`, etc.).
- `historico/extrair-linhas.ts` — extrai linhas de texto de um PDF com `pdfjs-dist`,
  agrupando por coordenada Y e ordenando por X (mesmo método posicional dos parsers
  Python). O setup do worker é responsabilidade de quem chama.
- `historico/parser.ts` — Histórico Escolar (linhas) → `PerfilAluno`.
- `motor/situacao.ts` — painel de progresso por categoria/conjunto.
- `motor/elegiveis.ts` — "o que posso cursar": pré-requisitos + equivalências × oferta.
- `motor/grade.ts` — seleção de turmas, conflitos (horário e sede) e relatório.

### Camada 3 — UI (`src/ui/`)

React 19 + Vite + Tailwind v4. `App.tsx` orquestra estado (perfil em `localStorage`,
grade selecionada) e três telas em `ui/telas/`: **Situação**, **PossoCursar**, **Grade**.
Componentes básicos em `ui/componentes.tsx`.

Também: `scripts/perfil-cli.ts` gera o `PerfilAluno` de um PDF local (uso de
desenvolvimento; a saída contém dados pessoais e **não** deve ser commitada).

---

## 4. Pipeline de dados (rotina por semestre)

```bash
# TURMAS (a cada semestre) — fonte primária: PDF oficial
#  1. Salve a página "Turmas Abertas" do Portal do Aluno como PDF (fora do repo)
#  2. Gere o JSON canônico:
python tools/parse_turmas_pdf.py "Turmas Abertas.pdf" 2026-2
#  3. Valide — só é válido com 0 erros:
python tools/validate_turmas.py "Turmas Abertas.pdf" data/turmas/2026-2.json

# Contingência (sem PDF, ou layout quebrado): leitor secundário GNH
python tools/parse_gnh.py "https://gradenahora.com.br/utfpr/2026-2/listahorario0120260200236.json" 2026-2
#   (URL: /utfpr/{AAAA-S}/listahorario01{AAAA0S}00236.json ; 01=Curitiba, 236=BSI)

# MATRIZ (muda raramente)
python tools/parse_matriz.py "Lista de Matérias Matriz Curricular.pdf"
python tools/validate_matriz.py
```

**A validação é o portão.** Nunca commite um JSON de dados cuja suíte não passe com
0 erros. Avisos ("~") são anomalias conhecidas da fonte e são aceitáveis; erros ("!!")
não são.

---

## 5. Como validamos (metodologia — leia antes de mexer em parser)

Parsers baseados em posição são frágeis a mudanças de layout. Nossa garantia é
**processual e triangulada**, não a confiança cega no parser:

1. **Cobertura total de tokens** (imune a gabarito): conte no texto cru do PDF tudo que
   tem forma inequívoca (horários `\d[MTN]\d(...)`, `Matriz:\d+`, cabeçalhos de
   disciplina) e exija que o mesmo número apareça no JSON. Disciplina nova entra na
   conta automaticamente. É a regra R1 (turmas) e a M1/M2 (matriz, via somas oficiais).
2. **Invariantes internas do documento**: regras que o documento deve obedecer a si
   mesmo (nº de horários = aulas semanais declaradas; soma das obrigatórias = total
   oficial do rodapé; pré-requisito referencia disciplina existente; domínios válidos).
3. **Conferência visual**: renderize páginas do PDF como imagem e compare campo a campo.
   Pega classes de erro que texto não pega (coluna deslocada, glifo trocado).
4. **Casos reais como teste de ouro**: dois históricos com perfis diferentes cobrem a
   maioria das anomalias (um cheio de convalidações/reprovações, outro com equivalência,
   dependência e trilhas zeradas).

### Regra de ouro ao encontrar uma anomalia nova

**Audite no texto cru do PDF antes de tocar no parser.** Quase sempre a "anomalia" é o
parser lendo fielmente uma esquisitice real da fonte. Se confirmar que é da fonte,
**codifique-a como regra conhecida no validador** (com comentário explicando), em vez de
"consertar" o parser para mascará-la. Leitura fiel > expectativa.

### Anomalias já catalogadas (não as trate como bugs)

- O portal **repete o bloco de horários N vezes quando a turma tem N professores**
  (ex.: ICSX10, ICSR30, FCH7XG). Deduplicar ao comparar/contar.
- **Aulas assíncronas (EAD) têm slot próprio** (ex.: GEE74F em `D-PTO`).
- Turmas **"Sem Reserva" podem vir com lista de prioridades**, contradizendo a própria
  definição do documento (ex.: FCH7SB S02/S06). Aceitar e preservar.
- **Nomes de curso podem terminar em dígito** ("Lic Fisica 9"): um dígito só inicia uma
  nova prioridade se o próximo token for "-".
- **CSX41** aparece com "1,7333… aulas semanais" (fração) — registro degenerado da fonte.
- **MAT7GA S02** imprime 5 horários para 4 aulas declaradas — vira aviso, não erro.
- Colagem de coluna: `Matriz:NNN` e o `Não` da coluna Optativa podem grudar no fim do
  nome do professor quando o gap horizontal fica abaixo da tolerância.
- **Sala e horário vêm no mesmo token** (`3T4(CB-105)`): não existe o modo de falha
  "horário certo, sala errada" — o token entra inteiro ou a cobertura acusa.
- **Histórico Escolar**: a linha do **ENADE** ("Estudante Dispensado de Realização do
  Enade") não tem linha-núcleo própria e vaza para o bloco da disciplina vizinha; a
  detecção de situação deve ignorar linhas com "enade". O nome da disciplina é
  intercalado demais no PDF para reconstrução confiável — resolvemos nomes pelo código
  na matriz, não pelo texto do histórico.
- Regra descartada: houve uma verificação R8 (cruzar oferta × matriz) que foi
  **removida** porque penalizava disciplinas novas ainda não mapeadas. Não a reintroduza.

### Uma divergência oficial × prática já conhecida

A Consulta de Matriz lista **ICSX30 (TI2) como pré-requisito de ICSX40 (TC1)**, e o
sistema respeita isso. Na prática do curso, TI2 não trava TC1. Mantemos o dado oficial
como está; correções de vivência pertencem a uma futura camada de anotações, não ao
`matriz-981.json`.

---

## 6. Rodando e testando

```bash
npm install
npm run dev     # http://localhost:5173/Oasis-UTFPR/  (note o base path)
npm test        # vitest: fixture sintética (sempre) + históricos reais (skip se ausentes)
npm run build   # tsc -b && vite build
```

- `vite.config.ts` define `base: "/Oasis-UTFPR/"` (necessário para o GitHub Pages).
  Se o nome do repositório mudar, ajuste o base **e** os fetches de assets.
- Os testes reais (`tests/historico-real.test.ts`) usam `describe.skipIf` para os PDFs
  do dono; em CI/outra máquina eles são pulados e a fixture sintética
  (`tests/historico-sintetico.test.ts` + `tests/fixtures/historico-sintetico.pdf`) roda
  sempre. Ao mexer no parser, atualize a fixture sintética para cobrir o novo caso.
- Em Node, o `pdfjs-dist` precisa do build legacy — já há alias em `vite.config.ts`.

---

## 7. Convenções

- **Idioma**: código, identificadores, comentários e mensagens de commit em português.
- **Nomes de tipos/campos**: seguem o domínio (`PerfilAluno`, `resumoConjuntos`,
  `chFaltante`), não jargão em inglês.
- **Identidade visual**: amarelo UTFPR (`--color-utfpr-*` em `src/index.css`) como cor
  de **acento** sobre base neutra (zinc); temas claro e escuro. **Não** derive cores do
  nome "Oásis" (areia foi explicitamente vetada). O nome do produto pode mudar; não o
  amarre à identidade visual.
- **Dados pessoais**: jamais versione histórico de aluno, `PerfilAluno` serializado, ou
  qualquer saída do `perfil-cli.ts`. `.gitignore` cobre `*.pdf`, `historico*.json`,
  `perfil*.json` — mantenha essa proteção.
- **Contadores de carga horária** vêm das tabelas-resumo do próprio histórico (fonte
  oficial já consolidada pela UTFPR), não de recontagem nossa. A matriz entra para
  nomear, classificar e detectar inconsistências.

---

## 8. Git e GitHub

- Trabalhe na `main` (repo pequeno, um mantenedor). Commits pequenos e descritivos.
- Antes de commitar dados: rode o validador correspondente (§4) e garanta 0 erros.
- Antes de commitar código: `npm test` e `npm run build` limpos.
- CI/CD: `.github/workflows/deploy.yml` roda testes e publica no Pages a cada push na
  `main`. Se os testes falharem, o deploy não acontece.
- **Releia a §0 antes de cada commit.** Autor = só o dono; zero co-autoria de IA.

---

## 9. Roadmap (estado e próximos passos)

Entregue (M1+M2): camada de dados validada; parser de histórico no navegador; motor de
regras; app React com as três telas; deploy automático. Validado visualmente com dois
históricos reais.

A seguir, na ordem sugerida: separar múltiplos professores por turma; planos A/B/C de
grade + filtros de preferência de horário ("sem aulas de manhã"); previsão de formatura
com caminho crítico (a cadeia TI1→TI2→TC1→TC2 é o gargalo); grafo interativo de
pré-requisitos; export da grade como imagem. **Fase 2** (só com decisão do dono):
camada de comunidade (avaliações de professores, materiais, dicas) e base de disciplinas
de outros cursos cursáveis como eletivas — aí entra a discussão de persistência/servidor.

---

Em caso de dúvida sobre escopo, privacidade ou uma anomalia nova de dados: **pergunte ao
dono do projeto** em vez de assumir. E, novamente: nenhuma LLM se credita aqui.
