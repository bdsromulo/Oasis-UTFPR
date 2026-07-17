# REPOSITORIO.md — Guia e Contrato para Agentes (LLMs) e Mantenedores do Oásis UTFPR

Este documento é o **contrato de trabalho e manual canônico de arquitetura** para qualquer assistente de IA ou desenvolvedor que atue neste repositório. Leia-o **inteiro** antes de qualquer alteração. Ele descreve o protocolo inviolável de autoria, a arquitetura em 3 camadas, o pipeline de dados, a metodologia de validação e a estrutura documental do projeto.

---

## 0. Protocolo de Autoria — INVIOLÁVEL

**Nenhuma LLM ou IA pode se autocreditar em nada versionado neste repositório.** Isto vale para qualquer assistente (Claude Code, Gemini, Antigravity, GPT, Llama ou outro), em qualquer contexto e ferramenta.

**Proibido, sem exceção:**
- Trailers `Co-Authored-By:` citando uma IA em mensagens de commit.
- Trailers `Co-Authored-By:` de qualquer pessoa que não seja o mantenedor do commit.
- "Generated with", "Assisted by", créditos de IA, emojis de robô (🤖), ou assinaturas em mensagens de commit, corpos de PR, comentários de código ou arquivos versionados.
- Adicionar a IA como contribuidora no Git ou GitHub.

**Obrigatório:**
- Todo commit tem como autor **exclusivamente o dono do projeto** (`Rômulo Silva <romulo.supersons@gmail.com>`). Confirme sempre com `git log --format="%an <%ae>" -1` após commitar.
- A configuração `.claude/settings.json` traz `includeCoAuthoredBy: false`. Mantenha intacta.
- Mensagens de commit descrevem **o quê e por quê**, em português, de forma clara e limpa.

---

## 1. O que é o projeto e Metodologia de Desenvolvimento

O **Oásis UTFPR** é uma plataforma web moderna, local-first e independente desenvolvida por alunos para alunos do curso de **Bacharelado em Sistemas de Informação (BSI) da UTFPR Câmpus Curitiba, matriz 981**. Permite que o estudante acompanhe sua situação curricular (concluídas, pendentes, coeficientes), verifique o que pode cursar, monte a grade horária ideal e confira trilhas e horas extensionistas.

### Metodologia e Escalação de Trabalho
Atualmente, o projeto adota uma metodologia de **Desenvolvimento Ágil Individual com Vibe Coding / IA Assistida (Antigravity & Claude Code)**. Para garantir escalabilidade e transição suave para **trabalho grupal de mantenedores no futuro**, a documentação é dividida em **três documentos canônicos especializados**:

1. **`REPOSITORIO.md` (Este arquivo):** O manual arquitetural, regras invioláveis, pipeline de extração de dados e como navegar e testar o repositório.
2. **`Estrategia.md`:** O planejamento estratégico de produto, Engenharia de Requisitos, Governança de Informação (GI, PETI, PEN), Dimensões e Atributos de Qualidade da Informação (`d1: Atualidade`) e diretrizes de Interação Humano-Computador (IHC/Heurísticas).
3. **`Tasks.md`:** O backlog operacional vivo e rastreador de tarefas divididas em *Concluídas*, *Pendentes (Prio Alta/Média)* e *Backlog / Futuro*.

### Princípios de Produto
- **Local-first & Privacidade Absoluta:** O processamento de históricos escolares é executado 100% no navegador (`pdfjs-dist`). Nenhum dado pessoal é transmitido a servidores externos.
- **100% Estático:** O site é hospedado no GitHub Pages (`base: "/Oasis-UTFPR/"`).
- **Erro Alto > Erro Silencioso:** Validações de importação de dados (`validate_matriz.py`, `validate_turmas.py`) bloqueiam a ingestão se houver qualquer linha não justificada (`0 ERROS`).
- **Fidelidade à Fonte vs. Vivência Prática:** Os arquivos `data/` refletem os documentos oficiais da universidade. Correções da vivência (ex.: pré-requisito de TC1 que na prática não trava) entram em camada de anotação/regras específica do domínio, nunca adulterando o dado cru oficial.

---

## 2. Como Navegar no Repositório (Estrutura de Pastas)

```text
oasis-utfpr/
├── REPOSITORIO.md            # Contrato de trabalho e manual arquitetural (este arquivo)
├── Estrategia.md             # Planejamento estratégico, GI (PEN/PETI/Processos) e IHC
├── Tasks.md                  # Backlog vivo de tarefas e features
├── CLAUDE.md                 # Resumo rápido de diretrizes para IAs
├── index.html                # Ponto de entrada web (carrega fontes Outfit/Plus Jakarta Sans)
├── data/                     # JSONs canônicos servidos à aplicação estática
│   ├── matriz-981.json       # Matriz curricular de BSI 981 (150 disciplinas categorizadas)
│   └── turmas/               # Ofertas semestrais de disciplinas e horários
│       ├── 2026-1.json       # Oferta primária gerada via PDF do Portal do Aluno
│       └── 2025-2.json       # Oferta secundária (Grade na Hora)
├── tools/                    # Pipeline de extração e validação de dados em Python 3
│   ├── parse_matriz.py       # Extrai Lista de Matérias PDF -> matriz-981.json
│   ├── validate_matriz.py    # Valida invariantes M1 a M7 da matriz
│   ├── parse_turmas_pdf.py   # Extrai PDF de Turmas Abertas -> turmas/<sem>.json
│   ├── validate_turmas.py    # Valida invariantes R1 a R7 das turmas
│   └── parse_gnh.py          # Leitor secundário de JSON do Grade na Hora
├── src/                      # Código fonte da aplicação web (Vite + React 19 + TypeScript)
│   ├── index.css             # Tokens Tailwind v4 e estilos base (--color-utfpr-*)
│   ├── main.tsx              # Montagem do React no DOM
│   ├── domain/               # Lógica de negócio pura (sem dependências de UI/React)
│   │   ├── tipos.ts          # Contratos canônicos de dados (Matriz, Oferta, Perfil)
│   │   ├── historico/        # Leitura de posições PDF e parser de histórico
│   │   └── motor/            # Regras de situação curricular, elegibilidade e choques de grade
│   └── ui/                   # Camada visual React + Tailwind
│       ├── App.tsx           # Orquestrador de estado e cabeçalho da plataforma
│       ├── componentes.tsx   # Componentes base (Card, Botao, Badge, Barra)
│       ├── icons.tsx         # Ícones SVG minimalistas (sem emojis) e LogoUTFPR
│       └── telas/            # Telas especializadas (Situacao, PossoCursar, Grade)
└── tests/                    # Suíte de testes automatizados (Vitest)
    ├── fixtures/             # PDFs e arquivos sintéticos de teste (aluno fictício)
    ├── historico-sintetico.test.ts # Testes que rodam sempre em CI/CD
    └── historico-real.test.ts      # Testes locais com históricos de mantenedores (skip em CI)
```

---

## 3. Arquitetura em Três Camadas Estratificadas

Respeite os limites arquiteturais: a lógica de domínio (`src/domain/`) não importa React nem classes CSS; a interface visual (`src/ui/`) apenas consome dados do domínio e aciona eventos.

1. **Camada 1 — Dados e Pipeline (`data/` + `tools/`):**
   - Extração posicional por colunas (`COLS`) no `parse_turmas_pdf.py` a partir do PDF oficial.
   - Auditoria rigorosa nos validadores: **Regras R1 a R7** para turmas e **M1 a M7** para matriz.

2. **Camada 2 — Domínio (`src/domain/`):**
   - `historico/parser.ts`: Transforma texto extraído em `PerfilAluno` (identificando matérias aprovadas por equivalência, aproveitamento ou notas).
   - `motor/situacao.ts`: Converte perfil nas métricas de cumprimento de 1º estrato, 2º estrato, ciclo de humanidades, trilhas em computação e horas de extensão.
   - `motor/elegiveis.ts`: Cruza matérias aprovadas com pré-requisitos da matriz e turmas ativas no semestre.
   - `motor/grade.ts`: Detecta choques de horário (`turno + aula`) e divergências de sede (`Centro`, `Ecoville`, `Neoville`) em um mesmo turno.

3. **Camada 3 — Interface Visual (`src/ui/`):**
   - **Design Aesthetics:** Visual limpo, sem emojis, tipografia de alta fidelidade com `Outfit` (cabeçalhos) e `Plus Jakarta Sans` (corpo), paleta neutra `zinc` contrastando com amarelo dourado `utfpr` (`--color-utfpr-500`).
   - Ícones estritamente vetoriais em `src/ui/icons.tsx`.

---

## 4. Rodando, Testando e Validando

```bash
# Instalar dependências Node
npm install

# Rodar servidor de desenvolvimento local
npm run dev

# Rodar suíte completa de testes automatizados (Obrigatório antes de qualquer push)
npm test -- --run

# Gerar build de produção para checagem de tipos e bundle
npm run build

# Validação do pipeline de dados (quando atualizar PDFs de turmas ou matriz)
python tools/validate_turmas.py "Turmas Abertas - Portal do Aluno UTFPR.pdf" data/turmas/2026-1.json
python tools/validate_matriz.py
```

---

## 5. Regras de Contribuição e Manutenção
- Toda nova funcionalidade deve ser planejada e registrada primeiro em `Tasks.md`.
- Se a feature envolver mudanças de arquitetura de informação ou usabilidade, consulte e registre em `Estrategia.md`.
- Garantir que `git status` esteja limpo e que `npm test` e `npm run build` tenham sido executados localmente com sucesso antes de concluir uma tarefa.

---

## 6. Registro de Feedbacks de IHC e Refinamentos de UX/UI Concluídos
Este repositório consolida as seguintes definições canônicas de interface e experiência (feedback contínuo dos mantenedores e usuários BSI):

1. **Navegação Principal Estratificada (`App.tsx`):**
   - **Abas de Nível Superior:** Separadas de forma limpa em **`Minha Situação`** (`situacao`), **`Planejamento de Matrícula`** (`planejamento`) e **`Catálogo de Matérias`** (`catalogo`).
   - **Bloqueio Dinâmico sem Histórico:** Quando o estudante acessa a plataforma no Modo Livre sem um PDF carregado (`!perfil`), ele cai diretamente na aba de *Planejamento de Matrícula*. A aba *Minha Situação* é bloqueada (`disabled={!perfil}`) com ícone de cadeado 🔒 e tooltip orientando a importação em Configurações. Ao carregar o PDF, a aba é liberada automaticamente.

2. **Hierarquia e Posição dos Comutadores de Layout (`App.tsx` & `PossoCursar.tsx`):**
   - O seletor de visualização (`Layout Oásis` vs. `Layout Grade na Hora`) não reside no cabeçalho superior global nem no final da página do feed.
   - Ele está posicionado **diretamente no cabeçalho da sub-navegação de Planejamento de Matrícula**, ao lado das abas `Posso Cursar` e `Minha Grade`, eliminando duplicidades e apresentando o controle exatamente no momento de escolha de horários.

3. **Catálogo e Lista Completa de Disciplinas por Estrato (`Catalogo.tsx`):**
   - Todos os cards de estrato em *Minha Situação* (`Obrigatórias (1º estrato)`, `2º Estrato`, `Ciclo de Humanidades`, `Eletivas`, `Extensão`) permitem clique no card inteiro ou no link de rodapé para abrir a tela dedicada **`Catálogo e Lista de Matérias do Curso`** já filtrada para o estrato selecionado.
   - O catálogo oferece abas de filtro por estrato, filtro rápido por status (`Todas`, `Concluídas`, `Pendentes`) e barra de busca por código ou nome com normalização de acentos e case-insensitive.

4. **Visão Sintetizada vs. Expandida das Trilhas (3º Estrato):**
   - **No Menu Principal (*Minha Situação*):** As Trilhas em Computação são exibidas em **bloco único sintetizado** (`CardTrilhasResumo`), consolidando as metas globais do estrato: total de trilhas validadas (`X de 3 trilhas`), carga horária total acumulada vs. mínima exigida (`345h`) e saldo de horas excedentes (`+Xh acima do mínimo`).
   - **Na Visão Expandida (*Catálogo -> Trilhas*):** Ao clicar no bloco sintetizado, o usuário acessa o detalhamento de cada uma das 6 trilhas, com barras de progresso individuais e listagem completa de disciplinas vinculadas com status (`OK`, `Oferta no semestre`, `Pendente`).

5. **Terminologia Limpa e Feedbacks Interativos (`Situacao.tsx`):**
   - O título para disciplinas faltantes em cards foi padronizado de `Pendentemente:` para **`Pendente:`**.
   - Qualquer menção a códigos de disciplina em *Minha Situação* (lista de pendentes, dependências, avisos de importação) passa pela função `renderizarTextoComCodigos`, recebendo sublinhado interativo pontilhado e revelando em tooltip instantâneo o código, nome completo, período e carga horária.
