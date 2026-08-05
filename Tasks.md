# Tasks.md — Backlog Vivo e Rastreador de Tarefas do Oásis UTFPR

Este arquivo é o **rastreador operacional vivo** do projeto. Ele é atualizado a cada avanço significativo ou nova funcionalidade planejada, servindo como ponto de sincronização entre o mantenedor, assistentes de IA e futuros colaboradores.

## Esquema de Status

Toda tarefa — seja **Feature** ou **Bug** — carrega exatamente um destes status:

- **Pendente** — ainda não iniciada.
- **Em Andamento** — sendo trabalhada em uma branch; não concluída nem validada; não foi pra `main`.
- **Em Revisão** — concluída e validada, mas ainda não testada apropriadamente (em branch ou já na própria `main`).
- **Concluída** — concluída, validada, testada e publicada na `main`.

> **Nota de consistência (2026-07-30):** o arquivo tinha duas tarefas diferentes numeradas `TASK-17` ("Simulador de Formatura" e "Implementar Engenharia de Computação — Matriz 962"). A segunda foi renumerada para **TASK-24** para eliminar a colisão de ID; nenhum conteúdo foi alterado, só o número.

---

## 1. Features

### Concluída

#### Núcleo de Dados e Pipeline (Python & Domínio)
- **Auditoria e Validação Rigorosa de Dados:** Criação dos scripts `tools/validate_matriz.py` e `tools/validate_turmas.py` aplicando invariantes `M1-M7` e `R1-R7` para reprovar silenciosamente qualquer erro ou linha espúria (`0 erros`).
- **Ingestão de Histórico via PDF (`historico/parser.ts`):** Extração 100% no navegador (via `pdfjs-dist`) de código, nome, créditos, semestre, nota/frequência e status (`Aprovado`, `Equivalência`, `Aproveitamento`, `Matriculado`, `Dependência`).
- **Motor de Progresso e Situação (`motor/situacao.ts`):** Cálculo de 1º estrato (obrigatórias e faltantes), 2º estrato, Ciclo de Humanidades, Eletivas, Extensão Universitária e Coeficiente de Rendimento Absoluto e Normalizado.
- **Motor de Elegibilidade ("Posso Cursar"):** Verificação de pré-requisitos cumpridos em tempo real para liberação de matrícula nas turmas ofertadas em `2026-1`.
- **Motor de Grade e Choques (`motor/grade.ts`):** Detecção de colisões no mesmo slot (`M1..N5`) e detecção de conflitos de deslocamento físico no mesmo turno entre sedes distintas (`Centro`, `Ecoville`, `Neoville`).
- **Exportador de Relatório para Matrícula:** Botão de cópia no formato de códigos limpos para digitação rápida no Portal do Aluno.
- **Motor de Gamificação e Simulação de Impacto da Grade (`motor/progressoGrade.ts`):** Para cada disciplina adicionada à grade em construção, calcula em tempo real o *impulso* que ela dá a cada categoria curricular (Obrigatórias/1º Estrato, 2º Estrato, Ciclo de Humanidades, Trilhas do 3º Estrato, Eletivas, Extensão e Estágio), cruzando `cumpridoBase` (histórico) com o `previewCarga` da grade para exibir o `cumpridoSimulado` — transformando a montagem da grade em avanço visível de integralização.
- **TASK-16 — Integração da Oferta e Progressão de Engenharia de Computação (844):**
  - Turmas externas são ligadas à matriz por código, equivalência ou nome; a origem da oferta não determina se a disciplina conta no curso.
  - As Optativas Isoladas (conjunto 973) somam para as 270h do bloco optativo, mas não validam uma das duas trilhas obrigatórias.
  - Situação, Catálogo, Grade Mágica, impacto da grade e Simulador de Formatura foram parametrizados para duas trilhas, sem estratos e sem extensão curricular.
  - O curso ativo passa a acompanhar a matriz detectada no histórico; o Catálogo deriva os períodos da matriz 844 até o 10º e abre as pendências ao clicar em "Exibir Lista".
  - Auditoria local contra um histórico real da 844 confirmou os totais oficiais e corrigiu dois desvios: faltantes do 10º período agora são lidas; horas optativas aprovadas são preservadas separadamente das horas já validadas pela regra das duas trilhas.
  - Regressões cobertas por `tests/regressao-engcomp.test.ts`, sem uso de histórico pessoal.
- **TASK-17 — Simulador de Formatura com oferta-espelho e via de duas mãos com o Planejamento:**
  - Cada semestre projetado passa a herdar a oferta real conhecida de **mesma paridade** (2026.2 usa a própria 2026.2; 2027.1 usa 2026.1; 2027.2 volta à 2026.2; 2028.1 à 2026.1) via `ofertaReferenciaDoSemestre`.
  - O motor reserva turma de verdade para cada disciplina que ocupa vaga e só a agenda se houver turma sem choque com as que já entraram no mesmo semestre; sem turma livre, a disciplina fica para o semestre seguinte. Antes a grade projetada chegava ao Planejamento acusando conflito entre matérias que o próprio simulador havia juntado.
  - A importação simulador → Planejamento repete a turma que o motor reservou, em vez de reescolher.
  - Caminho de volta (Planejamento → simulador): `gradeFixadaDaSelecao` + `OpcoesSimulacao.gradeFixada` fazem o semestre montado no Planejamento entrar na projeção como fato consumado, turma por turma, com os demais semestres calculados a partir dele. A tela mostra o crachá `DO PLANEJAMENTO` e permite descartar.
  - Uma turma ofertada não pode ser reservada duas vezes no mesmo semestre: em Eng. Comp. a lista larga de equivalentes levava `MA70G` e `MA70H` à mesma `MAT7ED/S01`, e `haveriaConflito` lê o par idêntico como "já está na grade" — a grade nascia batendo consigo mesma. A importação também deixou de forçar uma turma em choque quando não sobra turma livre (antes pegava a primeira de qualquer jeito).
  - Trilhas: o motor deixou de despejar o saldo do bloco optativo numa trilha já validada (chegava a 225h numa trilha de piso 90h) e depois pagar de novo as validações pendentes. A reserva considera o **custo real** de validar cada trilha-alvo restante, arredondado pelo tamanho das optativas disponíveis (validar 90h com optativas de 60h custa 120h). Excesso sobre o piso do bloco caiu de +120h/+105h/+165h para +15h (BSI) e +30h a +45h (844 e 962), sem perder nenhuma trilha validada.
  - Verificado nos três cursos servidos (981, 844, 962), ritmos 3 a 8: zero conflito interno, zero turma repetida, piso de trilhas sempre atendido quando a projeção fecha.
  - Regressões em `tests/simulador-formatura.test.ts` (grade sem choque interno em vários ritmos, com e sem histórico; espelho por paridade; round-trip da grade fixada; suíte parametrizada pelos quatro cursos).
  - **Complemento (TASK-19):** corrigir os períodos das trilhas da 962 mudou a ordem do guloso e reabriu o pagamento duplo — a trilha `1082`, de piso 90h, chegava a 180h e o bloco de 270h fechava em 345h. A reserva por `custoParaValidar` estima pela MENOR disciplina pendente da outra trilha, de propósito, para não bloquear escolha legítima; quando a disciplina que de fato abre é maior, a reserva fica curta e o excedente escorre para a trilha já validada. Regra nova: **trilha validada não recebe mais nada enquanto alguma trilha-alvo continuar aberta.** Excesso máximo caiu de 75h para 30h em BSI/844/962 e é 60h na 968, onde o piso de uma trilha é 270h montada em pedaços de 45h e 60h. O teste passou a cobrar a invariante forte **por trilha** (nenhuma passa do próprio piso por mais de uma disciplina dela), que é o que de fato distingue granularidade de pagamento duplo.
  - **Pendência de dados separada:** a matriz 844 declara equivalências que apontam para disciplinas de outra área (`CSF30` → `QBI7QE` "Química Geral Experimental"; `MA70H` → `MAT7ED` "Equações Diferenciais"). Afeta também Posso Cursar / Planejamento. Exige auditoria do PDF cru antes de qualquer correção.
- **TASK-19 — Implementar Engenharia Eletrônica (matriz 968):**
  - **Turmas 2026-2 importadas e validadas** (`data/eng-eletronica/turmas/2026-2.json`): 145 disciplinas, 330 turmas, 966 horários, **0 erros** em `validate_turmas.py`. O `parse_turmas_pdf.py` passou a rotular o curso pelo cabeçalho da fonte também para `ENG ELETRÔNICA`.
  - **Estrutura da 968 conferida contra histórico real**: obrigatórias 1710h, optativas 2385h, extensão 465h, eletivas 0h — a matriz extraída bate exatamente com o Quadro Resumo do histórico. A 968 concentra o curso em "Opções" (escolha dentro de cada grupo), por isso o bloco optativo é maior que o obrigatório; não é erro de leitura.
  - **Aninhamento dos conjuntos vira dado, e não intervalo no código.** A legenda da matriz declara `Período inicial/final` só nos conjuntos de topo; quem vem sem período é subárea do topo anterior. O `parse_matriz.py` passou a gravar `pai` em cada conjunto e a herdar o período do pai de verdade — antes as trilhas da 962 herdavam o período do Ciclo de Humanidades (02/10 em vez de 08/10) e as subáreas de humanidades da 968 saíam com 09/10.
  - **3º e 4º níveis (Sistemas IoT).** A legenda da matriz **não declara** `1227..1233`: só o Histórico Escolar os nomeia, nas tabelas "Detalhamento do Conjunto De Optativas". Em vez de inventar nomes no parser, eles entram por `data/eng-eletronica/conjuntos-968-complemento.json`, com a procedência registrada, via o 3º argumento do `parse_matriz.py`. Hierarquia final: `1180 → {1181..1186, 1226} → 1226 → {1227, 1228, 1229} → 1228 → {1230..1233}`.
  - **Carga horária zerada de `ELB11` (45h) — era bug do parser, e valia para os quatro cursos.** O PDF da 968 centraliza o cabeçalho da página, e o `968` de "Matriz: 968" caía dentro da faixa horizontal das colunas numéricas: entrava como aula prática, empurrava a fileira inteira e zerava a carga da **primeira disciplina de cada documento**. A leitura numérica passou a começar na fileira que traz o código da disciplina. `ENADEI`/`ENADEC` também voltaram a ser lidos como código único (na 962 um deles sobrescrevia o outro; na 968 duplicava).
  - **Disciplinas do 10º período.** O período era casado com `^\d$` — **nenhuma** disciplina de 10º período era lida em matriz nenhuma (`CSX43` e `EEF31` na 844; `ELEF30` e `ICSXG1` na 962; `ELE92` e `ENADEC` na 968 saíam com período nulo).
  - **`ELTD12`/`ELTD13` são anomalia da fonte, não do parser**: o PDF diz literalmente `CHEAD 60` e `carga horária total 0`. A carga real é a CHEAD, e a própria matriz confirma — sem elas a trilha `1184` ofertaria 240h para uma exigência de 300h. Registrado como regra A1 no validador.
  - `tools/validate_matriz_968.py`: invariantes M1–M7 mais a integridade da árvore de conjuntos (todo `pai` existe, sem ciclo, oferta ≥ exigência contando descendentes). **0 erros, 0 avisos.**
  - Descritor `ENG_ELETRONICA_968` em `cursos.ts` e `ENG_ELETRONICA` em `dadosCurso.ts`. As 2385h de optativas se dividem exatamente em `210h` Ciclo de Humanidades (1174) + `1875h` nos 25 grupos "Opções de…" + `300h` Trilhas de Aprofundamento (1180). As cinco trilhas validáveis são declaradas (`trilhas: [1181..1184, 1226]`), porque por exclusão os 25 grupos virariam trilha.
  - **Nova categoria `opcoes`** nos motores e telas: os grupos de escolha não são trilha nem obrigatória. Cada grupo tem carga própria e o simulador respeita o teto de cada um — sem isso ele fecharia as 1875h despejando tudo no grupo com mais oferta.
  - `Eng. Eletrônica` + `968 (Vigente)` liberados no `Checkin.tsx`.
  - **Auditoria contra histórico real da 968** (`tests/regressao-eletronica-968.test.ts`, bloco que pula onde o PDF não existe): 40 disciplinas lidas, **0 avisos do parser**, toda cursada casada com a matriz. A soma disciplina a disciplina reproduz o Quadro Resumo: **1095h** de obrigatórias (coluna C) e **795h** de optativas (coluna E). A soma dos 27 conjuntos de topo reproduz as **2385h** exigidas, as **795h** cursadas e as **675h** validadas.
  - **Grade Inteligente parametrizada pela 968.** Quatro defeitos corrigidos, todos da mesma família ("regra de BSI aplicada a outro curso"):
    - o teto de humanidades comparava `conjunto === 1174` direto e **nunca disparava** na 968, cujas matérias de humanidades ficam em `1213..1217`. Passou a subir a hierarquia, e o pedido "sem humanidades" voltou a valer.
    - os 25 grupos de escolha não tinham teto nenhum: a sugestão empilhava matéria em grupo já cumprido enquanto deixava outro intocado. Agora cada grupo tem teto próprio, e a pontuação prioriza o grupo que fecha neste semestre.
    - a sugestão punha `ELB11` **e** o equivalente `ELN73B` na mesma grade: a mesma matéria duas vezes, gastando uma vaga do semestre à toa. Consolidado pelo código canônico.
    - sem "Resumo Eletiva" no histórico, o motor caía num piso fixo de `120h` de eletivas — número de BSI. A 968 e a 962 declaram `cargas.eletiva: 0`, e a sugestão gastava duas vagas em matérias que o currículo não pede.
  - **Ofertas de `2026-1` e `2025-2` importadas** do backup do Grade na Hora (`data/eng-eletronica/turmas/`), com 0 erros no `validate_turmas_estrutura.py`. Com as duas paridades, o Simulador de Formatura deixou de espelhar uma oferta de semestre par nos semestres ímpares.
  - **`ELE91`/`ELE92` deixaram de sair com nome idêntico**: o "1"/"2" do fim do nome transborda a coluna por um ponto e caía em `[modelo]`. Nenhum modelo da fonte começa com dígito, então o dígito solto na frente do modelo é sempre o fim do nome.
  - Decisão do dono: **motor específico por curso por enquanto** — não generalizar as regras agora.

#### Interface Visual e Experiência do Usuário (UI/UX)
- **TASK-39 — Identidade curricular no Planejamento de Engenharia de Computação:**
  - A visão expandida das matrizes 844 e 962 ganhou um card próprio para `Optativas Isoladas`, deixando explícito que suas horas entram no bloco optativo sem validar uma trilha.
  - A busca aceita o código canônico da matriz, o código equivalente usado pela oferta, nome e professor.
  - O impacto da grade passa a resolver a identidade canônica antes da categoria: equivalentes mantêm sua categoria curricular e disciplinas externas à matriz entram como Eletivas.
  - A grade conserva o código canônico visível e identifica separadamente o código real da oferta usado no relatório de matrícula.
- **Repaginada Visual Completa (Remoção da "Cara de IA"):** Subscrição integral de todos os emojis decorativos e fontes padrão de sistema por uma identidade de produto digital de alta fidelidade.
- **Tipografia Personalizada:** Integração com Google Fonts utilizando **`Outfit`** (`--font-display`) para cabeçalhos e **`Plus Jakarta Sans`** (`--font-sans`) para o corpo e números.
- **Biblioteca Vetorial de Ícones (`src/ui/icons.tsx`):** Criação de ícones minimalistas (estilo Lucide, `stroke-width: 1.75`) e da representação vetorial geométrica oficial da **Logo da UTFPR** (`LogoUTFPR`) para o cabeçalho.
- **Suporte a Modo Claro e Escuro (`index.css`):** Tokens Tailwind v4 estruturados (`--color-utfpr-*`, `bg-zinc-50 dark:bg-zinc-950`).
- **Suíte de Testes Vitest Completa:** `11/11 passed` (5 sintéticos em CI + 6 com históricos reais locais, com skip automático em CI), validando tanto cenários sintéticos complexos quanto os históricos reais dos mantenedores.
- **TASK-01 — Tela de Configurações Centralizada & Identidade Visual:**
  - `a)` Seletor explícito e sincronizado de tema: Modo Claro, Modo Escuro e Seguir Sistema (`--font-display`, script inline no `index.html` para zero flicker, e toggle interativo no Navbar e Modal).
  - `b)` Carregar histórico mais atualizado sem perder preferências de layout ou grade.
  - `c)` Limpar dados do site (`localStorage.clear()` com verificação em duas etapas).
  - `d)` Trocar usuário / Encerrar sessão local (retornando ao Check-in).
  - `e)` Preferências de layout (alternar entre visual *Layout Oásis* e *Layout Grade na Hora*).
  - `f)` Ícone (`favicon.svg`/`.ico`) e Logo do site monocromáticos minimalistas em linha-vetorial, substituindo o T antigo e elementos decorativos.
- **TASK-02 — Onboarding Resumido (Acesso Sem Submissão) e Check-in de Câmpus/Curso/Matriz:**
  - Opção na tela inicial: *"Continuar sem meus registros (Grade na Hora)"* com perfil nulo liberando todas as turmas em Modo Livre.
  - Menu de Check-in estruturado com busca/seleção separada para **Câmpus**, **Curso** e **Matriz**. Engenharia aparece como `Eng. Comp.`; a 844 está disponível e a 962 fica visível como próxima matriz, ainda indisponível.
- **TASK-05A — Ordenação Alfabética, Toggles de Turmas e Filtro de Conflitos:**
  - Ordenação alfabética pelo nome completo da matéria tanto em *Posso Cursar* quanto em *Layout Grade na Hora*.
  - Toggles de horários por disciplina (`▼ X turmas` / `▲ ocultar`) fechados por padrão em ambas as visões para evitar poluição visual.
  - Opção nas Configurações de *"Filtrar horários que não encaixam"*, desativada por padrão, que remove do feed em tempo real turmas e disciplinas conflitantes com as seleções ativas na grade.
- **TASK-05B — Cesta de Grades Alternativas (Grades A, B e C) e Tooltips de Preview:**
  - Sistema multi-grade na minigrade lateral e no cabeçalho da *Tela Grade* exibe layout em abas compactas (`[ A ] [ + ]`), permitindo criar, alternar e remover cenários de grade livremente.
  - Exibição de código e nome completo da disciplina no card de preview ao passar o mouse.
- **TASK-03 — Tooltips e Feedbacks Visuais sobre Códigos de Disciplinas:**
  - Em *"Minha Situação"* e onde houver códigos soltos (ex.: `ICSW31` na lista de faltantes ou em avisos), o código deve ser renderizado com sublinhado interativo (`underline decoration-dotted` ou badge com ícone i).
  - Ao passar o mouse (`hover`), revelar imediatamente um tooltip limpo com o nome completo da matéria e créditos.
- **TASK-04 — Visualização Detalhada de Matérias Concluídas por Categoria:**
  - Na aba *"Minha Situação"*, permitir clicar sobre os botões unificados de "Exibir Lista" nos cards dos estratos (`Obrigatórias`, `2º Estrato`, `Humanidades`, `Eletivas`, `Extensão`) para abrir o Catálogo com filtro pré-definido e toggle de ordenação minimalista.
- **TASK-05C — Remoção Rápida na Grade (Loop de Edição Estilo GNH):**
  - Na minigrade lateral, na grade modal completa e nos blocos da tabela visual em *Grade*, o hover sobre qualquer disciplina revela um botão "X" instantâneo (`×`) no canto do item, permitindo exclusão em um clique sem sair da tela.
- **TASK-05D — Estados e Modos de Planejamento do Semestre:**
  - Implementação de dois modos essenciais nas Configurações e no topo do site: a) *Em prévia de matrícula* (oficial, divulgado no período de matrícula); b) *Em período corrido de semestre* (simulação com base em dados de semestres anteriores).
- **TASK-06 — Configurações Avançadas e Motor de Recomendação de Grade (Grade Mágica):**
  - Especificação e desenho algorítmico do sistema de recomendação combinatória e pontuação multicritério (ver `REPOSITORIO.md`).
  - Preferências do motor de sugestão (ex.: "evitar aulas às 07h30", "preferir turmas no Câmpus Centro", "maximizar créditos").
  - Opção para exportar o perfil processado e a grade montada em um arquivo JSON local para backup seguro.
- **TASK-07 — Página Própria / Modal Detalhado por Disciplina:**
  - Ao clicar no nome de qualquer matéria, abrir um painel/modal ou rota dedicada contendo:
    - `a) Horários ofertados atualmente:` Turmas abertas no semestre letivo ativo.
    - `b) Histórico temporal de ofertas:` Registros de semestres passados (`2025.2`, `2026.1`), normalizados como *"1º Semestre do Ano"* ou *"2º Semestre do Ano"*, revelando o padrão de abertura (se é ofertada todo semestre ou apenas em um) e os horários em que costuma abrir.
    - `c) Professores e turmas disponíveis:` Listagem `Professor X — Turma S7X` indicando a prioridade de alocação para alunos de BSI (`Prioridade 1`, `Prioridade 2` ou `Sem prioridade`).
- **TASK-18 — Página "Como Usar o Site" (manual da plataforma):**
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

#### Segurança e Privacidade (Hardening)
- **Auto-hospedagem de Fontes (Zero CDN Externo):** Substituição do `<link>` do Google Fonts por pacotes `@fontsource` empacotados no bundle (`Outfit` + `Plus Jakarta Sans`), eliminando a única requisição de rede externa e o vazamento de IP/referer ao Google — coerência real com o discurso de privacidade absoluta.
- **Content-Security-Policy no Build de Produção:** Plugin do Vite injeta uma CSP restritiva (`default-src 'self'`, sem `unsafe-eval`) apenas no build, calculando automaticamente o hash SHA-256 do script inline de tema para nunca dessincronizar. Verificada em runtime (fontes, worker do pdf.js e script anti-flicker sem violações).
- **Modo Privado de Sessão:** Toggle em Configurações que passa a guardar o histórico apenas em `sessionStorage` (apagado ao fechar a aba) em vez de `localStorage`, protegendo dados em máquina compartilhada; migração automática ao alternar.

#### Pipeline / Validação
- **TASK-14 — Validador de Turmas Independente da Fonte:**
  - O `tools/validate_turmas.py` confere o JSON gerado **contra o PDF de origem**, então não roda em oferta que não veio de PDF. É o caso das turmas de Eng. Comp. de 2025.2, extraídas do backup HTML do Grade na Hora por `tools/parse_gnh_html.py`: hoje esse arquivo entra em `data/` sem rede de proteção.
  - Implementado em `tools/validate_turmas_estrutura.py`: valida dia, turno, aula, sede, códigos e conflitos de local no mesmo slot para qualquer JSON de oferta. A repetição idêntica de horários do PDF é aceita, pois representa professores múltiplos da mesma turma.
  - Turma sem horário é aviso (legítimo em TCC e EaD); domínio inválido ou locais diferentes no mesmo slot são erros.

### Em Revisão
- **TASK-29 — Savefile local, Novidades de lançamento e créditos organizados:**
  - O modal de **Novidades** abre automaticamente uma única vez por navegador após este lançamento, inclusive ao terminar o cadastro com PDF. A leitura só é marcada ao fechar; a chave versionada permite que o próximo lançamento volte a aparecer.
  - O conteúdo foi organizado em Avaliações da Comunidade, matriz 806 de Sistemas de Informação e savefile. A seção de avaliações mostra visualmente qual botão procurar no Planejamento; o savefile é explicado sem duplicar o botão das Configurações dentro do modal.
  - Em Configurações, o aluno pode baixar e importar um JSON versionado com o perfil já derivado do parser e as grades/planejamentos montados. O PDF original nunca entra no arquivo nem sai do navegador; a importação valida o formato e pede confirmação antes de substituir os dados locais.
  - Na página Sobre, revisores e outros apoiadores agora aparecem em grupos distintos, ambos em ordem alfabética.
  - O Como Usar passou a documentar as avaliações, o savefile, as matrizes cobertas e o tratamento de consignações. O Roadmap registra as datas de entrada de cada curso e mantém como objetivos as matrizes 708 de Controle e Automação e 973/823 de Mecatrônica.
  - As matrizes de expansão foram retiradas da raiz do acervo privado e organizadas fora do repositório em uma pasta por curso e matriz, no mesmo padrão dos materiais de referência existentes.
- **TASK-30 — Avaliações de disciplinas consignadas e identidade entre matrizes:**
  - A coleta aceita disciplinas `aprovado` e `consignado`; `reprovado`, `dispensado`, `cancelado` e `cursando` continuam fora. ENADE, estágio e atividades complementares permanecem não avaliáveis.
  - Nas consignações, o parser guarda o código canônico da matriz para progresso/Planejamento e, separadamente, o código original efetivamente cursado para nome, elenco e envio da avaliação.
  - Quando o histórico imprime docentes, eles são preservados e a tela tenta pré-selecionar a unidade correspondente no roster global. Se a unidade não existir nas ofertas versionadas, o nome lido continua disponível como sugestão explícita, sem inventar correspondência.
  - Nomes ausentes da matriz do aluno, como a eletiva externa `GE70L`, são resolvidos pelas matrizes e ofertas de todos os cursos. Testes sintéticos e regressão opt-in com a matriz 844 cobrem código original, professor, nome e round-trip para o código canônico do Planejamento.
- **TASK-31 — Entrada portátil, próximos cursos e identidade pública do site:**
  - O check-in inicial passa a aceitar diretamente um savefile exportado em outro navegador, usando a mesma validação versionada e a mesma confirmação já adotadas nas Configurações.
  - Mecatrônica e Design aparecem no seletor como objetivos “Em breve”. Controle e Automação permaneceu bloqueado até a validação da matriz 978 e foi habilitado pela TASK-33.
  - O compartilhamento recebe cartão Open Graph próprio em 1200×630, e a página passa a declarar canonical, identidade `WebSite`, favicon raster estável, sitemap e metadados sociais. No beta, as URLs sociais apontam para o próprio ambiente e o `noindex` permanece ativo.
  - A política de dados no Sobre explicita discretamente que o GoatCounter, open source, contabiliza o uso e é a única integração de telemetria externa; histórico, perfil e grades permanecem fora dessa contagem.
- **TASK-32 — Eletivas completas na coleta de avaliações:**
  - Eletivas reconhecidas passam a resolver o nome pela pool versionada; `ELN8CB` e `ELN82D`, observadas nos históricos BSI 981, ficam cobertas no catálogo futuro com seus nomes e cargas oficiais do documento.
  - Um alvo cujo nome não seja confirmado por matriz, oferta, pool ou histórico deixa de exibir o botão Avaliar, impedindo reviews identificadas apenas por código.
  - A tabela de eletivas do Histórico Escolar não contém professor e o pipeline não publica docentes fora do roster. Por isso, uma eletiva só aparece nas avaliações quando existe oferta versionada com docente; `ELN8CB` e `ELN82D` ficam ocultas da coleta até essa fonte existir, em vez de oferecer um botão que produziria resposta eternamente pendente.
  - Na rota geral “professor não está na lista”, a interface passa a exigir o nome completo antes de abrir o formulário e o envia preenchido, sem atribuir ao aluno um docente inventado.
- **TASK-33 — Engenharia de Controle e Automação (matriz 978):**
  - Implementada exclusivamente no sandbox com matriz oficial de 173 disciplinas, 3525h obrigatórias, 675h optativas, 420h de extensão, estágio `ELT78C` de 360h e as cinco trilhas de formação de 135h.
  - A quinta trilha agrega as subáreas 1146–1149: disciplinas de qualquer uma delas creditam o conjunto-pai 1140 sem duplicar a exigência. Situação, Catálogo, Planejamento, Grade Mágica e Simulador usam esse descritor próprio.
  - Importadas as ofertas de 2025/2, 2026/1 e 2026/2; a vigente tem 147 disciplinas, 410 turmas e 1371 horários. O parser de Turmas Abertas passou a reconhecer o cabeçalho e as colunas próprias do curso. O leitor de backup também passou a aceitar disciplinas sem o sufixo de aulas semanais, evitando anexar turmas e nomes ao bloco anterior.
  - Check-in, avaliações da comunidade, Como Usar, Novidades e roadmap foram atualizados. Há validador Python específico e regressão Vitest, inclusive auditoria opt-in contra histórico real mantido fora do repositório.
- **TASK-34 — Orientar a geração de PDF textual no check-in:**
  - O tutorial “Não sei gerar meu histórico” recomenda a opção nativa **Salvar como PDF** do navegador, preferencialmente no Chrome, e desaconselha explicitamente **Microsoft Print to PDF**, que pode rasterizar o documento e impedir a extração de texto.
  - A comparação visual destaca a opção correta e a incorreta, preserva a orientação de papel A3 e ensina a confirmar que uma palavra pode ser selecionada no arquivo antes do envio.
  - Validado no modal renderizado, em modo escuro, além da suíte completa com 384 testes aprovados e do build de produção.
- **TASK-35 — Régua qualitativa de Carga de Trabalho nas avaliações:**
  - Removidas da descrição as estimativas objetivas de horas semanais, que variavam demais conforme ritmo, experiência e organização de cada aluno.
  - Os cinco pontos agora usam somente qualificadores diretos de tempo, de **Muito leve** a **Muito pesada**, preservando a separação entre volume de trabalho e dificuldade conceitual.
  - Regressão automatizada impede a reintrodução de faixas de horas na régua exibida pelo site.
- **TASK-36 — Endurecimento e validação da experiência móvel:**
  - Controles principais de Planejamento, cenários de grade, filtros, modais e contato respeitam alvo mínimo de toque de 44px no celular; textos operacionais abaixo de 12px foram elevados sem inflar metadados auxiliares.
  - Barra de grade, contato e gavetas respeitam `safe-area-inset-bottom` e altura dinâmica (`dvh`), evitando sobreposição com a barra do navegador e o recorte de iPhones. O contato só sobe quando a barra de grade realmente está visível.
  - Grades e tabelas de Gestão da Informação mantêm a densidade necessária, mas passam a anunciar a rolagem horizontal, têm região acessível por teclado e mostram instrução explícita no celular.
  - O pdf.js e seu worker saem do carregamento inicial e só são baixados quando um PDF é escolhido. O bundle inicial caiu de **508,2 KiB para cerca de 400 KiB gzip**; o build agora reprova regressão acima de 420 KiB.
  - Contratos Vitest cobrem carregamento tardio, área segura, alvos de toque e rolagem. A validação visual nos viewports de 320, 360, 390 e 412px confirmou zero overflow global, controle cortado ou alvo visível abaixo de 44px antes da publicação exclusiva no sandbox.
- **TASK-37 — Classificação curricular no Catálogo e importação direta no Simulador:**
  - Os cards do Catálogo passam a exibir a categoria curricular da disciplina e, quando aplicável, a trilha específica para a qual suas horas contam, sem repetir a carga horária.
  - O Simulador de Formatura permite escolher diretamente uma grade A/B/C já montada no Planejamento de Matrícula e usá-la como primeiro semestre da projeção, reaproveitando a mesma ponte já oferecida na tela da grade.
- **TASK-38 — Engenharia Mecatrônica (matriz 973):**
  - Importada do PDF oficial do Portal a matriz 973: 208 componentes, 3435h obrigatórias, 300h optativas, 420h de extensão, Ciclo de Humanidades de 60h e duas trilhas formativas de 120h.
  - O projeto K-Matrizes serviu como apoio inicial, mas a consulta oficial local prevalece nas divergências. O parser ganhou perfil posicional próprio para a 973 e o validador específico encerra com 0 erros.
  - Check-in, Catálogo, Situação e Fluxograma reconhecem o curso, inclusive no Modo Livre. O Catálogo diferencia categoria, trilha e extensão; o Fluxograma cruza a matriz com as ofertas próprias.
  - A oferta oficial 2026.2 contém 176 disciplinas, 440 turmas e 1523 horários; os backups do Grade na Hora cobrem 2026.1 e 2025.2. A anomalia publicada de `ME79B S01` sem horário é preservada e documentada como R9.
  - Planejamento, Grade Mágica, Simulador e avaliações da comunidade usam as ofertas próprias de Mecatrônica, sem reutilizar dados de outro curso.
  - Os dois semestres históricos carregam depois da primeira renderização, mantendo 2026.2 no caminho crítico. Validado com 403 testes aprovados, 16 testes opt-in ignorados e bundle inicial de 417,5 KiB gzip, abaixo do limite de 420 KiB.
- **TASK-40 — Engenharia Mecatrônica (matriz 823 antiga):**
  - Importada e validada a matriz oficial com 89 componentes, 4066h obrigatórias, 90h de Humanidades, 240h eletivas, estágio obrigatório de 400h e 264 equivalências para códigos posteriores.
  - O histórico local de referência fecha sem divergências e permanece fora do repositório público; nenhum dado pessoal foi incorporado aos artefatos versionados.
  - As fontes de Turmas Abertas da pasta 823 são idênticas às da 973, portanto as duas matrizes compartilham exatamente as ofertas de 2026.2, 2026.1 e 2025.2 sem duplicação de dados.
  - Check-in, Situação, Catálogo, Planejamento, Grade Mágica, Simulador e avaliações reconhecem a matriz antiga e resolvem as turmas atuais pelas equivalências oficiais.
  - Validada no navegador, com busca por código antigo e atual, além da suíte completa de 412 testes aprovados e bundle inicial de 402,1 KiB gzip.
- **TASK-41 — Créditos por curso e matriz na página Sobre:**
  - Incluídos os quatro históricos de apoio usados para Controle e Automação 978 e Mecatrônica 973/823, com os nomes completos conferidos localmente e sem versionar os PDFs pessoais.
  - Todos os apoiadores e revisores passam a exibir curso e matriz; a revisora da matriz 978 foi identificada e os dois grupos permanecem em ordem alfabética.
  - A ordenação e os 15 créditos são cobertos por regressão automatizada. A página foi validada visualmente com nomes, selos e matrizes legíveis.
- **TASK-24 — Implementar Engenharia de Computação — Matriz 962** *(renumerado de TASK-17, colisão de ID — ver nota no topo do arquivo)*:
  - Obter e validar a matriz curricular oficial, seus conjuntos, cargas, equivalências, pré-requisitos e regras próprias, sem herdar automaticamente as regras da 844.
  - Importar e validar as Turmas Abertas correspondentes e parametrizar situação, catálogo, elegibilidade, grade, simulador e progressão.
  - Só habilitar a opção `962 (Nova)` no check-in depois de dados, motores e regressões estarem completos.

### Em Andamento
*(nenhuma no momento)*

### Pendente

- **TASK-15 — Alinhar e Retificar a Exibição de CR Absoluto e CR Normalizado:**
  - No cabeçalho de *Minha Situação*, CR Absoluto e CR Normalizado aparecem lado a lado sem explicar a diferença entre eles nem por que divergem tanto (ex.: `0.7583` contra `0.5653` no mesmo histórico), e com pesos visuais diferentes — o CR Absoluto vem destacado em amarelo e o Normalizado em cor neutra, sugerindo hierarquia que não existe.
  - Padronizar o tratamento visual dos dois, deixar explícito qual é usado na **priorização de vagas na matrícula**, e explicar em tooltip como cada um é calculado.
  - Conferir os dois números contra o Histórico Escolar oficial antes de qualquer ajuste de layout: a retificação é de **exibição**, e o valor exibido tem de continuar sendo exatamente o que o Portal informa.

- **TASK-20 — Exibir títulos das disciplinas na Grade, não só códigos:**
  - Hoje a Grade exibida (minigrade/tela Grade) mostra apenas os códigos das disciplinas nos blocos, com uma legenda separada abaixo relacionando código → nome — pouco intuitivo e difícil de compartilhar (quem recebe um print precisa da legenda junto para entender).
  - Adotar abordagem similar ao preview de grade do Grade na Hora (GNH): exibir o título/nome da disciplina diretamente no bloco da grade, dispensando a legenda separada.

- **TASK-21 — Exibir a grade completa do colega ao inserir o código de match:**
  - Hoje a tela de Amigos/Match calcula e mostra o percentual de compatibilidade a partir do código informado, mas não exibe a grade do colega.
  - Ao inserir o código, exibir também a grade inteira montada pelo colega (não só o número do match), permitindo comparação visual lado a lado.

- **TASK-22 — Corrigir cálculo e exibição de Extensão e Estágio (1 e 2) no motor de formatura:**
  - Extensão Universitária e Estágio (1 e 2) não devem entrar no cálculo de horas/tempo do motor de formatura como as demais categorias — hoje são tratadas como carga horária computável, o que distorce a projeção.
  - Devem aparecer como **avisos** do motor (pendência a cumprir), sinalizando a necessidade de realizar a atividade, sem representar horas ou tempo calculado.
  - Regra específica de Estágio: **Estágio 1 e Estágio 2 devem ser alocados um em cada semestre** (não os dois no mesmo semestre, nem exigência de carga horária somada).

- **TASK-23 — Seções de Apoio (BSI, extensível a outros cursos):**
  - Criar seções explicativas de apoio ao aluno, iniciando por BSI e com estrutura pensada para reaproveitar em outros cursos no futuro, cobrindo:
    - `a)` Como validar Estágio;
    - `b)` Como validar Eletivas;
    - `c)` Como validar Atividades Complementares;
    - `d)` Como validar Atividades de Extensão.

- **TASK-08 — Seção de Feedbacks, Acervo e Documentações de Professores:**
  - Dentro da página própria da disciplina/turma, abrir espaço (via repositório auxiliar ou marcações locais) para agregar documentações antigas, ementas detalhadas e feedbacks construtivos da vivência dos estudantes.
  - **Governança:** avaliações direcionadas a professores são camada distinta e mais sensível (risco de difamação/LGPD) da avaliação da disciplina descrita na TASK-13 — exigem moderação reforçada e devem ser mantidas separadas. Na arquitetura homologada (`Estrategia.md` §6.7), as duas camadas convivem no **mesmo pipeline** mas em **streams discriminados no registro**, para que a de professor receba moderação mais rígida sem travar a outra. O critério de admissão de tags (§6.5) — só comportamento observável, nunca traço de personalidade — é a principal salvaguarda contra conteúdo difamatório.

- **TASK-13 — Sistema de Avaliações da Comunidade (Professor + Disciplina):**
  - **Status da decisão (2026-08-02):** infraestrutura **homologada** — pipeline sem back-end descrito em `Estrategia.md` §6. A alternativa com BaaS (§5) foi **preterida**; a RNF02 permanece intacta. Implementa RF15.
  - **Chave da avaliação:** `(professorId, código da disciplina, semestre cursado)` — não a disciplina isolada. A mesma matéria muda conforme quem ministra, e é essa chave que sustenta a consulta por professor da TASK-27.
  - **Composição (5 estrelas):** nota geral; classificações específicas de **Didática**, **Dificuldade** e **Carga de Trabalho**; **sistema avaliativo principal** (Provas Síncronas | Trabalhos | Misto); **tags de comportamento observável** (vocabulário fechado, `Estrategia.md` §6.5); comentário livre de até **1000 caracteres**.
  - **Origem restrita:** o botão *Avaliar* só existe na tela de quem carregou o histórico e apenas em disciplinas **concluídas**. O site monta a URL pré-preenchida do formulário com código, semestre, situação, turma e professor. O bloqueio efetivo contra submissão forjada é o **validador na fronteira**, não o transporte.
  - **Campos vindos prontos do parser (sem trabalho novo):** `ano`/`semestre` e `situacao` (aprovado/reprovado) já existem em `DisciplinaCursada` — verificado em 4 históricos reais, 0 ausências em 32 cursadas por documento.
  - **Dados publicados (RNF06 + RNF07):** o **nome completo** do autor (ou **nome social completo**) **é público**, por decisão do dono de 2026-08-02, que revoga neste ponto a cláusula de minimização anterior. Permanecem privados ou proibidos: RA, notas, frequência, CR e o PDF. Exige consentimento explícito e canal de retratação.
  - **Limite honesto:** não autentica RA (o PDF não tem assinatura verificável). O anti-abuso é a moderação humana semanal, não a verificação institucional.

- **TASK-25 — Pipeline de Ingestão Semanal de Avaliações (Git como Banco):**
  - Formulário **nativo** no site → Apps Script Web App → planilha **privada** de respostas → coluna `aprovado` revisada semanalmente pelo moderador → GitHub Action agendado que baixa o CSV, valida e **regenera** `data/reviews.json` por inteiro.
  - **Endpoint de escrita:** `tools/apps-script/recebe-review.gs`, colado no editor de Apps Script da planilha e publicado como App da Web (executar como o dono, acesso para qualquer pessoa). Valida notas, vocabulário de tags, limite de comentário, consentimento, exclusividade entre as duas rotas de professor, guarda de PII e freio de vazão. O site envia `Content-Type: text/plain` com corpo JSON — `application/json` dispara preflight que o Apps Script não responde.
  - **Regeneração total, nunca append:** com `id` estável por linha, o JSON é função pura das linhas aprovadas — rodar duas vezes dá o mesmo resultado, e desaprovar uma linha a remove da publicação seguinte.
  - **Validador no padrão `validate_turmas.py` (`0 erros`):** código existe na matriz/oferta; `(código, turma, semestre)` coerente com a oferta oficial; notas em 1–5; enum de sistema avaliativo; tags no vocabulário fechado; limite de caracteres; e **guarda de PII por regex** (RA, e-mail, telefone) reprovando a linha.
  - **Duas abas, fronteira física:** a aba `Respostas` (com RA) **não** é publicada; uma aba `Homologado`, gerada por `FILTER`/`QUERY`, projeta **só as linhas aprovadas e só as colunas públicas** e é essa que recebe a URL de CSV. O RA não está entre as colunas projetadas — o CSV público é incapaz de contê-lo por construção, sem depender do validador.
  - **Custo zero e sem segredo no repo:** o CSV é lido sem chave de API. O site **nunca** consulta o Google em runtime — se a automação falhar, a plataforma segue servindo o último JSON bom.
  - **Anti-abuso (`Estrategia.md` §6.9):** **rate limiting por IP não é implementável** — o formulário não expõe IP do respondente e não há servidor próprio no caminho. O disponível é login obrigatório (chave de dedupe), throttle por identidade via gatilho Apps Script, e a absorção do flood pelo portão de moderação. Exigir bloqueio por IP é o gatilho para reabrir a §5.

- **TASK-26 — Convite de Avaliação Pós-Semestre (Pop-up):**
  - Implementa RF16. Ao acessar com histórico carregado, convidar **uma vez por semestre** para avaliar as disciplinas de `periodoDocumento`.
  - O estado de "já respondido" é gravado **por semestre** (ex.: `promptRespondido:2026/1`), não global — senão quem reenviar o histórico no semestre seguinte nunca mais seria convidado.
  - Dispensável e não bloqueante.

- **TASK-27 — Painel Lateral de Avaliações por Professor no Planejamento de Matrícula:**
  - Implementa RF17. Tornar acionável o nome do professor associado à turma, abrindo painel lateral com agregados por classificação, tags mais frequentes e comentários daquele docente.
  - **Limiar de exibição:** abaixo de um N mínimo, mostrar comentários mas **não** a estatística agregada — com N baixo, uma única avaliação vira "100%".
  - Implementado em `src/ui/telas/PainelProfessor.tsx`, acionado pelos nomes de docente nos cards de turma de `Grade.tsx`. Cada docente da turma é um acionador próprio (a fonte traz vários por turma, separados por vírgula em `professores_raw`). O painel separa "nesta disciplina" de "em todas as disciplinas" e resolve equivalência de código pela matriz do curso de quem lê (§6.10).

- **TASK-28 — Seletor de Professor e Roster Curado (`professorId`):**
  - Pré-requisito de TASK-13 e TASK-27. Detalhamento em `Estrategia.md` §6.4.
  - **O professor não é lido do PDF — é selecionado pelo aluno**, numa lista montada a partir da **união das ofertas cobertas** daquela disciplina (`data/turmas/<sem>.json`, dado oficial já validado). Coleta ampla, filtragem na exibição.
  - **O formulário é nativo do site**, não um Google Form: uma lista de professores que muda por disciplina não cabe num formulário de campos estáticos. O envio vai para um Apps Script publicado como Web App (`tools/apps-script/recebe-review.gs`), que valida antes de gravar e devolve sucesso ou erro de verdade.
  - **Rota "Professor Não Ofertado":** diálogo que explica o significado, pede confirmação, oferece contato via a constante `EMAIL_CONTATO` de `src/ui/telas/Contato.tsx` (**nunca** endereço repetido em literal) e **captura o nome em texto livre**. A avaliação é aceita e **retida**; a moderação semanal promove o docente ao **roster curado** em `data/` e a avaliação passa a ser publicável.
  - **Dimensionamento medido:** 127 de 128 cursadas dos históricos de referência têm elenco disponível. Quanto aos docentes em si, o elenco cobre **100%** dos professores de quem está no meio do curso e falha em **17%** (elenco só de BSI) ou **11%** (elenco global de todos os cursos) no histórico mais adiantado. O escape é minoria, mas cresce com a senioridade — justamente quem tem mais a dizer —, por isso não pode descartar a avaliação. O roster cresce com o uso e a taxa cai sozinha.
  - **O roster é global, não por curso:** unir o elenco de todos os cursos cobertos derruba a falha de 17% para 11%, porque docentes lecionam em mais de um curso. Ver `Estrategia.md` §6.11.
  - Slug normalizado (minúsculas, sem acento, sem titulação) + mapa de apelidos, no mesmo padrão que `motor/identidade.ts` já usa para códigos equivalentes.
  - **Alternativa descartada (registro):** extrair o professor do PDF é viável — a coluna `Situação/Professores` é padronizada e o pdf.js entrega `"Nome - Titulação"` num único item, sem precisar de lógica posicional. Descartada por desnecessária, não por impossível; o modo de falha era truncamento por largura de coluna (2, 8 e 10 nomes cortados conforme a variante de export). Retomar por aqui se o pré-preenchimento automático virar requisito.

- **TASK-09 — Catálogo Colaborativo de Eletivas e Matérias Externas:**
  - Mapear histórico de alunos fundadores (Yago, Rômulo, Namie) e identificar disciplinas cursadas em outros cursos da UTFPR que foram validadas como Eletivas ou Extensão para BSI, recomendando-as para futuros estudantes.

- **TASK-10 — Portal de Administração (Repositório / Subdomínio Dedicado):**
  - Criação de uma plataforma de gestão separada, protegida por autenticação (ou subdomínio com senha), onde os administradores do projeto poderão curar, alterar e homologar dados semestrais e descrições de turmas através de uma interface visual sem precisar editar arquivos JSON manualmente no Git.

- **TASK-11 — Evolução para Trabalho Grupal / Multi-Agente:**
  - Transição da metodologia solo de Vibe Coding para um fluxo de contribuição open-source em equipe, com templates de PR, CI/CD automatizado no GitHub Actions rodando `vitest` e validadores de invariantes antes do merge em `main`.

- **TASK-12 — Linha do Tempo Curricular e Análise de Progressão Longitudinal (Comparativo Multi-Histórico):**
  - Permitir que o estudante armazene mais de um Histórico Escolar (`perfil`) localmente em `localStorage`/`IndexedDB`, criando uma linha do tempo/histórico temporal de emissões (`[Histórico 2024.2] -> [Histórico 2025.1] -> [Histórico 2026.1]`).
  - Implementar tela ou modal de **Relatório de Progressão**, calculando e visualizando graficamente a variação longitudinal de Coeficiente de Rendimento (CR Absoluto/Normalizado), evolução de carga horária concluída por estrato e avanço nas trilhas semestre a semestre, sem expor nenhum dado à rede.

---

## 2. Bugs

### Concluída
*(nenhum no momento)*

### Em Revisão
*(nenhum no momento)*

### Em Andamento
*(nenhum no momento)*

### Pendente
- **BUG-01 — Falha de reconhecimento de nome em PDFs de histórico gerados por certos navegadores/SOs:** os históricos do Victor Hugo Maltezo (gerados via Opera e Edge) e da Nathalya Chaves (gerado via Chrome + Windows) não são lidos com sucesso — o parser client-side (`historico/parser.ts`) acusa que não conseguiu identificar o nome do aluno. Contorno testado: gerar o PDF pelo celular no Chrome resolveu para os dois casos, mas a causa raiz (provavelmente diferença na extração de texto/coordenadas conforme o motor de renderização do PDF usado por cada navegador/SO) ainda não foi diagnosticada nem corrigida no parser.
