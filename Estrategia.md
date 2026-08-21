# Estrategia.md — Planejamento Estratégico, Gestão da Informação e IHC do Oásis UTFPR

Este documento consolida o **planejamento estratégico, documental e acadêmico** da plataforma **Oásis UTFPR**. Ele fundamenta as decisões de arquitetura de software, governança de dados e usabilidade, servindo como referência para expansão do produto e para trabalhos de conclusão de curso e relatórios de engenharia/sistemas de informação.

---

## 1. Engenharia de Requisitos

Abaixo estão listados os Requisitos Funcionais (RF) e Não Funcionais (RNF) da plataforma, marcando o estado de desenvolvimento (`[x]` Concluído, `[/]` Em andamento/Planejado imediato, `[ ]` Futuro/Backlog).

### Requisitos Funcionais (RF)
- `[x]` **RF01 — Ingestão de Histórico Escolar em PDF:** Permitir o upload e processamento local de arquivos PDF do Histórico Escolar emitidos pelo Portal do Aluno da UTFPR sem envio para servidores externos.
- `[x]` **RF02 — Cálculo e Apresentação de Progresso Curricular:** Calcular e exibir as categorias da matriz ativa para BSI 981/806, Engenharia de Computação 844/962, Engenharia Eletrônica 968 e Engenharia de Controle e Automação 978. Cada descritor preserva estratos, grupos de opção, trilhas, estágio e extensão próprios; na 978, as cinco trilhas de formação são exigências separadas de 135h.
- `[x]` **RF02.1 — Expansão multicurso validada:** As matrizes 962, 968, 806 e 978 possuem dados oficiais, ofertas, regras próprias e regressões automatizadas, sem reutilizar silenciosamente as categorias da matriz 981.
- `[x]` **RF03 — Identificação de Disciplinas Elegíveis ("Posso Cursar"):** Cruzar disciplinas aprovadas com os pré-requisitos da matriz e turmas abertas do semestre para listar o que o aluno está liberado a cursar.
- `[x]` **RF04 — Montagem de Grade Horária e Detecção de Conflitos:** Permitir selecionar turmas e identificar em tempo real choques de horários e conflitos de deslocamento entre sedes (Centro, Ecoville, Neoville) em um mesmo turno.
- `[x]` **RF05 — Gerador de Relatório de Matrícola:** Copiar lista de códigos de turmas selecionadas formatadas para facilidade de digitação/busca durante a abertura da matrícula no Portal.
- `[x]` **RF06 — Portal de Configurações Centralizada:** Fornecer tela para alternação de tema (Claro/Escuro/Sistema), escolha de layout (Oásis vs GNH), alternância dos modos de planejamento do semestre (Prévia de Matrícula vs Período Corrido), atualização/limpeza de histórico e filtro em tempo real de conflitos.
- `[x]` **RF07 — Check-in e Modo Sem Submissão (Onboarding Resumido):** Permitir que o usuário utilize a plataforma sem submeter seu histórico (modo estilo *Grade na Hora*), selecionando previamente Câmpus, Curso e Matriz.
- `[x]` **RF08 — Feedbacks e Tooltips Visuais de Disciplinas:** Exibir o nome completo da disciplina em um tooltip ou revelação instantânea ao passar o mouse sobre códigos (ex.: `ICSW31`) e permitir inspecionar matérias concluídas em cada card de progresso via botões unificados de "Exibir Lista".
- `[/]` **RF09 — Página/Modal Detalhado de Disciplina:** Apresentar painel focado por disciplina contendo turmas abertas, histórico temporal de ofertas ("1º/2º Semestre do Ano"), horários típicos, professores e prioridade de vagas para BSI.
- `[/]` **RF10 — Computação de Disciplinas Externas:** A ligação oficial entre oferta externa e matriz já é feita por código, equivalência ou nome, preservando a categoria correta (trilha, optativa isolada ou eletiva). Permanece futuro o catálogo colaborativo de sugestões da comunidade.
- `[ ]` **RF11 — Linha do Tempo Curricular e Análise de Progressão Longitudinal (Comparativo Multi-Histórico):** Armazenamento de sucessivos históricos escolares no armazenamento local do navegador para medir progressão de créditos e variação temporal do Coeficiente de Rendimento (CR) e conclusão de trilhas.
- `[x]` **RF12 — Estados e Modos de Planejamento do Semestre:** Suporte aos dois estados essenciais de uso: a) *Prévia de Matrícula (Oficial)* para o período que antecede e sucede a matrícula com base nos dados reais divulgados; b) *Período Corrido de Semestre (Simulação)* para organização durante o semestre vigente hipotetizando ofertas similares.
- `[x]` **RF13 — Edição Contínua e Remoção Rápida na Grade (Loop Estilo GNH):** Botão "X" instantâneo revelado no hover de cada disciplina na minigrade lateral, no modal da grade completa e nos blocos da tabela visual de horários para remoção em um único clique sem perda de contexto.
- `[x]` **RF14 — Gamificação e Simulação de Impacto da Grade no Progresso:** Ao montar a grade do semestre, simular em tempo real o *impulso* que cada disciplina selecionada dá à integralização de cada categoria curricular (Obrigatórias, 2º Estrato, Humanidades, Trilhas, Eletivas, Extensão e Estágio), sobrepondo o cumprido do histórico ao previsto pela grade (`motor/progressoGrade.ts`), tornando visível o avanço que aquele semestre representa.
- `[/]` **RF15 — Avaliações da Comunidade por Professor e Disciplina:** Permitir que o aluno avalie qualquer disciplina que já **concluiu**, por aprovação ou consignação (fato validado no próprio histórico local), tendo como chave o par **professor + disciplina + semestre cursado**. Reprovações, dispensas, cancelamentos, ENADE, estágio e atividades complementares não entram. Na consignação, o código original cursado identifica a experiência e o código canônico da matriz preserva o cruzamento com o Planejamento. Eletivas só entram na coleta quando possuem nome confirmado e uma oferta versionada com docente, pois a tabela própria do histórico não informa professor e o pipeline não publica unidades fora do roster; código ou docente incompletos não viram um alvo enganoso. Na rota geral de professor ausente da lista, o nome é exigido no Oásis e segue preenchido para triagem. Cada avaliação separa **Personalidade**, **Didática**, **Dificuldade** e **Carga de Trabalho** (1–5) para não tratar dificuldade alta como avaliação negativa. A submissão parte da tela de progresso ou do acionador no menu que lista todas as disciplinas elegíveis. O conjunto moderado é redistribuído publicamente. Ver §6.
- `[ ]` **RF16 — Convite de Avaliação Pós-Semestre:** Ao acessar a plataforma, o aluno que tiver histórico carregado recebe um convite único por semestre para avaliar as disciplinas cursadas no **último semestre do documento** (derivado de `periodoDocumento`). O convite é dispensável e não bloqueia o uso; o estado de "já respondido" é registrado por semestre, de modo que um novo semestre volta a convidar uma vez.
- `[ ]` **RF17 — Consulta de Avaliações no Planejamento de Matrícula:** No planejamento de matrícula, o nome do professor associado a uma turma é acionável e abre um painel lateral com as avaliações daquele professor — agregados por classificação, tags mais frequentes e comentários — permitindo decidir a turma com base na experiência da comunidade.
- `[x]` **RF18 — Savefile Portátil de Perfil e Planejamento:** Permitir baixar e importar, exclusivamente no navegador, um JSON versionado com o perfil já derivado do Histórico Escolar e as grades montadas. A importação fica disponível tanto no check-in inicial quanto nas Configurações, para que o arquivo possa realmente transportar a sessão a um navegador novo. O arquivo não contém o PDF original nem realiza transmissão em rede; antes da importação, o formato é validado e o aluno confirma a substituição dos dados locais.

### Requisitos Não Funcionais (RNF)
- `[x]` **RNF01 — Privacidade e Local-First:** Todo parseamento de documentos pessoais ocorre no browser via `pdfjs-dist`. Nenhum histórico escolar transita por rede.
- `[x]` **RNF02 — Hospedagem Estática e Zero Backend:** A aplicação deve ser 100% estática e compatível com hospedagem em CDN/GitHub Pages sem dependência de bancos de dados ativos em runtime.
- `[x]` **RNF03 — Integridade e Invariantes de Dados (Erro Alto):** A ingestão de ofertas semestrais e matriz curricular deve passar por auditoria rigorosa via scripts Python (`validate_turmas.py`, `validate_matriz.py`), reprovando qualquer divergência documental com erro explícito (`0 erros`).
- `[x]` **RNF04 — Design Visual de Alta Fidelidade (Sem Emojis):** Interface limpa, minimalista e acessível com tipografia de produto (`Outfit` + `Plus Jakarta Sans`) e ícones vetoriais SVG, sem dependência de emojis ou fontes genéricas.
- `[x]` **RNF05 — Responsividade Absoluta:** O layout deve adaptar-se graciosamente a dispositivos móveis, tablets e monitores desktop amplos.
- `[/]` **RNF06 — Minimização de Dados na Camada de Comunidade:** Qualquer funcionalidade que exija troca com a rede (avaliações da comunidade) envia o **mínimo indispensável**. Permanecem **proibidos de trafegar ou ser publicados**: o PDF do histórico, notas, frequências, CR e a lista de disciplinas reprovadas. O **RA** pode ser coletado para deduplicação e rastreio de abuso, mas fica **restrito ao estágio privado** do pipeline e **nunca** é publicado.
  - **Exceção homologada pelo dono (2026-08-02) — nome do autor:** o **nome completo** do aluno (ou o **nome social completo**, quando houver) **é publicado** junto da avaliação, revogando neste ponto específico a redação anterior deste requisito e da §5.3. Fundamento: avaliação assinada aumenta a responsabilidade de quem escreve e reduz o risco difamatório na camada de professor (§6.7). O ônus correspondente — consentimento explícito e canal de retratação — está no RNF07.
- `[ ]` **RNF07 — Consentimento, Retratação e Permanência do Versionamento:** Como a avaliação publicada é assinada e versionada em repositório público, o formulário deve apresentar **consentimento explícito e finalidade declarada** antes do envio, deixando claro que o nome ficará público. Deve existir **canal de retratação** que remova a avaliação das publicações seguintes. Limite honesto a comunicar ao usuário: a remoção **não apaga o histórico do Git** — commits anteriores permanecem; o que se garante é a saída das versões futuras. Ver §6.7.
- `[x]` **RNF08 — Identidade Pública e Compartilhamento:** Declarar metadados consistentes para o domínio canônico, nome do site, favicon e cartões sociais. A produção aponta para `oasisutfpr.com.br`; ambientes beta continuam com `noindex` e usam seus próprios endereços apenas nas prévias de compartilhamento.

---

## 2. Modelagem de Gestão da Informação (GI)

O planejamento informacional do Oásis UTFPR segue quatro blocos. O **PEN** define onde o projeto está, para onde quer ir e como pretende chegar. O **PETI** traduz isso em tecnologia, pessoas e indicadores. O **Processo de GI** descreve o ciclo de vida da informação acadêmica tratada pela plataforma. A **Qualidade da Informação** fecha com as dimensões usadas para julgar cada dado publicado.

A numeração interna desta seção (1, 2, 3 e 4) é a do roteiro canônico de GI, e é replicada na tela `src/ui/telas/TelaGestaoInformacao.tsx`. Ao alterar as tabelas aqui, replique lá.

### 1. PEN — Planejamento Estratégico de Negócios

#### 1.1 Análise do cenário atendido — *onde estamos*

O planejamento acadêmico na UTFPR Curitiba depende de documentos que vivem separados. A matriz curricular chega em um PDF, a oferta do semestre em outro, e o histórico escolar em um terceiro. Cada um usa numeração e vocabulário próprios, e nenhum deles responde sozinho à pergunta que o aluno faz no período de matrícula, que é o que dá para cursar agora sem choque de horário e sem atrasar a formatura.

Ferramentas de apoio como o Grade na Hora cobrem a montagem de horários, porém não conhecem pré-requisito, categoria de matriz nem progresso individual. O resultado é uma decisão de alto impacto tomada em poucos dias, com planilha improvisada e conversa de corredor.

**Análise SWOT do Oásis como produto**

| Forças (S) | Fraquezas (W) |
| :--- | :--- |
| Histórico escolar processado inteiro no navegador, sem trânsito de dado pessoal | Leitura posicional dos PDFs oficiais, que quebra quando a instituição muda o layout |
| Oito matrizes de cinco cursos cobertas pelo mesmo motor de pré-requisitos e equivalências | Ausência de backend impede autenticação forte e moderação em tempo real |
| Pipeline de dados versionado, com validadores que reprovam a importação diante de qualquer erro | O aluno precisa gerar e carregar o histórico de novo a cada semestre |
| Avaliações da comunidade já publicadas, com moderação humana antes de irem ao ar | Nada é medido em produção, então falha de leitura e adoção ficam invisíveis |
| Custo de operação nulo, por rodar como site estático | Manutenção concentrada em uma pessoa |

| Oportunidades (O) | Ameaças (T) |
| :--- | :--- |
| Demanda sazonal garantida a cada rematrícula, duas vezes por ano | Troca de matriz vigente invalida dados já publicados |
| Comunidade disposta a contribuir com avaliação de turma e de professor | Mudança de formato do PDF de Turmas Abertas interrompe a atualização semestral |
| Novos cursos do câmpus publicam documentos no mesmo formato, o que barateia a expansão | Conteúdo difamatório nas avaliações, com risco de exposição de professores |
| Reconhecimento como material de apoio pelas coordenações e centros acadêmicos | Leitura do projeto como concorrente do Portal do Aluno, e evasão de contribuidores |

#### 1.2 Definição de objetivos — *para onde queremos ir*

- **Encurtar a decisão de matrícula.** Levar o aluno da dúvida ao conjunto de turmas viáveis em poucos minutos, sem precisar abrir o PDF da matriz nem cruzar tabelas à mão.
- **Tornar a integralização legível.** Mostrar quanto falta em cada categoria da matriz do aluno, contando estágio, extensão curricular, trilhas e eletivas.
- **Evitar o erro que custa um semestre.** Apontar choque de horário, pré-requisito não cumprido e deslocamento inviável entre sedes ainda durante a montagem da grade.
- **Dar transparência à experiência de turma.** Publicar avaliação moderada de disciplina e de professor, para que a escolha de turma deixe de depender de conversa de corredor.
- **Manter o dado pessoal fora do projeto.** Garantir que o histórico escolar seja lido apenas na máquina do aluno, sem envio, sem armazenamento remoto e sem registro.

#### 1.3 Definição da estratégia — *como pretendemos chegar lá*

A estratégia adotada é a de camada de leitura sobre os documentos oficiais. O Oásis não registra nota, não efetiva matrícula e não substitui o Portal do Aluno. Ele consome o que a instituição já publica, converte em dado estruturado e versionado, e devolve ao aluno uma resposta acionável.

A operação segue como site estático, decisão que mantém custo nulo, elimina superfície de servidor e permite auditar cada dado publicado pelo histórico do Git. O dado pessoal fica fora dessa equação por desenho, já que o histórico escolar nunca sai da máquina de quem o carrega.

### 2. PETI — Planejamento Estratégico de TI

#### 2.1 Estratégia de TI

- **Computação no cliente.** O navegador do aluno faz a leitura do histórico e roda o motor de inferência, o que dispensa servidor e mantém o documento em memória local.
- **Dado público versionado.** Matriz e oferta viram JSON no repositório, com validador dedicado por matriz que reprova a importação diante de qualquer erro.
- **Entrega contínua** no GitHub Pages, com build tipado e verificação de bundle a cada publicação.
- **Terceiros apenas na fronteira de coleta.** O formulário recebe a avaliação, e a publicação só acontece depois de moderação humana (ver §6).

#### 2.2 Elementos de TI sugeridos

- **Plano de Software.** React 19, TypeScript, Vite e Tailwind CSS v4 na interface. A biblioteca `pdfjs-dist` lê o histórico em tempo de execução. Python 3 com `pypdf` e `pdfplumber` alimenta os parsers de matriz e de turmas, que rodam fora do site.
- **Plano de Hardware e Infraestrutura.** Nenhum servidor próprio. Hospedagem estática no GitHub Pages, GitHub Actions para a ingestão semanal das avaliações, e o navegador do usuário como unidade de processamento. Interface responsiva do celular ao desktop.
- **Plano de Informação.** Importação validada por matriz, camada de anotações curadas separada da fonte oficial, e o ciclo de GI do bloco 3 como contrato de manutenção semestral.
- **Plano de RH.** Manutenção pelo dono do projeto, com moderação semanal das avaliações e revisão semestral da oferta. A comunidade contribui pela submissão de avaliação, sem acesso de escrita ao repositório.

#### 2.3 Indicadores

Cada indicador nasce amarrado a um objetivo do PEN. A última coluna registra, sem maquiagem, o que já é medido e o que ainda depende de instrumentação.

| Objetivo relacionado (PEN) | Indicador | Meta | Aferição hoje |
| :--- | :--- | :--- | :--- |
| Encurtar a decisão de matrícula | Tempo entre carregar o histórico e obter a lista de turmas viáveis | Abaixo de 2 minutos | Sem instrumentação |
| Encurtar a decisão de matrícula | Tempo de leitura do histórico em PDF dentro do navegador | Abaixo de 1000 ms | Sem instrumentação |
| Tornar a integralização legível | Divergência entre o progresso calculado e o histórico oficial | Zero divergência nas matrizes cobertas | Suíte de testes por curso |
| Tornar a integralização legível | Erros nos validadores de matriz e de turmas | Zero erro em toda importação | `tools/validate_*.py` |
| Evitar o erro que custa um semestre | Choque de horário não apontado na montagem da grade | Zero falso negativo | Testes do motor de grade |
| Dar transparência à experiência de turma | Avaliações moderadas e publicadas por ciclo de ingestão | Crescimento a cada semestre letivo | Moderação semanal e commit da Action |
| Manter o dado pessoal fora do projeto | Bytes do histórico escolar que alcançam a rede | Zero | Revisão de código e verificação de bundle |

### 3. Processo de GI — Ciclo de Vida da Informação

O ciclo percorre quatro etapas canônicas, que são **Determinação das Exigências**, **Obtenção**, **Distribuição** e **Feedback**, e atende quatro perfis, que são o **Aluno dos cursos atendidos**, o **Aluno Contribuidor**, o **Moderador** e o **Mantenedor**.

#### 3.1 Determinação das exigências — *quem precisa de qual informação, e quando*

| Quem? | Informação Exigida | Quando? |
| :--- | :--- | :--- |
| **Aluno dos cursos atendidos** | Quanto falta para integralizar cada categoria da minha matriz, contando estágio, extensão curricular, trilhas e eletivas? Qual meu coeficiente de rendimento absoluto e normalizado? | Contínuo, com pico ao fim do semestre |
| **Aluno dos cursos atendidos** | Quais disciplinas estou liberado a cursar, cruzando os pré-requisitos já cumpridos com a oferta do semestre? | Matrícula e rematrícula |
| **Aluno dos cursos atendidos** | Há choque de horário ou deslocamento inviável entre Centro, Ecoville e Neoville na grade que estou montando? Quanto ela me aproxima da formatura? | Período de matrícula |
| **Aluno dos cursos atendidos** | Em quantos semestres eu me formo mantendo este ritmo, e qual sequência de disciplinas sustenta essa projeção? | Planejamento de médio prazo |
| **Aluno dos cursos atendidos** | Como foi a experiência de quem já cursou esta disciplina com este professor, em didática, dificuldade e carga de trabalho? | Antes de escolher turmas |
| **Aluno Contribuidor** | Quais das minhas disciplinas concluídas posso avaliar, e o que exatamente ficará público quando eu enviar? | Após concluir a disciplina |
| **Moderador** | Quais respostas novas chegaram desde a última rodada, e quais trazem ataque pessoal ou dado pessoal de terceiros? | Semanal |
| **Mantenedor** | A matriz vigente mudou? Quais turmas abriram no semestre? Os validadores fecham sem nenhum erro? | Semestral |

#### 3.2 Obtenção da informação — *de onde vem, quem busca, com que periodicidade*

##### 3.2.1 Fontes e responsáveis

| Fonte | Formato | Quem obtém | Periodicidade |
| :--- | :--- | :--- | :--- |
| **Matriz curricular por curso** | PDF do Portal do Aluno, na Consulta Curso e Matriz Curricular | Mantenedor | A cada alteração de matriz |
| **Turmas abertas do semestre** | PDF oficial de Turmas Abertas | Mantenedor | Semestral, antes da rematrícula |
| **Grade na Hora** | Página exportada em HTML | Mantenedor | Conferência secundária da oferta, quando o PDF oficial atrasa |
| **Projeto Pedagógico de Curso** | PDF público do curso | Mantenedor | Referência das regras de estágio, extensão e trilhas |
| **Histórico escolar** | PDF gerado pelo próprio aluno no Portal | O aluno, dentro do navegador dele | A cada semestre, ou quando quiser reconferir |
| **Avaliação de turma** | Formulário com login institucional obrigatório | Aluno Contribuidor | Contínuo, com publicação semanal |

##### 3.2.2 Plano de aquisição de dados

| Informação exigida | Dado a ser obtido | Fonte do dado a ser obtido |
| :--- | :--- | :--- |
| **Matrizes atendidas (981, 806, 844, 962, 968, 978, 823 e 973)** | Disciplinas, período, conjunto e categoria, cargas horárias, pré-requisitos e equivalências | Consulta Curso e Matriz Curricular no Portal do Aluno, convertida por `tools/parse_matriz.py` em `data/matriz-<n>.json` |
| **Regras de integralização de cada curso** | Exigência de estágio, de extensão curricular, número de trilhas e carga de eletivas | Rodapé da matriz e Projeto Pedagógico do Curso, refletidos em `src/domain/cursos.ts` |
| **Oferta de turmas do semestre** | Códigos de turma, horários por turno e slot, sede e sala, professores e prioridade de curso | PDF oficial de Turmas Abertas, convertido por `tools/parse_turmas_pdf.py` em `data/<curso>/turmas/<sem>.json` |
| **Conferência da oferta publicada** | Turmas e horários divulgados fora do PDF oficial | Exportação do Grade na Hora, lida por `tools/parse_gnh_html.py` como leitura secundária de backup |
| **Correções vindas da vivência do curso** | Divergências entre a matriz publicada e a prática, como o pré-requisito de TC1 | Camada curada em `data/anotacoes-981.json`, aplicada por `tools/aplicar_anotacoes.py` sem sobrescrever a fonte oficial |
| **Progresso individual do aluno** | RA, disciplinas cursadas, notas, frequência, situação e créditos | Histórico Escolar em PDF, **processado apenas no navegador, sem trânsito em rede** |
| **Avaliação de disciplina e de professor** | Didática, personalidade, dificuldade, carga de trabalho, recomendação e comentário em texto | Formulário com login institucional, moderado na planilha privada e publicado em `data/reviews.json` pela ingestão semanal (ver §6) |

#### 3.3 Distribuição da informação — *quem recebe, e como*

| Quem? | Como? |
| :--- | :--- |
| **Aluno dos cursos atendidos** | **Minha Situação**, com progresso por categoria e coeficiente de rendimento. **Posso Cursar**, com o cruzamento entre pré-requisito cumprido e oferta do semestre. **Catálogo de Matérias**, com busca e filtro por categoria |
| **Aluno montando a grade** | **Grade** visual com detecção de choque de horário e alerta de deslocamento entre sedes. **Grade Mágica**, que sugere combinações automáticas. Relatório copiável pronto para colar no Portal do Aluno |
| **Aluno planejando o curso inteiro** | **Fluxograma** da matriz, que mostra o caminho de pré-requisitos até cada disciplina. **Simulador de Formatura**, com projeção dos semestres restantes a partir do ritmo atual |
| **Aluno escolhendo entre turmas** | Painel de professor e painel de disciplina, abertos direto da turma na grade, com médias, distribuição das notas dadas pela comunidade e comentários já moderados |
| **Aluno Contribuidor** | Botão **Avaliar** nas disciplinas concluídas, seletor de professor montado a partir da oferta, aviso do que ficará público antes do envio, e a lista das próprias avaliações enviadas |
| **Aluno planejando com colegas** | **Amigos e Match**, com compartilhamento de grade por link e comparação de horários entre pessoas do mesmo curso |
| **Moderador** | Planilha privada com as respostas brutas, coluna de aprovação preenchida à mão, e nada publicado por omissão |
| **Mantenedor** | Repositório versionado, validadores que reprovam a importação em qualquer erro, e Action semanal que regenera as avaliações publicadas |

#### 3.4 Feedback da Utilização
- Alertas visuais imediatos de observações do parser e inconsistências (`perfil.avisos`, `painel.inconsistencias`).
- Badges dinâmicas de status da grade em tempo real (contagem de aulas/semana, *Sem conflitos* vs *Choque de horário*) e simulação de impulso no progresso curricular.
- Copiador de relatório de matrícula pronto para colagem no portal oficial.
- *Futuro:* fila de moderação de avaliações da comunidade e sinal de "dificuldade média" retroalimentando a decisão de escolha de turmas de outros alunos.

### 4. Qualidade da Informação (QI)

#### 4.1 Definição das dimensões e atributos

Cada informação tratada pela plataforma é julgada por dimensões e atributos, com faixas explícitas de nível alto e baixo.

| Informação | Dado Coletado Avaliado | Dimensão Avaliada | Atributos Avaliados |
| :--- | :--- | :--- | :--- |
| **Disciplinas abertas no semestre vigente** | Matérias ofertadas no semestre (`data/<curso>/turmas/<sem>.json`) | **d1 Atualidade** | **a1 intervalo de tempo**<br>• **Alto:** se a oferta publicada é datada com intervalo máximo de até 2 meses antes do início do semestre letivo vigente.<br>• **Baixo:** se a oferta publicada é datada com intervalo superior a 2 meses antes do início do semestre letivo vigente. |
| **Progresso no curso e integralização** | Histórico Escolar em PDF do aluno | **d2 Confiabilidade e Precisão** | **a2 fidelidade posicional**<br>• **Alto:** se toda linha de disciplina traz código, nome e carga horária alinhados, validados contra as invariantes do curso, sem nenhum erro.<br>• **Baixo:** se há falha de leitura ou divergência de carga horária em dependências e equivalências. |
| **Horários e sedes das aulas** | Conflito de turno e de sala (`motor/grade.ts`) | **d3 Integridade** | **a3 completeza relacional**<br>• **Alto:** se cada slot da grade identifica sem ambiguidade dia, turno, aula, disciplina, turma e sala com sede.<br>• **Baixo:** se há slot órfão ou turma sem indicação de sede, o que inviabiliza o cálculo de deslocamento. |
| **Avaliações da comunidade** | Didática, dificuldade, carga de trabalho e comentário por turma | **d4 Credibilidade** | **a4 origem institucional e curadoria**<br>• **Alto:** se a resposta vem de conta institucional da UTFPR, passa por revisão humana e chega ao site pela ingestão validada.<br>• **Baixo:** se o texto é publicado sem moderação, ou sem âncora de vínculo, o que abre espaço para spam e ataque pessoal. |
| **Dado pessoal do aluno** | Conteúdo do histórico escolar carregado na plataforma | **d5 Confidencialidade e Privacidade** | **a5 superfície de exposição**<br>• **Alto:** se o documento é lido apenas em memória, no navegador do aluno, e nenhum byte dele alcança a rede ou o repositório.<br>• **Baixo:** se qualquer trecho do documento é enviado, registrado em log ou versionado. |

#### 4.2 Referência das dimensões

O quadro completo de dimensões de qualidade da informação, com a marca de onde cada uma entra no Oásis. As não avaliadas ficam declaradas, e não escondidas.

| Dimensão | Aspecto a ser analisado | No Oásis |
| :--- | :--- | :--- |
| Abrangência e escopo | A informação de que o público precisa está completa e sem excesso desnecessário? | Não avaliada nesta versão |
| Integridade | A informação está íntegra, sem corrupção nem adulteração? | `d3` |
| Acurácia e veracidade | A informação pode ser considerada fiel aos fatos que representa? | `d2` |
| Confidencialidade e privacidade | A informação é acessada somente por quem tem direito a ela? | `d5` |
| Disponibilidade | A informação é acessada com facilidade por quem tem direito a ela? | Não avaliada nesta versão |
| Atualidade | A informação é gerada e atualizada nos intervalos que o público considera adequados? | `d1` |
| Ineditismo e raridade | Trata-se de informação difícil de obter, rara ou escassa? | Não avaliada nesta versão |
| Contextualização | A informação é atraente para o público a que se destina? | Não avaliada nesta versão |
| Precisão | A informação está detalhada o bastante para uso imediato? | `d2` |
| Confiabilidade | A fonte e o conteúdo têm credibilidade perante o público? | `d2`, `d4` |
| Existência | Em quantas mentes, locais físicos e locais virtuais a informação está disponível? | Não avaliada nesta versão |

---

## 3. Diagramas de Uso e Navegação (Fluxo do Usuário)

O fluxo principal de navegação foi projetado para fluidez, minimizando cliques e eliminando becos sem saída:

```mermaid
graph TD
    A[Acesso Inicial / index.html] --> B{Possui Histórico Salvo no LocalStorage?}
    B -- Não --> C[Tela de Onboarding / Check-in]
    C --> D[Opção 1: Submeter Histórico em PDF]
    C --> S[Opção 2: Importar savefile de outro navegador]
    C --> E[Opção 3: Continuar Sem Registros - Grade na Hora]
    B -- Sim --> F[Plataforma Principal Orquestrada por App.tsx]
    D --> F
    S --> F
    E --> F
    
    F --> G[Aba 1: Minha Situação]
    F --> H[Aba 2: Posso Cursar]
    F --> I[Aba 3: Grade Horária & Conflitos]
    
    G --> J[Card Progresso / Clicar ou Hover em Categoria]
    J --> K[Modal/Drawer: Lista de Matérias Concluídas na Categoria]
    
    H --> L[Hover sobre Código de Matéria]
    L --> M[Tooltip: Nome Completo da Disciplina]
    H --> N[Clique sobre Disciplina]
    N --> O[Página/Modal Detalhado: Histórico de Ofertas, Turmas e Professores]
    
    I --> P[Hover sobre Bloco da Grade]
    P --> Q[Ação Rápida: Botão 'X' para Remover Disciplina]
    I --> R[Ação: Copiar Relatório para Matrícula]
```

---

## 4. Avaliação sobre Heurísticas e Princípios de IHC

A interface visual adota as **10 Heurísticas de Nielsen** e princípios modernos de **Interação Humano-Computador (IHC)** para proporcionar uma experiência de grau profissional e alta clareza:

1. **Visibilidade do Status do Sistema:**
   - Feedback instantâneo durante o upload e parseamento (`"Analisando o PDF..."`).
   - Badges dinâmicas na grade horária indicando contagem em tempo real (`4 aulas/semana` · `Sem conflitos` vs `Choque de horário`).
2. **Correspondência entre o Sistema e o Mundo Real:**
   - Utilização da nomenclatura oficial e familiar aos alunos da UTFPR (`1º Estrato`, `Coeficiente Normalizado`, `Turnos M/T/N`, `Sedes Centro/Ecoville/Neoville`).
3. **Controle e Liberdade do Usuário:**
   - Botões acessíveis para `Trocar Histórico`, `Limpar Grade` e futura remoção de matéria com um clique (`X`) direto na grade.
4. **Consistência e Padronização:**
   - Cores e tokens semânticos rigorosamente definidos em `index.css` (`--color-utfpr-*`, tons de verde para `ok`, âmbar para alerta e vermelho para erro/choque).
5. **Prevenção de Erros:**
   - Validação proativa: o motor impede visualmente ou destaca com clareza quando duas matérias chocam no mesmo slot ou exigem teletransporte entre Ecoville e Centro no mesmo turno.
6. **Reconhecimento em vez de Memorização:**
   - O usuário não precisa lembrar o nome da disciplina a partir da sigla `ICSW31`; tooltips visuais e sublinhados interativos revelam imediatamente as informações complementares.
7. **Estética e Design Minimalista:**
   - Eliminação de ruídos visuais e "Cara de IA" (remoção completa de emojis decorativos e fontes padrão).
   - Uso equilibrado de espaços em branco, cards com `backdrop-blur` e hierarquia tipográfica contrastando `Outfit` com `Plus Jakarta Sans`.
8. **Uso móvel e acessibilidade por toque:**
   - Ações principais mantêm alvo mínimo de 44px; informações operacionais usam ao menos 12px, sem confundir metadados auxiliares com comandos.
   - Barras e gavetas fixas respeitam a área segura e a altura dinâmica do navegador. Conteúdo tabular largo permanece rolável, com instrução visível e região nomeada para tecnologias assistivas.
   - O custo inicial de rede é tratado como parte da usabilidade: o motor de PDF só carrega depois da escolha do arquivo e o build impõe orçamento de 420 KiB gzip para a entrada JavaScript.

---

## 5. Arquitetura da Camada de Comunidade (Avaliações Autenticadas)

> **Status (2026-08-02): NÃO é o caminho adotado.** O dono homologou a alternativa sem back-end descrita na **§6**, que mantém a RNF02 intacta. Esta seção permanece como registro da análise: ela documenta *por que* o caminho com back-end foi preterido e qual é o teto de segurança que nenhuma solução client-side ultrapassa (§5.1) — limite que continua valendo para a §6. Se algum dia a autenticação forte de RA virar requisito, é aqui que a discussão recomeça.

### 5.1 O problema e o teto de segurança
A ideia é: cada aluno cadastra seu histórico (como já ocorre, client-side) e, em cada disciplina **concluída** — fato que se valida no próprio histórico —, ganha um botão de avaliar (dificuldade 1–3 + comentário), com a review autenticada pelo RA e redistribuída a todos.

Há um limite honesto e incontornável: **o PDF do Histórico Escolar da UTFPR não possui assinatura digital verificável por terceiros.** Sem uma raiz criptográfica de confiança emitida pela instituição (SSO/OAuth institucional ou documento assinado), *qualquer* afirmação puramente client-side sobre "sou o RA X e passei na disciplina Y" é forjável — o cliente pode simplesmente mentir no `POST`. Portanto:
- **Não é possível** autenticar o RA de forma forte *sem* que algo saia do navegador **e** sem uma âncora institucional.
- O que é possível é elevar drasticamente o **custo de abuso** e obter segurança pragmática "boa o suficiente" com degradação graciosa.

### 5.2 A âncora recomendada: verificação por e-mail institucional (anti-Sybil)
Em vez de tentar provar o RA a partir do PDF, ancore a identidade no **e-mail institucional** (`@alunos.utfpr.edu.br`) via *magic-link*/OTP:
- Prova **vínculo institucional** sem o aluno digitar senha em lugar nenhum (não coletamos credencial).
- É o freio anti-Sybil: cada identidade falsa exigiria um e-mail institucional distinto, o que exige estar matriculado.
- O histórico local continua provando *quais* disciplinas o aluno concluiu; o e-mail prova *que ele é um aluno real da UTFPR*. A conjunção das duas dá: "um aluno verificado afirma ter concluído a disciplina X e a avalia".

### 5.3 Minimização de dados (RNF06) — o que trafega

> **Superada em parte (2026-08-02):** a regra "nunca trafega nome" abaixo foi **revogada para o campo nome** por decisão do dono — a avaliação é assinada com o nome completo público (ver RNF06 e §6.7). O restante da lista (RA em claro, notas, CR, PDF) continua valendo integralmente.
Ler avaliações é anônimo e não exige nada. **Apenas para contribuir** o aluno se verifica uma vez. Por review, o cliente envia somente:
`{ codigoDisciplina, dificuldade(1–3), comentario, tokenVinculo }`.
- **Nunca** trafegam: RA em claro, notas, CR, nome, ou o PDF.
- **Anti-duplicação sem rastrear o RA:** derive no cliente um slot idempotente `slot = HMAC(tokenVinculoDoUsuario, codigoDisciplina)`. O servidor impõe **uma review por (usuário verificado, disciplina)** (upsert), sem nunca conhecer o RA.
- *Dial de privacidade opcional:* para o servidor **gatear** que só se avalia disciplina realmente cursada, o cliente pode divulgar apenas o **conjunto de códigos concluídos** (sem notas/nomes/RA). Isso vaza a lista de matérias feitas — custo de privacidade ajustável; se recusado, o "cursei de fato" volta a ser auto-declarado e a moderação assume esse papel.

### 5.4 Camadas anti-abuso (defesa em profundidade)
1. **Verificação institucional** = raiz anti-Sybil (identidades custam caro).
2. **Uma review por (usuário, disciplina)** = anti-spam estrutural (upsert idempotente).
3. **Rate limiting + fila de moderação** (automática e/ou manual) = anti-flood e anti-abuso textual.
4. **Segregação de camadas:** avaliar *dificuldade da disciplina* é de baixo risco; comentários *direcionados a professores* (TASK-08) carregam risco de difamação/LGPD e ficam em camada separada, com moderação reforçada.

### 5.5 Infraestrutura sugerida
- **Recomendado — BaaS gerenciado mínimo:** **Supabase** (magic-link/OTP e Row-Level Security nativos, Postgres) ou **Cloudflare Workers + D1/KV** (edge, mais enxuto e com hash do e-mail feito na hora para descartar o e-mail cru — mais privativo). Preserva o espírito "sem servidor para manter"; o histórico continua 100% client-side.
- **Alternativa zero-backend real:** se a linha "sem backend" for inegociável, avaliações compartilhadas robustas **não são viáveis**; recai-se no modelo *Git-como-banco* (reviews via PR/GitHub App a um repositório curado, identidade GitHub, moderadas) — casa com a TASK-10, mas **não** autentica RA.

### 5.6 Repositório público vs privado — não muda a segurança
Tornar o **repositório privado não ajuda** neste problema: a segurança depende do *runtime* (servidor + cliente), não da visibilidade do código-fonte. O front é código que roda no navegador do usuário — segredos jamais moram nele; segredos vivem apenas em variáveis de ambiente do BaaS (server-side), fora do Git. **Recomendação:** manter o repositório público (preserva o ethos open-source) e nunca versionar segredo algum.

### 5.7 Conformidade (LGPD)
Avaliações atreladas a vínculo institucional são tratamento de dado pessoal: exigem **consentimento explícito**, **finalidade declarada** e **minimização** — exatamente o que a arquitetura acima persegue ao não trafegar RA/notas/nome e ao descartar o e-mail após derivar o hash de unicidade.

---

## 6. Pipeline de Avaliações sem Back-end (Arquitetura Homologada)

> **Status (2026-08-02):** caminho **homologado pelo dono**. Preserva a RNF02 — nenhum serviço em runtime, nenhum segredo versionado, custo zero em todos os estágios. Implementa RF15, RF16 e RF17.
>
> **Atualização (2026-08-04):** o estágio [1] deixou de ser um formulário nativo do site com Apps Script como endpoint (`tools/apps-script/recebe-review.gs`, `ModalAvaliacao.tsx`, `envio.ts` — todos removidos) e passou a ser um **Google Forms hospedado em conta Workspace da UTFPR**, com login obrigatório em domínio `@*.utfpr.edu.br`. Os estágios [2]–[4] não mudaram: mesma planilha de duas abas, mesma fronteira de confiança, mesma ingestão semanal para `data/reviews.json`. O desenho completo da troca, com o motivo, está em `docs/superpowers/specs/2026-08-04-reviews-forms-design.md`. §6.2, §6.5, §6.6 e §6.9 abaixo foram atualizadas para o fluxo atual; o texto anterior sobre o Apps Script existe só como registro de que essa vantagem (resposta de sucesso/erro, validação antes de gravar) foi trocada conscientemente pela autenticação institucional, que fecha a maior parte do limite do §5.1.

### 6.1 Princípio: Git como banco de dados

A avaliação compartilhada exige *alguma* camada comum, mas não exige um servidor. O acordo é: **a coleta é externa e gratuita; a publicação é um artefato versionado no próprio repositório.** O site consome um JSON commitado, exatamente como já consome `data/turmas/<sem>.json`.

Consequência que sustenta a RNF02: **o site nunca fala com o Google em runtime.** Se a planilha cair, for apagada ou a automação falhar, a plataforma continua servindo o último estado bom. A dependência externa existe só no momento da ingestão semanal, offline, e sua falha é silenciosa e reversível.

### 6.2 Os quatro estágios e a fronteira de confiança

```
[1] Coleta        Google Forms (login @*.utfpr.edu.br) → aba Respostas   só quem abre pelo botão "Avaliar" no site
[2] Bruto         Aba "Respostas" — NÃO publicada, contém e-mail          só o moderador vê
──────────────────────── fronteira de confiança ────────────────────────
[3] Curadoria     Aba "Homologado" — publicada como CSV    só linhas aprovadas, só colunas públicas
[4] Publicação    Action semanal → data/reviews.json       público e versionado
```

A fronteira fica **entre [2] e [3]**, não na entrada. É o que permite ser "público e aberto" sem publicar texto não moderado: o que é público é a *saída curada*.

**A fronteira é física, não convencional.** As duas abas vivem na mesma planilha, mas o recurso *Publicar na web* do Google Sheets opera **por aba**: só a `Homologado` recebe URL pública de CSV; a `Respostas` permanece acessível apenas a quem tem a planilha. A `Homologado` é gerada por fórmula (`FILTER`/`QUERY`) que seleciona **apenas as linhas com `aprovado`** e **apenas as colunas publicáveis** — o e-mail e o RA simplesmente não estão entre as colunas projetadas. Logo o CSV público é, por construção, incapaz de conter e-mail, RA ou linha não moderada; não se depende do validador para removê-los.

Erro a evitar: publicar a aba de respostas brutas. Isso exporia todo texto submetido no instante do envio, anulando o portão de moderação e publicando conteúdo potencialmente difamatório sem revisão.

### 6.3 Unidade de avaliação e esquema do registro

A unidade é o par **professor + disciplina + semestre**, e não a disciplina isolada: é isso que permite a consulta por professor da RF17 e reconhece que a mesma matéria muda completamente conforme quem a ministra.

```jsonc
{
  "id":            "hash estável da linha (idempotência da regeneração)",
  "professorId":   "slug do roster curado — ver 6.4; ausente enquanto pendente",
  "professorTexto": null,           // preenchido só na rota "Professor Não Ofertado"
  "codigo":        "ICSD20",
  "semestre":      "2025/2",        // ver 6.6: vem do histórico, não é digitado
  "situacao":      undefined,       // ausente — o Forms não pergunta (ver abaixo)
  "autor":         "Nome Completo",  // ou nome social completo — RNF06
  "personalidade": 4,               // 1–5 — trato, acessibilidade (não é "geral")
  "didatica":      5,               // 1–5
  "dificuldade":   3,               // 1–5  (1 = fácil, 5 = difícil)
  "cargaTrabalho": 2,               // 1–5  (1 = pouca, 5 = muita)
  "avaliacao":     "provas",        // provas | trabalhos | misto
  "qtdProvas":     2,               // detalhamento OPCIONAL — ausente ≠ zero
  "qtdTrabalhos":  1,
  "comentario":    "texto livre, ≤ 1000 caracteres"
}
```

O esquema real é o exportado por `src/domain/reviews/tipos.ts` (`Review`); o trecho acima é ilustrativo, não normativo — em caso de divergência a interface TypeScript vence. Duas mudanças em relação ao desenho original: a vertical antes chamada `geral` é **`personalidade`**, sobre trato e acessibilidade (a régua de 1–5 está em `reviewsComuns.tsx`, reproduzida no formulário); e o vocabulário de `tags` foi removido — ver §6.5.

**Semestre (resposta ao cenário do item 8):** não é campo digitado nem inferido — `DisciplinaCursada` **já carrega `ano` e `semestre`** desde a ingestão do PDF, e a verificação nos históricos reais de referência confirmou **zero ausências** em 32 cursadas por documento, cobrindo de `2023/2` a `2026/1`. O site preenche o campo a partir do histórico e o validador o reconfere contra a oferta. Isso elimina a classe inteira de erro "aluno lembra errado do semestre" e é o que torna a chave `(professor, disciplina, semestre)` confiável.

**Situação:** o Forms não pergunta se o aluno foi aprovado ou reprovado — perguntar convidaria à omissão de quem reprovou — e o campo fica ausente no registro publicado. Só disciplinas concluídas (aprovação ou consignação) são avaliáveis (§6.6); reprovação nunca chega ao formulário, então a marca `situacao` que o desenho original previa manter nunca é preenchida na prática.

### 6.4 Identidade do professor — seleção a partir da oferta

**O professor é escolhido pelo aluno numa lista montada a partir das ofertas oficiais.** Quando o layout do histórico imprime o docente, o parser usa esse nome apenas para pré-selecionar a unidade correspondente no roster; a pessoa continua podendo corrigir a escolha. Quando o PDF não traz professor ou ele não existe nas ofertas versionadas, a seleção permanece manual, com a rota *Professor Não Ofertado*.

Duas razões sustentam a escolha:

1. **Relevância.** A avaliação só ajuda a decidir turma se o par professor + disciplina puder ser reencontrado por quem lê. Docente que não oferta mais aquela matéria não informa decisão.
2. **Robustez.** O elenco vem de `data/turmas/<sem>.json`, dado oficial já validado pelo pipeline (RNF03), com grafia canônica. Elimina toda a classe de erro da extração textual.

> **Registro da alternativa descartada.** A extração do professor pelo PDF **é tecnicamente viável** — a coluna `Situação/Professores` é padronizada e o pdf.js entrega `"Nome Completo - Titulação"` num único item, dispensando lógica posicional. Foi descartada por desnecessária, não por impossível. O modo de falha medido era truncamento por largura de coluna (2, 8 e 10 nomes cortados conforme a variante de export), benigno mas exigindo reparo por casamento de sufixo. Se algum dia o pré-preenchimento automático virar requisito, é por aqui.

#### A unidade avaliada é a turma, não a pessoa

Quando dois docentes dividem **a mesma turma no mesmo horário**, eles formam uma **unidade** e são avaliados juntos, exibidos como `Fulano / Sicrano`.

O motivo é semântico, não de conveniência: a didática, o sistema de avaliação e a carga que o aluno viveu são os da turma **como ela foi ministrada**. Deixar escolher só um dos dois obrigaria a atribuir a uma pessoa uma nota de didática que descreve a dupla — um dado que ninguém deu. Multi-seleção com notas compartilhadas teria o mesmo defeito, multiplicado.

- **Id da unidade:** slugs individuais **ordenados** e unidos por `+` (`fulano-de-tal+sicrano-da-silva`). A ordenação é obrigatória: a fonte lista os nomes na ordem que quiser, e sem ela a mesma dupla geraria ids diferentes conforme o semestre, fatiando o acervo de uma turma em dois.
- **Solo e dupla são unidades distintas.** Quem deu sozinho numa turma e acompanhado em outra gera duas entradas — foram duas experiências de aula diferentes, e não podem cair na mesma média.
- **A unidade é localizável por qualquer um dos seus membros**, então o painel de um docente ainda encontra as turmas em que ele lecionou em dupla. Elas aparecem numa seção própria, *fora* da média da unidade consultada, porque descrevem outro contexto.

#### Escopo da lista: união das ofertas cobertas

A lista usa a **união de todos os semestres cobertos** em que a disciplina aparece — não apenas o mais recente. Coleta ampla, filtragem na exibição: assim nada se perde quando um docente volta a ofertar depois de um semestre fora.

Medição nos históricos de referência sustenta a decisão: **127 de 128 cursadas** têm elenco disponível, porque as disciplinas se repetem entre semestres — quem cursou em 2024/1 encontra a matéria ofertada de novo em 2026/x.

#### O elenco não cobre todo mundo — e isso é caminho principal, não borda

A pergunta decisiva não é se a *disciplina* tem elenco, e sim se o *professor com quem a pessoa cursou* está nele. Cruzando os professores reais de cada histórico contra o elenco das ofertas cobertas:

| Histórico | professores no histórico | ausentes (elenco BSI) | ausentes (elenco global) |
| :--- | ---: | ---: | ---: |
| Aluna A (3 exports) | 25 / 21 / 22 | 0 / 0 / 0 | 0 / 0 / 0 |
| Aluna B (mais adiantada) | 36 | 6 (17%) | **4 (11%)** |

Para quem está no meio do curso, o elenco cobre **tudo**. A falha se concentra em quem está mais adiantado — semestres antigos e disciplinas de humanidades têm rodízio maior de docente. É um **piso**: a medição casa no nível de conjunto, enquanto na prática o aluno precisa do professor listado *naquela disciplina específica*, então a taxa real é maior.

> **Evidência para o elenco global (§6.11):** unir o elenco de **todos os cursos cobertos** — e não só o do curso do aluno — derruba a falha de 17% para 11% no caso mais adiantado. Professores lecionam em mais de um curso; o roster tem de ser global.

O escape, portanto, é minoria mas não é desprezível, e cresce com a senioridade de quem avalia — justamente quem tem mais o que dizer. Não pode ser beco sem saída.

#### "Professor Não Ofertado" — captura em texto livre + moderação

Quando o docente não estiver na lista, o aluno aciona **Professor Não Ofertado**, que abre um diálogo:

- Explica que a seleção significa que aquele professor **não consta na oferta atual nem na mais recente** daquela disciplina;
- Pede **confirmação** de que é esse o caso;
- Oferece contato pela constante `EMAIL_CONTATO` (`src/ui/telas/Contato.tsx`) caso não seja — nunca com o endereço repetido em literal;
- **Captura o nome do professor em texto livre.**

A avaliação é **aceita e retida**, marcada como pendente de roster. Na curadoria semanal o moderador confere o nome e o acrescenta ao **roster curado de docentes** em `data/`; a partir daí a avaliação passa a ser publicável e aquele professor entra na lista de seleção das próximas.

Efeito de longo prazo: o roster **cresce além da cobertura de ofertas**, alimentado exatamente pelos casos que faltavam. A taxa de escape cai sozinha conforme a plataforma é usada.

#### Identificador

`professorId` é um **slug normalizado** (minúsculas, sem acento, sem titulação), derivado do roster curado, com **mapa de apelidos** para variações de grafia entre fontes — o mesmo padrão que `motor/identidade.ts` já aplica a códigos de disciplina equivalentes. Enquanto pendente de moderação, a avaliação carrega o texto livre em vez do slug.

### 6.5 Taxonomia de tags — critério de admissão

> **Revogada (2026-08-04, commit `aa2f37e`).** O vocabulário de tags saiu de escopo com a troca para o Google Forms — o custo de manter a validação de vocabulário nas três camadas (Forms, Apps Script, ingestão) era desproporcional ao ganho, e a taxonomia foi removida do domínio (`tipos.ts`), da ingestão e da UI. **A tabela abaixo permanece como registro do critério de "comportamento observável"**, que ainda governa a redação das cinco perguntas de nota do formulário atual (§3.3 do desenho em `docs/superpowers/specs/2026-08-04-reviews-forms-design.md`) — nenhuma âncora de escala descreve o professor como pessoa, todas descrevem o que aconteceu com quem respondeu.

**Regra (histórica):** toda tag precisava ser explicável por **comportamento observável**. Tags ancoradas em personalidade ("gente boa") são inadmissíveis: não são verificáveis, não ajudam a decidir turma e são exatamente a superfície de risco difamatório que a TASK-08 isola. Quando a intenção for elogiar postura, traduza para conduta observável.

As tags são agrupadas em quatro categorias — **Conteúdo e avaliação**, **Didática e material**, **Comunicação e trato** e **Rotina e prazos** —, o que reduz a lista a blocos legíveis e coloca cada par contraditório lado a lado.

**Pares opostos são mutuamente exclusivos.** Marcar *Acessível* e *Pouco acessível* juntas não é opinião matizada, é dado incoerente: ninguém teve um professor que respondia rápido e não respondia. A interface troca um pelo outro ao clicar, e as três camadas de validação recusam quem insistir. Os pares são `cobra-so-o-ensinado`/`cobra-alem-do-ensinado`, `acessivel`/`pouco-acessivel`, `chamada-rigorosa`/`chamada-flexivel`, `prazos-rigidos`/`aceita-atraso` e `corrige-rapido`/`corrige-devagar`.

| Tag | Comportamento observável que a justifica |
| :--- | :--- |
| `chamada-rigorosa` | Faz chamada com regularidade e aplica a reprovação por falta |
| `chamada-flexivel` | Não faz chamada sempre, ou aprova apesar de volume alto de faltas |
| `acessivel` | Mantém canal aberto e responde em prazo razoável fora de aula |
| `pouco-acessivel` | Comunicação difícil, demora ou não responde fora de aula |
| `trata-com-respeito` | Não expõe nem constrange aluno em público *(substitui "gente boa")* |
| `aberto-a-rever-nota` | Aceita e analisa pedido de revisão de correção |
| `cobra-so-o-ensinado` | A prova não traz assunto fora do que foi dado em aula e lista |
| `cobra-alem-do-ensinado` | A prova traz assunto não coberto em aula nem em lista |
| `slides-bastam` | O material publicado permite estudar sem assistir à aula |
| `corrige-rapido` | A nota sai antes da avaliação seguinte |
| `corrige-devagar` | A nota sai perto do fim do semestre |
| `prazos-rigidos` | Não aceita entrega fora do prazo |
| `aceita-atraso` | Há política explícita de entrega atrasada |
| `da-revisao-antes-da-prova` | Existe aula de revisão antes da avaliação |
| `oferece-substitutiva` | Existe segunda chance formal de avaliação |
| `trabalho-em-grupo-pesado` | Parcela relevante da nota depende de trabalho em grupo |
| `aula-pratica` | O tempo de aula é majoritariamente mão na massa |

### 6.6 Submissão restrita à plataforma e ingestão semanal

**Origem restrita (RF15).** O botão *Avaliar* só existe na tela de quem carregou o histórico, e só nas disciplinas concluídas por aprovação ou consignação. A consignação preserva duas identidades: o código original cursado alimenta nome, professor e formulário; o código canônico da matriz continua alimentando progresso, equivalências e Planejamento. Reprovações ficam fora.

**O formulário é o Google Forms, num domínio próprio da UTFPR.** O aluno sai da plataforma, mas a saída é curta: ao clicar *Avaliar* numa disciplina concluída, a mesma tela que conhece o histórico monta o seletor de professor da §6.4 (com busca, e a opção *Meu professor não está na lista*) e abre o Forms em nova aba com `autor`, `codigo`, `disciplina`, `semestre` e `professor` já preenchidos por URL (`src/domain/reviews/forms.ts`, `montarUrlDeAvaliacao`). O prefill **não trava campo** — o Forms não tem campo somente-leitura —, então quem edita o valor antes de enviar cai na validação da ingestão; é conveniência, não integridade.

**Por que trocar o formulário nativo + Apps Script por isso:** o desenho anterior admitia, com honestidade, três limites — não autenticava o RA, o anti-Sybil era humano, e não havia rate limiting por IP (ver versão histórica destas notas em `docs/superpowers/plans/2026-08-04-reviews-forms.md`). O Forms hospedado em conta Workspace da UTFPR, com **login obrigatório em `@*.utfpr.edu.br`**, resolve o primeiro e, com ele, boa parte do segundo — é a âncora anti-Sybil institucional que o §5.2 buscava, só que sem custo de infraestrutura. Em troca, perde-se o controle sobre a UI de envio (resposta de sucesso/erro em tempo real, validação client-side antes de gravar), o que foi julgado aceitável frente ao custo de manter ~566 linhas de `ModalAvaliacao.tsx` mais um endpoint em Apps Script.

**Limite honesto, que não muda com a troca:** a restrição de domínio impede quem não é da UTFPR, mas não impede um aluno de avaliar disciplina que não cursou — não há como verificar matrícula sem o RA, que é dado proibido. A defesa real continua sendo o **validador na fronteira** (abaixo) somado à **moderação humana**, não o transporte.

#### Da planilha ao site, coluna a coluna

A aba `Respostas` é criada pelo próprio Google Forms; colunas de apoio à moderação (`aprovado`, `alerta_pii`, `alerta_prefill`) são acrescentadas à direita, em área livre, sem tocar nas colunas nativas do Forms. A coluna `aprovado` é a que o moderador preenche à mão — o padrão é vazio, ou seja, **nada é publicado por omissão**.

A aba `Homologado` projeta **só o que é público**, na ordem de cabeçalho que `scripts/ingerir-reviews.ts` exige: `carimbo, autor, codigo, semestre, professor, personalidade, didatica, dificuldade, cargaTrabalho, avaliacao, comentario` (mais `qtdProvas`/`qtdTrabalhos` quando o detalhamento opcional existir), filtrando por `aprovado = "SIM"`. É ela — e só ela — que recebe URL de CSV.

Três coisas que essa projeção garante por construção, sem depender de disciplina de ninguém:

- **E-mail e RA ficam de fora.** Nenhum dos dois está entre as colunas projetadas, então o CSV público é *incapaz* de contê-los — o validador da ingestão ainda assim confere a ausência (abaixo), como cinto e suspensório.
- **A fórmula filtra por `aprovado = SIM`** — nada não aprovado sai.
- **`professor` chega como nome, não como slug.** A ingestão resolve o nome contra o roster (`resolverProfessor`); quando não resolve, a linha entra na rota *Professor Não Ofertado* — não publica e **não é erro**, fica pendente até o nome ser promovido ao roster.

**Regeneração total, nunca append.** A automação semanal reconstrói `data/reviews.json` **inteiro** a partir das linhas aprovadas. Com `id` estável por linha, o JSON é função pura da planilha: rodar duas vezes produz o mesmo resultado, e desaprovar uma linha a remove da próxima publicação. É a mesma disciplina dos parsers de `tools/`.

**Validador (RNF03, `0 erros`).** Implementado em `scripts/ingerir-reviews.ts`, no espírito de `validate_turmas.py`: **qualquer erro aborta a ingestão inteira e nada é publicado.**

Escrito em TypeScript, e não em Python como o resto de `tools/`, por correção: os limites e o tipo `Review` moram no domínio TS. Reimplementá-los em Python criaria duas fontes da verdade divergindo em silêncio — exatamente o que o validador existe para impedir.

*Estrutura do CSV:*
- colunas obrigatórias presentes (`carimbo, autor, codigo, semestre, professor, personalidade, didatica, dificuldade, cargaTrabalho, avaliacao, comentario`);
- **colunas `ra` e `identidade` ausentes** — se aparecerem, a projeção da aba foi alterada e está vazando dado privado: recusa o CSV inteiro;
- parsing conforme RFC 4180, escrito à mão, porque o comentário é texto livre e pode conter vírgula, aspas e quebra de linha. Um `split(",")` corromperia essas linhas em silêncio.

*Coerência com o dado oficial — o que o Forms não consegue checar:*
- `codigo` existe em alguma matriz ou oferta versionada;
- `professor` resolve, pelo nome, para um id existente no **roster** construído a partir das ofertas de todos os cursos;
- linha sem professor resolvido é **pendente de roster**: não publica e **não é erro** — fica aguardando a promoção pela moderação.

*Forma:*
- `semestre` em `AAAA/S`; `autor` não vazio;
- notas inteiras de 1–5; `avaliacao` no enum (`provas`/`trabalhos`/`misto`, mapeado dos rótulos em português da pergunta 10 do Forms);
- comentário dentro do limite de 1000 caracteres;
- **guarda de PII por regex** — RA de 7 dígitos, e-mail e telefone reprovam a linha.

*Determinismo:* o `id` é hash estável de `(carimbo, autor, codigo, semestre, professor)`, e a saída é ordenada por ele. Rodar duas vezes produz byte a byte o mesmo arquivo, e `geradoEm` só avança quando o conteúdo muda de fato — sem isso o Action commitaria ruído toda semana.

**Sem teto automático por pessoa.** `MAX_AVALIACOES_NO_SEMESTRE` (20) limita apenas `qtdProvas`/`qtdTrabalhos` como teto de sanidade contra erro de digitação — não é um limite de quantas avaliações uma pessoa pode enviar. Nada na ingestão impede um mesmo aluno de avaliar várias disciplinas; a mitigação para volume anômalo é a moderação semanal (§6.7), não um teto automático.

**Limiar de exibição.** Agregado com N baixo mente: uma única avaliação vira "100%". Abaixo de um N mínimo, exibe-se o comentário mas **não** a estatística agregada. O valor exato é calibração de produto; a regra é estrutural.

### 6.7 Governança: consentimento, moderação e retratação

- **Consentimento (RNF07):** o formulário declara, antes do envio, que **o nome completo ficará público** e versionado, com a finalidade declarada de orientar a escolha de turmas.
- **Moderação semanal:** na ausência de verificação institucional, o moderador humano **é** a camada anti-abuso — ele substitui o anti-Sybil da §5.4. Rejeita ataque pessoal, conteúdo não verificável e PII de terceiros.
- **Camadas segregadas (TASK-08):** avaliação de *disciplina* e avaliação de *professor* permanecem streams distintos no mesmo pipeline, discriminados no registro, para que a de professor possa ter moderação mais rígida sem travar a outra.
- **Retratação:** desaprovar a linha na planilha remove a avaliação das publicações seguintes. **O histórico do Git não é reescrito** — isso é comunicado ao usuário no consentimento, não escondido.

### 6.8 Funcionamento diário

| Quando | Quem | O quê |
| :--- | :--- | :--- |
| Ao acessar após novo semestre | Aluno | Recebe **uma vez por semestre** (RF16) o convite para avaliar as disciplinas de `periodoDocumento`; o estado fica gravado por semestre, então o semestre seguinte convida de novo |
| A qualquer momento | Aluno | *Avaliar* disponível em toda disciplina concluída, na tela de progresso |
| Ao montar a grade | Aluno | Clica no professor da turma e abre o painel lateral com o agregado daquele docente (RF17) |
| 1× por semana | Moderador | Percorre as linhas novas na planilha privada e marca `aprovado` |
| 1× por semana, automático | GitHub Actions | Baixa o CSV, valida, regenera `data/reviews.json`, commita; o deploy existente publica |
| Sempre | Site | Lê o JSON versionado — sem rede, sem chave, sem custo |

### 6.9 Controle de abuso por volume — o que é e o que não é possível

**Bloqueio por IP continua não implementável nesta arquitetura, pelo mesmo motivo de sempre: o dado não existe.** O site é estático e nunca recebe a submissão — ela vai direto do navegador do aluno para o Google Forms. Limitar por IP exige um ponto que veja a requisição e guarde estado entre requisições; a RNF02 exclui exatamente isso, e o Forms não expõe o IP do respondente a quem é dono do formulário.

**A raiz anti-Sybil deixou de ser humana e passou a ser institucional.** Com *Coletar endereços de e-mail* → **Verificado** e *Restringir a usuários em utfpr.edu.br* → **ligado** nas configurações do Forms (§3.1 do desenho em `docs/superpowers/specs/2026-08-04-reviews-forms-design.md`), só responde quem está logado numa conta `@*.utfpr.edu.br`, e o Google grava esse e-mail sem que o respondente possa alterá-lo. Isso fecha a maior parte do que o §5.4 chamava de "verificação institucional = raiz anti-Sybil": cada identidade falsa exige uma conta institucional distinta, o que exige estar matriculado.

**Raio de dano de quem tem a conta e ainda assim abusa, e é aqui que a fronteira paga:** envios caem na aba **privada** de Respostas e só viram acervo público depois de um humano marcar `aprovado`. Enxurrada custa **tempo de moderação**, não polui o site. O acervo público é imune por construção — a mesma propriedade que segura conteúdo difamatório.

O que existe hoje, em camadas:

| Camada | Mecanismo | Alcance real |
| :--- | :--- | :--- |
| **Anti-Sybil / anti-robô** | Login obrigatório em domínio `@*.utfpr.edu.br`, e-mail verificado gravado pelo Forms | Fecha a raiz: cada envio custa uma conta institucional distinta. Não impede um aluno real de avaliar disciplina que não cursou (§6.6) |
| Teto por pessoa | **Não existe automaticamente.** `MAX_AVALIACOES_NO_SEMESTRE` só limita o detalhamento opcional (`qtdProvas`/`qtdTrabalhos`), não quantas avaliações uma pessoa envia | Um volume anômalo do mesmo `autor` é visível na planilha e pego na moderação — reativo, não preventivo |
| Alerta de moderação | Colunas de apoio `alerta_pii` (RA/e-mail/telefone no comentário) e `alerta_prefill` (código fora do padrão esperado, indício de campo editado) | Reduz o custo de revisão: aprovar em lote olhando só as linhas acesas |
| Publicação | Portão de moderação semanal (§6.2) | Uma enxurrada gera muitas linhas **não aprovadas**: o custo é tempo do moderador, não conteúdo público |

Ou seja: o dano de um flood continua sendo **absorvido** pela fronteira de confiança, não evitado na origem — mas agora a origem já filtra quem não tem vínculo institucional, o que o desenho anterior não fazia.

**Se um teto automático por pessoa virar requisito firme**, ele é implementável na ingestão contando linhas por `autor` e por semestre — mas `autor` é texto livre digitado, então o teto seria contornável trocando a grafia do nome; seria segurança de fachada sem a verificação de identidade que faltaria por trás. O gatilho real para reabrir essa discussão é o mesmo do bloqueio por IP: se o volume superar o que a moderação semanal absorve, é hora de reavaliar infraestrutura própria, não de simular um teto que não protege de fato.

### 6.10 Compartilhamento entre cursos

Uma avaliação de *Professor X em Estruturas de Dados* vale para quem cursa BSI e para quem cursa Engenharia de Computação — é a mesma pessoa dando a mesma matéria. O acervo, portanto, **não é particionado por curso**.

**Evidência no dado:** as ofertas já registram turmas compartilhadas. A turma `S73` de `ICSHX0` traz `prioridade_cursos: [Eng De Computação, Sist De Informação]` e `optativa_matrizes: ["981", "962"]` — um único professor, uma única turma, dois cursos.

Três consequências de arquitetura:

1. **Um único acervo.** `data/reviews.json` fica na raiz de `data/`, não sob a pasta de um curso. A chave `(professorId, código, semestre)` não é namespaced por curso.
2. **Roster global.** O elenco de docentes é construído a partir das ofertas de **todos** os cursos cobertos, não só o do aluno. Além de correto, é medível: reduz a falha de seleção de 17% para 11% (§6.4).
3. **Leitura resolve por equivalência.** Ao exibir avaliações de uma disciplina, o curso em que o leitor está resolve o código pelo seu próprio `MapaIdentidade` (`motor/identidade.ts`) e reúne as avaliações de **todos os códigos equivalentes**. Assim, se a mesma exigência curricular tem código distinto entre matrizes, o acervo continua único do ponto de vista de quem lê.

O primeiro curso a receber a interface foi **BSI 981** — um piloto, não um recorte permanente. Com o piloto validado, a lista foi aberta para todas as matrizes cobertas pela plataforma: o ganho é imediato e cruzado, porque professores são compartilhados entre cursos.

**O recorte é de superfície, e vive num lugar só.** `MATRIZES_COM_REVIEWS`, em `src/domain/reviews/config.ts`, lista as matrizes cujo curso já expõe a camada — hoje `[981, 806, 823, 844, 962, 968, 973, 978]`, ou seja, todas as matrizes que a plataforma cobre. Enquanto uma matriz não estiver ali, o aluno daquele curso não vê a seção de avaliar nem o painel de professor; habilitar uma nova matriz futura continua sendo uma linha nessa lista.

O que **não** é recortado: o acervo continua único e o roster segue sendo construído sobre as ofertas de **todos** os cursos, habilitados ou não. A consequência é a pretendida — no instante em que uma matriz entra na lista, os alunos dela já enxergam as avaliações escritas por alunos de outros cursos sobre os docentes que compartilham. Habilitar é uma linha; não há migração, reprocessamento nem acervo separado.

### 6.11 Limites honestos desta arquitetura

1. **Não autentica RA.** O PDF do histórico não tem assinatura verificável por terceiros (§5.1). O RA é autodeclarado: encarece a fraude e serve à moderação, não a impede. O login institucional do Forms (§6.2, §6.9) prova vínculo com a UTFPR, não matrícula na disciplina avaliada.
2. **Anti-Sybil é institucional, não mais puramente humano.** O login obrigatório em domínio `@*.utfpr.edu.br` fecha a raiz — cada identidade falsa exige uma conta institucional distinta —, mas a restrição de domínio não impede um aluno real de avaliar disciplina que não cursou, nem substitui a revisão semanal como última camada. Escala até certo volume; acima dele, a §5 volta à mesa.
   - **Sem teto automático por pessoa nem rate limiting por IP** (§6.9): o Forms não expõe IP e não há servidor nosso no caminho. Um teto por `autor` seria contornável, já que o nome é texto livre. O que existe é a moderação absorvendo o flood.
3. **Latência de uma semana.** Por desenho — é o preço do portão de moderação e do custo zero, e o Forms informa isso na tela de confirmação (§3.1 do desenho da coleta).
4. **Publicação é permanente no Git.** Mitigada por consentimento explícito, não eliminável sem reescrever histórico.
5. **Prefill não trava campo.** O Forms não tem campo somente-leitura; o aluno pode editar `codigo`, `semestre` ou `professor` antes de enviar. A validação da ingestão (§6.6) é a linha de defesa real contra isso, não o prefill em si.
