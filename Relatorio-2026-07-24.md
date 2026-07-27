# Relatório de auditoria — 24-07-2026

## Finalidade e escopo

Este relatório registra a auditoria feita em 24 de julho de 2026 sobre a Engenharia de Computação no Oásis UTFPR, com foco em três perguntas:

1. O simulador de formatura representa adequadamente um estudante em fase final de curso?
2. A Grade Inteligente é coerente com a matriz e as regras curriculares?
3. Há insumos e qualidade suficientes para iniciar a matriz nova de Engenharia de Computação (962)?

É um documento de continuidade: outra pessoa ou IA deve conseguir reproduzir as conclusões, priorizar correções e saber quais documentos ainda solicitar. Não contém nome, matrícula, notas, disciplinas individualmente cursadas nem cópia de histórico escolar. Históricos são insumos privados, processados localmente e **nunca** devem entrar no repositório.

## Situação do repositório e da produção observada

- Base auditada: `main`, no commit `18b38c3` (`alinha check-in e progresso da engcomp`).
- Produção: GitHub Pages publicada com sucesso em 23-07-2026; a página respondeu HTTP 200 durante a verificação.
- Houve dois commits residuais em uma ramificação local de Engenharia de Computação; por orientação do mantenedor, eles foram explicitamente desconsiderados nesta auditoria.
- A árvore tinha dois arquivos locais não rastreados, já existentes: `AGENTS.md` e `.claude/settings.local.json`. Eles não fazem parte das conclusões nem devem ser incluídos acidentalmente em um commit.

## Evidências e verificações executadas

| Verificação | Resultado | Observação |
| --- | --- | --- |
| Suíte TypeScript/Vitest | 94 testes aprovados; 8 ignorados | Os ignorados dependem de históricos privados e os caminhos locais configurados estão desatualizados. |
| Build de produção | Aprovado | Há aviso de bundle principal grande (aprox. 1,6 MB), sem relação direta com a auditoria curricular. |
| Validador da matriz | Aprovado | `tools/validate_matriz.py` valida somente a matriz 981; não prova a correção da 844. |
| Estrutura de turmas EC 2025-2 | 0 erros | 12 avisos esperados para TCC/EaD sem horário. |
| Estrutura de turmas EC 2026-1 | 0 erros | 14 avisos esperados para TCC/EaD sem horário. |
| Leitura de dois históricos reais da matriz 844 | Sem avisos do parser | Usados apenas localmente para auditoria; não versionar. |
| Leitura de um histórico real da matriz 962 | Sem avisos do parser | Confirma viabilidade do parser para o formato observado; não é validação completa da matriz. |

### Limite importante da cobertura atual

`tests/historico-real.test.ts` ainda referencia caminhos antigos no disco `I:`. Por isso seus oito casos são ignorados mesmo quando os PDFs privados existem em outra pasta local. A suíte sintética continua sendo a que roda em CI. Antes de depender dos casos reais como uma verificação local, atualizar somente as referências locais/documentação (sem adicionar PDFs ao Git) ou criar uma configuração local ignorada pelo Git.

## Matriz 844: o que está sólido

A modelagem conceitual da matriz antiga de Engenharia de Computação está, em boa parte, correta.

- A matriz possui 3.460 h obrigatórias, 270 h de optativas profissionalizantes, duas trilhas de no mínimo 90 h, 90 h livres remanescentes (outras trilhas/isoladas), 90 h eletivas e 400 h de estágio obrigatório.
- A configuração `ENG_COMP_844` em `src/domain/cursos.ts` representa a regra das duas trilhas e separa a carga optativa bruta da carga efetivamente validada. Essa separação é necessária: horas aprovadas em optativas não bastam se a composição de trilhas não satisfaz a regra curricular.
- A matriz em `data/eng-comp/matriz-844.json` tem 236 disciplinas, sem códigos duplicados; as obrigatórias somam 3.460 h quando ENADE é excluído.
- A interpretação foi confrontada com o PPC 844 e com a consulta curricular oficial disponível localmente. Um arquivo denominado `trilhas eng comp.pdf` não deve ser usado como fonte para 844: trata-se de material de BSI 981.

### Inconsistências de dados que precisam de correção

1. `CSD20` contém `aulas_semanais.praticas: 844`, embora a fonte indique 0. A carga total permanece 3, mas o valor é um vazamento evidente do número da matriz no parser/saída.
2. `CSX43` (TCC 2) e `EEF31` (Ética) têm `periodo: null`; a matriz oficial os posiciona no 10º período.
3. Não há validador genérico de matrizes. Os testes 844 verificam esquema, totais e pré-requisitos, mas não detectaram as três falhas acima.

Esses pontos não invalidam a estrutura curricular como um todo, mas impedem classificá-la como completamente validada para servir de molde de importação da 962.

## Teste de conclusão próximo ao fim do curso (matriz 844)

Foi usado um perfil privado de estudante do 10º período, em fase final de curso, como caso de engenharia. A conclusão abaixo é apresentada apenas em termos curriculares, sem dados pessoais.

### Resultado esperado

O perfil tinha pendências pequenas e coerentes com conclusão em um ou dois períodos: uma lacuna obrigatória curta, pendências de optativas/eletivas e uma segunda trilha quase concluída (60 de 90 h). Portanto, o simulador não deveria projetar uma conclusão distante nem declarar impossibilidade de formatura.

### Resultado atual

Com os dados de oferta sem alteração, o simulador retornou `semestreFormatura: null` nos ritmos 4, 5 e 6 disciplinas. Ele planejou apenas 2026-2 e 2027-1, mas não reconheceu a segunda trilha como viável e, assim, reprovou a regra das duas trilhas.

Ao normalizar **somente em memória para a auditoria** os códigos ofertados para seus códigos curriculares equivalentes, o mesmo cenário retornou `2027-1` nos três ritmos: dois períodos a partir de 2026-2. Esse é o horizonte esperado e demonstra que o problema é de identidade/equivalência entre oferta e matriz, não de carga curricular excessiva.

### Segundo caso de controle

Outro perfil privado da matriz 844 já satisfazia os totais obrigatórios, eletivos e as duas trilhas. Ainda assim, o simulador propôs duas obrigatórias iniciais que já estavam satisfeitas por códigos equivalentes. Isso confirma que a falha não é específica do perfil quase concluinte: ela é sistêmica quando códigos de histórico, matriz e oferta divergem.

### Falhas a corrigir no simulador

- Trocar comparações diretas de código por uma resolução central de equivalências em `simuladorFormatura.ts`.
- Normalizar as ofertas antes de inferir sazonalidade e disponibilidade futura, preservando também o código real da oferta.
- Manter a seleção explícita das trilhas-alvo e exigir duas trilhas válidas ao final, sem abandonar uma trilha já em 60/90 h.
- Definir uma política explícita para disciplinas `matriculadas`: conservadora (não presumir aprovação) ou planejada (considerar que serão aprovadas). Hoje esse estado não está suficientemente exposto como regra de simulação.

## Grade Inteligente: diagnóstico de coerência

A Grade Inteligente parte de candidatos elegíveis, mas perde a identidade da oferta real ao gravar a seleção. Em seguida, a resolução de horários procura diretamente o código gravado na oferta. Isso faz com que seleções válidas por equivalência deixem de ser encontradas, desapareçam da detecção de conflitos e possam ser contadas de maneira duplicada.

### Defeitos reproduzidos no caso quase concluinte

- Uma disciplina curricular foi selecionada por uma oferta de código equivalente, e apenas parte das seleções conseguiu ser resolvida para horário/conflitos.
- A mesma exigência curricular pôde aparecer por dois códigos equivalentes distintos.
- Uma mesma turma real pôde ser atingida por duas entradas curriculares e ser adicionada duas vezes.
- A Grade declarou não haver conflitos porque itens não resolvidos simplesmente não chegaram ao cálculo de choques.
- Em modo de avanço máximo, a duplicação se repetiu e a maior parte da seleção não possuía horário resolvido.
- A recomendação não dá prioridade suficiente para terminar a trilha parcialmente concluída. Ela usa a falta total de horas de trilhas, mas não restringe a escolha às trilhas que precisam ser completadas, como o simulador já deveria fazer.
- Disciplinas já matriculadas são expostas pela elegibilidade, mas não são filtradas adequadamente pela Grade Inteligente.

### Consequência prática

A Grade Inteligente não pode ainda ser considerada coerente/validada para Engenharia de Computação 844 com dados reais. Ela funciona em casos de códigos idênticos, mas pode recomendar duplicidades e produzir um diagnóstico falso de ausência de choque quando há equivalências entre a matriz e a oferta.

## Decisão arquitetural recomendada: identidade curricular central

Antes de ajustar regras isoladas, criar um resolvedor único de identidade curricular. Ele deve relacionar a disciplina canônica da matriz, suas equivalências/aproveitamentos, o código que aparece no histórico e o código/turma efetivamente ofertados.

O resolvedor deve retornar, em cada contexto, **tanto o código canônico da exigência quanto a identidade real da oferta**. Ele deve ser consumido por:

- verificação de disciplina cumprida (`cumpre`);
- elegibilidade;
- simulador de formatura;
- persistência/serialização da seleção de grade;
- montagem de itens da grade;
- detecção de choque;
- exportação, relatórios e importação de perfil.

Não é suficiente armazenar somente `codDisciplina` na seleção atual. A seleção precisa carregar o código/código de turma efetivamente ofertado, ou o contrato de `SelecaoTurma` deve ser ampliado de maneira compatível. Também deve haver desduplicação por exigência canônica **e** por oferta/turma real.

## Plano de implementação seguro, na ordem recomendada

1. **Criar e testar o resolvedor de identidade/equivalência.** Definir contratos claros e manter a matriz como fonte canônica; não adulterar a fonte oficial para encaixar comportamento prático.
2. **Corrigir o simulador.** Usar o resolvedor em aprovações e ofertas, preservar sazonalidade e implementar a política de disciplinas em andamento.
3. **Corrigir a Grade Inteligente.** Persistir a oferta real, resolver todos os itens selecionados antes de calcular choques, deduplicar e priorizar obrigatórias e as trilhas mais próximas de validação.
4. **Adicionar regressões sintéticas.** Não usar PDFs ou dados pessoais. Os cenários mínimos são: estudante com segunda trilha em 60/90 h e oferta equivalente, perfil integralmente satisfeito via equivalências, duas entradas equivalentes levando à mesma exigência, duas entradas levando à mesma oferta/turma e política conservadora/planejada para disciplinas matriculadas.
5. **Corrigir e revalidar a matriz 844.** Ajustar `CSD20`, os dois períodos do 10º período e criar validação genérica para qualquer matriz.
6. **Só então declarar a 844 como completa, testada e validada com casos reais.** Casos reais devem permanecer apenas como testes locais opt-in e ser representados em CI por fixtures anônimas equivalentes.

## Matriz nova 962: prontidão e insumos

### O que já existe e permite iniciar a descoberta

- PPC 2022 oficial da UTFPR, disponível publicamente: [PPC de Engenharia de Computação 2022](https://www.utfpr.edu.br/cursos/coordenacoes/graduacao/curitiba/ct-engenharia-de-computacao/documentos/projeto-pedagogico-do-curso-ppc/ppc_eng_comp_2022_final.pdf/%40%40download/file).
- Página oficial que identifica as matrizes 844 e 962 como ativas: [documentos do PPC do curso](https://www.utfpr.edu.br/cursos/coordenacoes/graduacao/curitiba/ct-engenharia-de-computacao/documentos/projeto-pedagogico-do-curso-ppc).
- PDF oficial de turmas abertas da 962, disponível localmente fora do repositório.
- Backup local de Grade na Hora, útil apenas como fonte secundária.
- Um histórico real 962, cuja leitura não gerou avisos, útil para testar localmente o parser.
- Captura local da consulta curricular que confirma, em alto nível, carga total de 4.095 h, obrigatórias de 3.255 h, estágio de 360 h, atividades de 30 h, extensão de 420 h e grupos optativos.

O PPC 2022 estabelece, em alto nível, 270 h de optativas profissionalizantes, pelo menos duas trilhas de 90 h, 90 h remanescentes livres/isoladas, 120 h de humanidades, 30 h de expressão gráfica, 360 h de estágio, 30 h de atividades complementares e 420 h de extensão. Essa estrutura é suficientemente clara para preparar o modelo de curso, mas não para gerar a matriz de dados de produção.

### O que falta para começar a implementação de produção

O insumo crítico ausente é uma exportação recente e completa da **Consulta Curso e Matriz Curricular** oficial da matriz 962, preferencialmente PDF/print em paisagem com todas as páginas. Ela deve conter, para cada disciplina:

- código e nome;
- período; cargas horárias e componentes semanal/teórico/prático quando exibidos;
- pré-requisitos e equivalências declaradas;
- grupos de optativas, trilhas e demais exigências;
- totais declarados da matriz.

Além dela, recomenda-se arquivar localmente, para rastreabilidade, o texto/PDF das Resoluções 371/2023 e 536/2024, que alteraram o PPC aplicável em Curitiba. A consulta curricular recente deve prevalecer se houver conflito. Também é desejável obter mais uma oferta oficial de turmas (por exemplo, 2025-2 ou 2026-2) para que o simulador não infira sazonalidade com uma única fotografia semestral.

### Formato pedido para os insumos

| Insumo | Formato recomendado | Onde guardar | Uso |
| --- | --- | --- | --- |
| Matriz 962 oficial | PDF original exportado do Portal, todas as páginas, sem edição | Pasta privada de referência | Extração e auditoria primária |
| Turmas abertas 962 | PDF oficial por semestre | Pasta privada de referência | Parser de ofertas e sazonalidade |
| Resoluções de alteração | PDF ou HTML salvo com URL e data | Pasta privada de referência | Rastreabilidade e conciliação |
| Históricos reais adicionais | PDF original, nunca commitado | Pasta privada de referência | Regressão local do parser e motor |
| Casos de regressão | JSON/fixtures sintéticos, sem dados pessoais | `tests/fixtures/` | CI e validação pública |

## Critério para liberar a matriz 962 no produto

Não habilitar a 962 no seletor de curso até que todos os itens abaixo sejam satisfeitos:

- matriz oficial extraída e validada por um validador genérico com zero erros;
- totais, grupos, trilhas, estágio e extensão conciliados com fonte oficial;
- ao menos uma oferta oficial estruturada e validada;
- resolvedor de identidade aplicado em perfil, elegibilidade, simulador e grade;
- testes sintéticos de equivalência, trilhas, extensão e conclusão;
- alguns testes locais privados, inclusive perfil em andamento e perfil avançado, executados sem avisos relevantes;
- simulador e Grade Inteligente sem recomendações não resolvíveis para oferta/horário;
- build e suíte completa aprovados.

## Próxima ação concreta

O trabalho pode começar agora pela infraestrutura de identidade curricular e pelos testes sintéticos de 844. Em paralelo, solicitar/exportar a Consulta Curso e Matriz Curricular completa da 962. Quando esse PDF chegar, o fluxo deve ser:

1. auditar texto e estrutura da fonte;
2. adaptar/criar parser de matriz multi-curso;
3. gerar `data/eng-comp/matriz-962.json`;
4. executar validador genérico com zero erros;
5. cadastrar a configuração 962 em `src/domain/cursos.ts`;
6. adicionar ofertas, fixtures e testes;
7. habilitar a interface somente após os critérios de liberação.

## Protocolo para continuidade por outra IA

- Ler primeiro `REPOSITORIO.md`, `Estrategia.md`, `Tasks.md` e este relatório.
- Tratar os documentos oficiais e os JSONs de dados como fontes separadas: correção de vivência deve entrar em camada de regra/anotação, nunca sobrescrever a fonte.
- Nunca abrir caminho para upload, envio ou versionamento de histórico escolar; o produto é estático e local-first.
- Registrar o plano implementado em `Tasks.md` antes de iniciar feature e, se houver mudança arquitetural, atualizar `Estrategia.md`.
- Não criar commit até haver testes e build aprovados; preservar arquivos locais preexistentes que não pertençam à tarefa.

## Arquivos principais para a próxima intervenção

- `src/domain/motor/simuladorFormatura.ts`
- `src/domain/motor/grade-magica.ts`
- `src/domain/motor/grade.ts`
- `src/domain/motor/elegiveis.ts`
- `src/domain/cursos.ts`
- `data/eng-comp/matriz-844.json`
- `tests/matriz-844.test.ts`
- `tests/historico-real.test.ts`
- `tools/validate_matriz.py`
