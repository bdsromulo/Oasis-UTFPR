# Liberação por desempenho, janela de aulas e simulador modelável — desenho

Três features encomendadas na mesma sessão (2026-08-06), a serem implementadas
em sequência no repositório sandbox (`oasisutfpr-sandbox`):

- **TASK-45** — pré-requisito liberado por reprovação com média ≥ 4,0, e fim do
  bloqueio de adição por pré-requisito.
- **TASK-46** — filtro de janela de aulas ("a partir de T2", "até N3") na
  Sugestão de Grade.
- **TASK-47** — Simulador de Formatura modelável: trilhas-alvo escolhidas pelo
  aluno, troca de disciplinas projetadas, ritmo por semestre e janela de horário.

As três são independentes entre si, com uma exceção declarada: a régua de slots
e o predicado de janela nascem na TASK-46 e são reusados pela TASK-47.

## 1. TASK-45 — pré-requisito liberado por desempenho

### 1.1 A regra

A UTFPR libera a disciplina subsequente quando o aluno reprovou na pré-requisito
**por nota**, desde que a média tenha ficado em 4,0 ou acima. Reprovação por
frequência não libera, ainda que a média seja alta.

Decisão do dono do projeto (2026-08-06): o limiar é **`media >= 4.0`**, inclusivo,
e a reprovação precisa ter sido por nota — `frequencia >= 75`.

### 1.2 Por que uma função nova, e não `cumpre()`

`cumpre()` responde "isto integraliza o currículo?". A regra do 4 responde
"isto destrava a disciplina seguinte?". São perguntas diferentes com respostas
diferentes, e a plataforma inteira depende da primeira: `situacao.ts`,
`progressoGrade.ts` e o cálculo de carga por categoria no simulador usam
`cumpre()` para somar horas. Fazer a reprovada passar por `cumpre()` creditaria
ao aluno carga horária que ele não tem — o histórico voltaria com o 1º estrato
inflado e a formatura projetada mais cedo do que a realidade.

Por isso a regra vive isolada em `src/domain/motor/prerequisitos.ts`:

```ts
liberadoPorDesempenho(codigo, perfil, mapa): boolean
```

Resolve o código pelo `MapaIdentidade`, como todo o resto do domínio, para que a
liberação valha também por equivalência — quem reprovou em `IF66C` com 5,0
destrava a dependente declarada sobre `CSD20`.

### 1.3 Frequência ausente

`DisciplinaCursada.frequencia` é `number | null`. Com `null` não há como separar
reprovação por nota de reprovação por falta.

**Assunção adotada:** `frequencia === null` conta como frequência suficiente, ou
seja, libera. A verificação contra as fixtures reais faz parte da implementação;
se aparecer espécime de reprovação por falta com frequência nula, a assunção se
inverte e o motivo fica registrado no docstring da função.

### 1.4 Onde a regra entra

Dois gates checam pré-requisito contra o perfil, e ambos passam a perguntar
`cumpre(p) || liberadoPorDesempenho(p)`:

| Arquivo | Ponto | Efeito |
|---|---|---|
| `motor/elegiveis.ts` | `bloqueio()` | card deixa de ter `motivoBloqueio` |
| `motor/simuladorFormatura.ts` | `alcancavel()` e o gate do laço de projeção | dependente pode ser adiantada |

**Correção ao desenho inicial (verificada na implementação):** o `motor/fluxograma.ts`
tinha sido listado como terceiro gate, e não é. Ele nunca recebe `PerfilAluno` —
monta a cadeia institucional da matriz, e a tela apenas pinta o que está em
`perfil.aprovadas`. Não há estado "travado" a relaxar ali, e marcar a reprovada
como aprovada seria pior que o problema original.

Detalhe do laço de projeção: `perfil.aprovadas` cresce enquanto o motor planeja,
mas `perfil.cursadas` — que é o que a regra do 4 lê — não muda. A reprovada segue
reprovada do começo ao fim e libera a dependente em todos os semestres.

### 1.5 Fim do bloqueio de adição

Hoje, quando `motivoBloqueio` não é nulo, a lista de turmas **não é renderizada**
— é o que impede a adição. Isso passa a ser: a lista renderiza sempre, e o aviso
de pré-requisito vira uma linha de alerta acima dela.

A badge continua existindo, com o texto corrigido de `bloqueada` para
**`pré-requisito pendente`**: nada está bloqueado depois desta mudança, e nomear
de bloqueio algo que o aluno consegue fazer é a interface mentindo.

Telas afetadas: `PossoCursar.tsx` e `LayoutGNH.tsx`.

**Não muda:** o bloqueio por conflito de horário (`verificarChoqueAoAdicionar` e
`ModalConflitoTurma`) segue idêntico. E a Sugestão de Grade continua descartando
matéria com pré-requisito pendente — sugerir é diferente de permitir. A regra do
4 chega lá por consequência, porque a matéria liberada deixa de ter
`motivoBloqueio`.

## 2. TASK-46 — janela de aulas na Sugestão de Grade

### 2.1 Régua compartilhada

`src/domain/horarios.ts` ganha a ordenação canônica dos 17 slots:

```ts
export const SLOTS_ORDENADOS: string[]      // M1..M6, T1..T6, N1..N5
export function indiceDoSlot(turno, aula): number
```

`rotuloComHora()` já existe e devolve `"T2 · 13:50–14:40"` — é o rótulo dos
seletores, atendendo ao pedido de que o filtro não exponha apenas o código do
slot.

### 2.2 Semântica

`OpcoesSugestaoGrade` ganha `aulaInicial?: string` e `aulaFinal?: string`, ambos
ids de slot. Predicado novo `turmaViolaJanela()`, irmão dos `turmaViolaTurnos` e
`turmaViolaSedes` que já existem, aplicado na mesma linha de filtro de turmas.

Turma passa quando **o turno está permitido E todos os seus slots caem dentro da
janela**. As duas travas compõem em vez de se substituir, e é isso que mantém
expressável o caso não-contíguo: "manhã e noite, sem tarde, nada depois de N3".

Padrão `M1`–`N5` = filtro inerte. Quem não mexer nos seletores tem exatamente o
comportamento de hoje.

### 2.3 UI

Dois selects na `ModalGradeMagica`, abaixo dos checkboxes de turno. Duas guardas,
ambas reusando o padrão de mensagem que o modal já tem para "nenhum turno
marcado":

- janela invertida (fim antes do início);
- combinação de turnos e janela que não deixa nenhum slot de pé.

## 3. TASK-47 — Simulador de Formatura modelável

### 3.1 Hierarquia de exibição

Pedido explícito do dono: o que é intuitivo fica óbvio, o que é complexo fica em
área avançada. Três camadas:

**Camada 1 — topo do painel, junto do ritmo.** Seletor de trilhas-alvo: chips com
nome e progresso (`45/90h`); o aluno marca em quais quer investir. Renderiza
apenas em curso que tem trilha — os demais não veem a seção.

**Camada 2 — contextual, na linha do tempo.** Botão "trocar" em cada disciplina
projetada substituível. Obrigatória não tem substituta e não ganha botão. Abre a
lista de candidatas da mesma categoria/conjunto que cabem naquele semestre;
escolher uma re-simula com ela fixada.

**Camada 3 — painel avançado, o mesmo que hoje abriga as exclusões.** Ritmo por
semestre, janela de horário na projeção e a lista bruta de disciplinas fixadas.

### 3.2 Motor

`OpcoesSimulacao` ganha quatro campos:

```ts
trilhasAlvo?: string[] | null;              // conjuntos escolhidos pelo aluno
disciplinasFixadas?: string[];              // "quero cursar estas"
ritmoPorSemestre?: Record<string, number>;  // sobrepõe `ritmo` no semestre
janela?: { aulaInicial?: string; aulaFinal?: string };
```

`escolherTrilhasAlvo()` passa a honrar a escolha do aluno primeiro e só completa
com a heurística atual (trilha mais barata de fechar) se ele marcar menos que o
curso exige. `ritmoDoSemestre(sem)` lê `ritmoPorSemestre[sem] ?? ritmo`. A janela
reusa o predicado da TASK-46 sobre a oferta-espelho de cada semestre projetado.

### 3.3 Pedidos impossíveis

Trilha-alvo sem oferta que feche as 90h, e optativa fixada em categoria já
fechada, são pedidos que a integralização pode não permitir atender. Eles saem
pelo canal que já existe para exclusões impossíveis: `TipoExclusao` é alargado
com `"trilha-alvo"` e `"disciplina-fixada"`, e a copy do painel passa de
"exclusões que não deu para respeitar" para "pedidos que a integralização não
permitiu atender". Mesma estrutura de dados, mesmo componente de tela.

O princípio já vigente se mantém: são pedidos, não ordens — quando respeitá-los
impede a formatura, o motor os desrespeita, marca a disciplina e explica por quê.

### 3.4 Decisões tomadas durante a implementação

**"Trocar" fixa a nova e exclui a antiga.** Só fixar não bastava: a substituída
continuava elegível e o motor podia repescá-la, deixando a troca sem efeito
visível na tela. A troca reusa os dois canais que já existem — `disciplinasFixadas`
recebe a que entra, `exclusoes.disciplinas` recebe a que sai — e o aluno vê as
duas nos painéis correspondentes.

**Fixar optativa escolhe a trilha dela por tabela.** Sem isso a disciplina pedida
cairia justamente no filtro de trilha-alvo. O conjunto dela entra em
`conjuntosFixados`, o mesmo mecanismo que a grade importada do Planejamento já
usava. Vale como preferência: escolha explícita de trilhas tem precedência.

**Diagnóstico dos pedidos no fim, contra o plano pronto.** Só depois de montada
a projeção se sabe o que ficou de fora, e cada ausência recebe motivo próprio:
já cumprida no histórico, sem oferta conhecida, trilha fora das alvo, ou
categoria que fecha sem ela. Pedido ignorado em silêncio é indistinguível de bug.

**Janela cede para obrigatória sem alternativa**, no mesmo padrão da exclusão de
docente: sem a disciplina não há formatura, e devolver projeção que não fecha
seria pior que devolver turma fora do horário pedido.

**Persistência.** `modelagemSimulador` entra no savefile como campo opcional.
Savefile gerado antes desta task não o tem, e recusar esses arquivos custaria ao
aluno a grade inteira por causa de um ajuste que ele nunca fez.

## 4. Testes

- `tests/prerequisito-nota.test.ts` (novo): a regra em si, incluindo os casos de
  fronteira — média exatamente 4,0, reprovação por frequência, frequência nula e
  liberação por equivalência.
- `tests/sugestao-grade.test.ts`: janela inerte não muda a saída; janela estreita
  corta as turmas certas; turno e janela compondo.
- `tests/simulador-formatura.test.ts`: trilha-alvo honrada; trilha-alvo inviável
  reportada; disciplina fixada entra no plano; ritmo por semestre respeitado.
- As nove regressões por curso são executadas integralmente: a TASK-45 mexe em
  gate que todas atravessam.

## 5. Fluxo de trabalho

Desenvolvimento no sandbox (`https://github.com/bdsromulo/oasisutfpr-sandbox`),
sincronizado com a `main` oficial em 2026-08-06 (`9064026..0b707e4`,
fast-forward). Uma branch por feature, integradas na ordem 45 → 46 → 47. Nada vai
para o repositório oficial sem decisão explícita do dono.
