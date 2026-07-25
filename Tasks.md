# Tasks.md — Backlog Vivo e Rastreador de Tarefas do Oásis UTFPR

Este arquivo é o **rastreador operacional vivo** do projeto. Ele é atualizado a cada avanço significativo ou nova funcionalidade planejada, servindo como ponto de sincronização entre o mantenedor, assistentes de IA e futuros colaboradores.

---

## 1. Tarefas Concluídas (`[x]`)

### Núcleo de Dados e Pipeline (Python & Domínio)
- `[x]` **Auditoria e Validação Rigorosa de Dados:** Criação dos scripts `tools/validate_matriz.py` e `tools/validate_turmas.py` aplicando invariantes `M1-M7` e `R1-R7` para reprovar silenciosamente qualquer erro ou linha espúria (`0 erros`).
- `[x]` **Ingestão de Histórico via PDF (`historico/parser.ts`):** Extração 100% no navegador (via `pdfjs-dist`) de código, nome, créditos, semestre, nota/frequência e status (`Aprovado`, `Equivalência`, `Aproveitamento`, `Matriculado`, `Dependência`).
- `[x]` **Motor de Progresso e Situação (`motor/situacao.ts`):** Cálculo de 1º estrato (obrigatórias e faltantes), 2º estrato, Ciclo de Humanidades, Eletivas, Extensão Universitária e Coeficiente de Rendimento Absoluto e Normalizado.
- `[x]` **Motor de Elegibilidade ("Posso Cursar"):** Verificação de pré-requisitos cumpridos em tempo real para liberação de matrícula nas turmas ofertadas em `2026-1`.
- `[x]` **Motor de Grade e Choques (`motor/grade.ts`):** Detecção de colisões no mesmo slot (`M1..N5`) e detecção de conflitos de deslocamento físico no mesmo turno entre sedes distintas (`Centro`, `Ecoville`, `Neoville`).
- `[x]` **Exportador de Relatório para Matrícula:** Botão de cópia no formato de códigos limpos para digitação rápida no Portal do Aluno.
- `[x]` **Motor de Gamificação e Simulação de Impacto da Grade (`motor/progressoGrade.ts`):** Para cada disciplina adicionada à grade em construção, calcula em tempo real o *impulso* que ela dá a cada categoria curricular (Obrigatórias/1º Estrato, 2º Estrato, Ciclo de Humanidades, Trilhas do 3º Estrato, Eletivas, Extensão e Estágio), cruzando `cumpridoBase` (histórico) com o `previewCarga` da grade para exibir o `cumpridoSimulado` — transformando a montagem da grade em avanço visível de integralização.
- `[x]` **TASK-16 — Integração da Oferta e Progressão de Engenharia de Computação (844):**
  - Turmas externas são ligadas à matriz por código, equivalência ou nome; a origem da oferta não determina se a disciplina conta no curso.
  - As Optativas Isoladas (conjunto 973) somam para as 270h do bloco optativo, mas não validam uma das duas trilhas obrigatórias.
  - Situação, Catálogo, Grade Mágica, impacto da grade e Simulador de Formatura foram parametrizados para duas trilhas, sem estratos e sem extensão curricular.
  - O curso ativo passa a acompanhar a matriz detectada no histórico; o Catálogo deriva os períodos da matriz 844 até o 10º e abre as pendências ao clicar em “Exibir Lista”.
  - Auditoria local contra um histórico real da 844 confirmou os totais oficiais e corrigiu dois desvios: faltantes do 10º período agora são lidas; horas optativas aprovadas são preservadas separadamente das horas já validadas pela regra das duas trilhas.
  - Regressões cobertas por `tests/regressao-engcomp.test.ts`, sem uso de histórico pessoal.

### Interface Visual e Experiência do Usuário (UI/UX)
- `[x]` **Repaginada Visual Completa (Remoção da "Cara de IA"):** Subscrição integral de todos os emojis decorativos e fontes padrão de sistema por uma identidade de produto digital de alta fidelidade.
- `[x]` **Tipografia Personalizada:** Integração com Google Fonts utilizando **`Outfit`** (`--font-display`) para cabeçalhos e **`Plus Jakarta Sans`** (`--font-sans`) para o corpo e números.
- `[x]` **Biblioteca Vetorial de Ícones (`src/ui/icons.tsx`):** Criação de ícones minimalistas (estilo Lucide, `stroke-width: 1.75`) e da representação vetorial geométrica oficial da **Logo da UTFPR** (`LogoUTFPR`) para o cabeçalho.
- `[x]` **Suporte a Modo Claro e Escuro (`index.css`):** Tokens Tailwind v4 estruturados (`--color-utfpr-*`, `bg-zinc-50 dark:bg-zinc-950`).
- `[x]` **Suíte de Testes Vitest Completa:** `11/11 passed` (5 sintéticos em CI + 6 com históricos reais locais, com skip automático em CI), validando tanto cenários sintéticos complexos quanto os históricos reais dos mantenedores.

### Segurança e Privacidade (Hardening)
- `[x]` **Auto-hospedagem de Fontes (Zero CDN Externo):** Substituição do `<link>` do Google Fonts por pacotes `@fontsource` empacotados no bundle (`Outfit` + `Plus Jakarta Sans`), eliminando a única requisição de rede externa e o vazamento de IP/referer ao Google — coerência real com o discurso de privacidade absoluta.
- `[x]` **Content-Security-Policy no Build de Produção:** Plugin do Vite injeta uma CSP restritiva (`default-src 'self'`, sem `unsafe-eval`) apenas no build, calculando automaticamente o hash SHA-256 do script inline de tema para nunca dessincronizar. Verificada em runtime (fontes, worker do pdf.js e script anti-flicker sem violações).
- `[x]` **Modo Privado de Sessão:** Toggle em Configurações que passa a guardar o histórico apenas em `sessionStorage` (apagado ao fechar a aba) em vez de `localStorage`, protegendo dados em máquina compartilhada; migração automática ao alternar.

---

## 2. Tarefas Pendentes (`[/]` ou `[ ]`)

### Prioridade Alta (Próximo Ciclo de Desenvolvimento)
- `[/]` **TASK-19 — Implementar Engenharia Eletrônica (matriz 968):**
  - `[x]` **Turmas 2026-2 importadas e validadas** (`data/eng-eletronica/turmas/2026-2.json`): 145 disciplinas, 330 turmas, 966 horários, **0 erros** em `validate_turmas.py`. O `parse_turmas_pdf.py` passou a rotular o curso pelo cabeçalho da fonte também para `ENG ELETRÔNICA`.
  - `[x]` **Estrutura da 968 conferida contra histórico real**: obrigatórias 1710h, optativas 2385h, extensão 465h, eletivas 0h — a matriz extraída bate exatamente com o Quadro Resumo do histórico. A 968 concentra o curso em "Opções" (escolha dentro de cada grupo), por isso o bloco optativo é maior que o obrigatório; não é erro de leitura.
  - `[ ]` **Parser da matriz: capturar o 3º nível de aninhamento.** `parse_matriz.py` lê até o conjunto 1226, mas não cria `1227 Fundamentos`, `1228 Unidades Curriculares Formadoras`, `1229 Aplicações`, `1230 Programação`, `1231 Armazenamento`, `1232 Hardware` e `1233 Conexão` — 11 disciplinas ficam apontando para conjuntos inexistentes. A hierarquia real é `1180 Trilhas de Aprofundamento → {1181..1184, 1226} → 1226 Sistemas IoT → {1227, 1228, 1229} → 1228 → {1230..1233}`.
  - `[ ]` **Corrigir carga horária zerada**: `ELB11` (a fonte diz 45h), `ELTD12` e `ELTD13` (têm CHEAD 60 e total 0) saem com `horas.total: 0`.
  - `[ ]` `validate_matriz_968.py` nos moldes do `_962`, incluindo a checagem de que todo conjunto citado existe e de que as cargas batem com o Quadro Resumo.
  - `[ ]` Descritor do curso em `cursos.ts` (agregador de trilhas 1180, Ciclo de Humanidades 1174, os grupos "Opções de…" como categorias próprias) e motores de situação/progresso/simulador.
  - `[ ]` `Eng. Eletrônica` + `968 (Nova)` no `Checkin.tsx` só depois de dados, motores e regressões prontos.
  - Decisão do dono: **motor específico por curso por enquanto** — não generalizar as regras agora.
- `[/]` **TASK-18 — Página "Como Usar o Site" (manual da plataforma):**
  - **Gatilho:** botão com o ícone `?` no cabeçalho, vizinho ao "Sobre" e à engrenagem, acessível em qualquer ambiente (antes e depois do check-in). Ao passar o mouse, exibe o tooltip *"Como Usar o Site"*; ao clicar, abre a página.
  - **Conteúdo por tela:** para cada página da plataforma (Minha Situação, Catálogo, Trilhas, Posso Cursar, Grade, Layout Grade na Hora, Fluxograma, Simulador de Formatura, Amigos/Match, Configurações), descrever *o que ela mostra*, *quais interações são possíveis* e *o que a alimenta*.
  - **Princípios:** explicitar os princípios que regem a plataforma — local-first, leitura fiel da fonte (erro alto > erro silencioso), dado oficial versus dado provisório (Pré-Matrícula) e ausência de backend.
  - **Como o histórico é lido:** explicar que o PDF passa por um **parser** que roda no navegador, extraindo disciplinas, notas, situação e os quadros-resumo — e que é isso que personaliza todas as telas.
  - **De onde vêm os dados (as cinco fontes):**
    1. o **próprio histórico** do aluno (client-side, nunca enviado);
    2. **coleta coletiva de vivências** dos estudantes, que corrige o que a burocracia não reflete (ex.: pré-requisito que na prática não trava);
    3. **Projetos Pedagógicos de Curso (PPCs)**;
    4. **Matrizes curriculares** oficiais;
    5. **relação de Turmas Abertas** de cada semestre, do Portal do Aluno.
  - **Semestres anteriores:** documentar que as ofertas passadas são alimentadas a partir dos dados do **Grade na Hora**, e não do Portal.
  - Reaproveitar a estrutura visual de `TelaSobre.tsx` (seções numeradas, `Card`, `Badge`) para manter coerência entre as páginas institucionais.
- `[ ]` **TASK-17 — Implementar Engenharia de Computação — Matriz 962:**
  - Obter e validar a matriz curricular oficial, seus conjuntos, cargas, equivalências, pré-requisitos e regras próprias, sem herdar automaticamente as regras da 844.
  - Importar e validar as Turmas Abertas correspondentes e parametrizar situação, catálogo, elegibilidade, grade, simulador e progressão.
  - Só habilitar a opção `962 (Nova)` no check-in depois de dados, motores e regressões estarem completos.
- `[x]` **TASK-01 — Tela de Configurações Centralizada & Identidade Visual:**
  - `a)` Seletor explícito e sincronizado de tema: Modo Claro, Modo Escuro e Seguir Sistema (`--font-display`, script inline no `index.html` para zero flicker, e toggle interativo no Navbar e Modal).
  - `b)` Carregar histórico mais atualizado sem perder preferências de layout ou grade.
  - `c)` Limpar dados do site (`localStorage.clear()` com verificação em duas etapas).
  - `d)` Trocar usuário / Encerrar sessão local (retornando ao Check-in).
  - `e)` Preferências de layout (alternar entre visual *Layout Oásis* e *Layout Grade na Hora*).
  - `f)` Ícone (`favicon.svg`/`.ico`) e Logo do site monocromáticos minimalistas em linha-vetorial, substituindo o T antigo e elementos decorativos.
- `[x]` **TASK-02 — Onboarding Resumido (Acesso Sem Submissão) e Check-in de Câmpus/Curso/Matriz:**
  - Opção na tela inicial: *"Continuar sem meus registros (Grade na Hora)"* com perfil nulo liberando todas as turmas em Modo Livre.
  - Menu de Check-in estruturado com busca/seleção separada para **Câmpus**, **Curso** e **Matriz**. Engenharia aparece como `Eng. Comp.`; a 844 está disponível e a 962 fica visível como próxima matriz, ainda indisponível.
- `[x]` **TASK-05A — Ordenação Alfabética, Toggles de Turmas e Filtro de Conflitos:**
  - Ordenação alfabética pelo nome completo da matéria tanto em *Posso Cursar* quanto em *Layout Grade na Hora*.
  - Toggles de horários por disciplina (`▼ X turmas` / `▲ ocultar`) fechados por padrão em ambas as visões para evitar poluição visual.
  - Opção nas Configurações de *"Filtrar horários que não encaixam"*, desativada por padrão, que remove do feed em tempo real turmas e disciplinas conflitantes com as seleções ativas na grade.
- `[x]` **TASK-05B — Cesta de Grades Alternativas (Grades A, B e C) e Tooltips de Preview:**
  - Sistema multi-grade na minigrade lateral e no cabeçalho da *Tela Grade* exibe layout em abas compactas (`[ A ] [ + ]`), permitindo criar, alternar e remover cenários de grade livremente.
  - Exibição de código e nome completo da disciplina no card de preview ao passar o mouse.
- `[x]` **TASK-03 — Tooltips e Feedbacks Visuais sobre Códigos de Disciplinas:**
  - Em *"Minha Situação"* e onde houver códigos soltos (ex.: `ICSW31` na lista de faltantes ou em avisos), o código deve ser renderizado com sublinhado interativo (`underline decoration-dotted` ou badge com ícone i).
  - Ao passar o mouse (`hover`), revelar imediatamente um tooltip limpo com o nome completo da matéria e créditos.
- `[x]` **TASK-04 — Visualização Detalhada de Matérias Concluídas por Categoria:**
  - Na aba *"Minha Situação"*, permitir clicar sobre os botões unificados de "Exibir Lista" nos cards dos estratos (`Obrigatórias`, `2º Estrato`, `Humanidades`, `Eletivas`, `Extensão`) para abrir o Catálogo com filtro pré-definido e toggle de ordenação minimalista.
- `[x]` **TASK-05C — Remoção Rápida na Grade (Loop de Edição Estilo GNH):**
  - Na minigrade lateral, na grade modal completa e nos blocos da tabela visual em *Grade*, o hover sobre qualquer disciplina revela um botão "X" instantâneo (`×`) no canto do item, permitindo exclusão em um clique sem sair da tela.
- `[x]` **TASK-05D — Estados e Modos de Planejamento do Semestre:**
  - Implementação de dois modos essenciais nas Configurações e no topo do site: a) *Em prévia de matrícula* (oficial, divulgado no período de matrícula); b) *Em período corrido de semestre* (simulação com base em dados de semestres anteriores).

### Prioridade Média
- `[/]` **TASK-06 — Configurações Avançadas e Motor de Recomendação de Grade (Grade Mágica):**
  - Especificação e desenho algorítmico do sistema de recomendação combinatória e pontuação multicritério (ver `REPOSITORIO.md`).
  - Preferências do motor de sugestão (ex.: "evitar aulas às 07h30", "preferir turmas no Câmpus Centro", "maximizar créditos").
  - Opção para exportar o perfil processado e a grade montada em um arquivo JSON local para backup seguro.
- `[ ]` **TASK-07 — Página Própria / Modal Detalhado por Disciplina:**
  - Ao clicar no nome de qualquer matéria, abrir um painel/modal ou rota dedicada contendo:
    - `a) Horários ofertados atualmente:` Turmas abertas no semestre letivo ativo.
    - `b) Histórico temporal de ofertas:` Registros de semestres passados (`2025.2`, `2026.1`), normalizados como *"1º Semestre do Ano"* ou *"2º Semestre do Ano"*, revelando o padrão de abertura (se é ofertada todo semestre ou apenas em um) e os horários em que costuma abrir.
    - `c) Professores e turmas disponíveis:` Listagem `Professor X — Turma S7X` indicando a prioridade de alocação para alunos de BSI (`Prioridade 1`, `Prioridade 2` ou `Sem prioridade`).

---

## 3. Tarefas em Backlog / Visão Futura (`[ ]`)

- `[ ]` **TASK-08 — Seção de Feedbacks, Acervo e Documentações de Professores:**
  - Dentro da página própria da disciplina/turma, abrir espaço (via repositório auxiliar ou marcações locais) para agregar documentações antigas, ementas detalhadas e feedbacks construtivos da vivência dos estudantes.
  - **Governança:** avaliações direcionadas a professores são camada distinta e mais sensível (risco de difamação/LGPD) da avaliação de dificuldade da disciplina descrita na TASK-13 — exigem moderação reforçada e devem ser mantidas separadas.

- `[ ]` **TASK-13 — Sistema de Avaliações da Comunidade por Disciplina (Dificuldade + Comentário):**
  - Em cada disciplina já **concluída** pelo aluno (validada no próprio histórico local), expor um botão *Avaliar*: nota de **dificuldade de 1 a 3 estrelas** e comentário textual opcional. A informação agregada (dificuldade média + comentários) é redistribuída a todos os usuários e exibida na página da disciplina (TASK-07).
  - **Autenticação por vínculo:** cada review é atrelada ao RA do aluno, autenticado pela submissão do próprio histórico + prova de vínculo institucional, com no máximo **uma avaliação por (aluno, disciplina)** (upsert idempotente), inibindo spam e Sybil.
  - **Decisão de infraestrutura pendente (viola RNF02 — "Sem backend" até decisão explícita do dono):** o compartilhamento de reviews entre usuários exige *alguma* camada compartilhada. Ver seção dedicada em `Estrategia.md` (§5 — Arquitetura da Camada de Comunidade) com o trade-off de privacidade/segurança e a recomendação de backend gerenciado mínimo (BaaS) + verificação por e-mail institucional. Nenhuma linha de backend é escrita antes da homologação do dono.
  - **Minimização de dados (RNF06):** nunca enviar à rede o RA em claro, notas, CR, nome ou o PDF; enviar apenas o mínimo indispensável (código da disciplina, dificuldade, comentário e um token de vínculo derivado).
- `[ ]` **TASK-09 — Catálogo Colaborativo de Eletivas e Matérias Externas:**
  - Mapear histórico de alunos fundadores (Yago, Rômulo, Namie) e identificar disciplinas cursadas em outros cursos da UTFPR que foram validadas como Eletivas ou Extensão para BSI, recomendando-as para futuros estudantes.
- `[ ]` **TASK-10 — Portal de Administração (Repositório / Subdomínio Dedicado):**
  - Criação de uma plataforma de gestão separada, protegida por autenticação (ou subdomínio com senha), onde os administradores do projeto poderão curar, alterar e homologar dados semestrais e descrições de turmas através de uma interface visual sem precisar editar arquivos JSON manualmente no Git.
- `[ ]` **TASK-11 — Evolução para Trabalho Grupal / Multi-Agente:**
  - Transição da metodologia solo de Vibe Coding para um fluxo de contribuição open-source em equipe, com templates de PR, CI/CD automatizado no GitHub Actions rodando `vitest` e validadores de invariantes antes do merge em `main`.
- `[ ]` **TASK-12 — Linha do Tempo Curricular e Análise de Progressão Longitudinal (Comparativo Multi-Histórico):**
  - Permitir que o estudante armazene mais de um Histórico Escolar (`perfil`) localmente em `localStorage`/`IndexedDB`, criando uma linha do tempo/histórico temporal de emissões (`[Histórico 2024.2] -> [Histórico 2025.1] -> [Histórico 2026.1]`).
  - Implementar tela ou modal de **Relatório de Progressão**, calculando e visualizando graficamente a variação longitudinal de Coeficiente de Rendimento (CR Absoluto/Normalizado), evolução de carga horária concluída por estrato e avanço nas trilhas semestre a semestre, sem expor nenhum dado à rede.
- `[x]` **TASK-14 — Validador de Turmas Independente da Fonte:**
  - O `tools/validate_turmas.py` confere o JSON gerado **contra o PDF de origem**, então não roda em oferta que não veio de PDF. É o caso das turmas de Eng. Comp. de 2025.2, extraídas do backup HTML do Grade na Hora por `tools/parse_gnh_html.py`: hoje esse arquivo entra em `data/` sem rede de proteção.
  - Implementado em `tools/validate_turmas_estrutura.py`: valida dia, turno, aula, sede, códigos e conflitos de local no mesmo slot para qualquer JSON de oferta. A repetição idêntica de horários do PDF é aceita, pois representa professores múltiplos da mesma turma.
  - Turma sem horário é aviso (legítimo em TCC e EaD); domínio inválido ou locais diferentes no mesmo slot são erros.

- `[ ]` **TASK-15 — Alinhar e Retificar a Exibição de CR Absoluto e CR Normalizado:**
  - No cabeçalho de *Minha Situação*, CR Absoluto e CR Normalizado aparecem lado a lado sem explicar a diferença entre eles nem por que divergem tanto (ex.: `0.7583` contra `0.5653` no mesmo histórico), e com pesos visuais diferentes — o CR Absoluto vem destacado em amarelo e o Normalizado em cor neutra, sugerindo hierarquia que não existe.
  - Padronizar o tratamento visual dos dois, deixar explícito qual é usado na **priorização de vagas na matrícula**, e explicar em tooltip como cada um é calculado.
  - Conferir os dois números contra o Histórico Escolar oficial antes de qualquer ajuste de layout: a retificação é de **exibição**, e o valor exibido tem de continuar sendo exatamente o que o Portal informa.
