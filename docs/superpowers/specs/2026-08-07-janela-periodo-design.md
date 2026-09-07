# Janela de período na Sugestão de Grade e no Simulador — desenho

**TASK-48.** Encomendada em 2026-08-07 a partir de um caso real: o Histórico de
Engenharia Eletrônica (matriz 968) de um aluno no 6º período gerou uma Sugestão
de Grade com **Trabalho de Conclusão de Curso 1 (ELE91) em segundo lugar** — uma
disciplina do 9º período.

## 1. O que estava acontecendo

Reprodução com perfil sintético da 968 no 6º período (aprovado em todas as
obrigatórias dos períodos 1–5), oferta 2026-2:

```
adiantar_maximo: ELP61 (p6), ELE91 TCC1 (p9), ELO91 (p9), ELEB30, ELF51 (p6), …
balanceado:      ELP61 (p6), ELE91 TCC1 (p9), ELO91 (p9), ELEB30, ELF51 (p6)
```

O Simulador de Formatura tem o mesmo defeito por outra porta: coloca ELE91 no
primeiro semestre projetado e ELE92 (TCC2, 10º período) no segundo.

## 2. A causa

Não é falta de dado. **As 1.290 disciplinas das oito matrizes têm `periodo`
preenchido** — nenhuma nula, nenhuma zero. E nas 172 optativas da 968 o
`d.periodo` é idêntico ao `conjuntos[].periodo_inicial` do conjunto que a
contém, sem uma divergência sequer: o campo da disciplina já carrega a janela
que a árvore de conjuntos declara.

O defeito é de motor, e cabe numa frase: **`bloqueio()` nunca lê `d.periodo`.**

`src/domain/motor/elegiveis.ts` itera exclusivamente sobre `d.prerequisitos`, e
conhece dois gates — código de disciplina cumprido e o pseudo-prereq
`Período:N`. Sem pré-requisito declarado, a disciplina fica liberada desde o 1º
período. E a 968 não declara pré-requisito para o TCC: o PDF oficial traz a
coluna vazia (não é falha do parser — 105 das 201 disciplinas da 968 têm
pré-requisito lido corretamente), porque a trava do TCC é regimental e não mora
na tabela da matriz.

O único consumidor de `periodo` era o termo de pontuação da Sugestão:

```ts
pts += (10 - periodo) * 12;
```

Ancorado no `10` fixo, e não no período do aluno: mede "quão cedo no curso a
matéria é", não "quão perto ela está do que devo cursar agora". Nunca fica
negativo, então nunca desclassifica. Os números do caso — ELP61 (p6) = 140,
ELE91 (p9) = 101 — mostram que três períodos de distância custam 39 pontos,
menos que o bônus de extensionista sozinho (+45). Agrava-se na 968 porque o
termo **só se aplica a `obrigatória`/`2º estrato`**, e nesse currículo quase
tudo é grupo de escolha: as poucas obrigatórias que sobram no fim são
justamente TCC1, TCC2 e Ética, que abocanham o `+80` e flutuam para o topo.

## 3. A regra

Decisão do dono do projeto (2026-08-07): é **trava real** — o Portal recusa a
matrícula em disciplina adiantada demais, não é só má prática de planejamento.

A fronteira: **diferença de até 2 períodos é permitida**. Aluno no 7º pode pegar
a do 9º; no 6º, não pode. Bloqueia quando

```
periodoDisciplina - periodoAluno > 2
```

Sendo trava real, o motivo entra no **`motivoBloqueio`**, ao lado dos
pré-requisitos, e não num campo separado de aviso. É a mesma natureza de
impedimento, e o "Posso Cursar" passa a exibi-lo sem trabalho adicional.

### 3.1 O que a regra deliberadamente não faz

**Não trava aluno atrasado.** A comparação é assimétrica de propósito: só limita
para cima. Quem está no 6º período com dependência do 3º continua vendo a
dependência — `3 - 6 = -3`, e nunca é maior que 2.

**Não inventa período onde não há.** Dois casos de falha aberta:

- `perfil.periodo` é `number | null` (`tipos.ts:147`), e histórico sem período
  desliga o gate inteiro. Falhar fechado aqui bloquearia as 1.290 disciplinas de
  uma vez.
- disciplina que só existe na oferta, fora da matriz, chega a `listarElegiveis`
  com `periodo: 0` (`elegiveis.ts`, `discSimulada`). Sem período conhecido, não
  há distância a medir, e ela passa.

O segundo caso tem uma armadilha que só apareceu na implementação, e custou uma
regressão em `simulador-formatura.test.ts`. O simulador guarda
`periodoAluno = perfil?.periodo ?? 1` (`simuladorFormatura.ts:1004`) para fazer a
projeção andar sem histórico — e esse `?? 1` apaga a diferença entre "aluno do
1º período" e "não sei o período". Passando esse valor ao gate, o modo livre
passou a simular um calouro e barrou tudo do 4º período para cima no primeiro
semestre, redistribuindo as trilhas o bastante para quebrar a invariante de
pagamento duplo da 962. O gate lê `periodoDeclarado`, sem fallback, e não roda
quando ele é nulo — mesma convenção de `bloqueio()`.

De passagem, fica registrado um defeito pré-existente **não corrigido aqui**:
`elegiveis.ts:41` faz `perfil.periodo ?? 0` ao avaliar o pseudo-prereq
`Período:N`, o que o faz falhar *fechado* — histórico sem período bloqueia essas
disciplinas. Hoje atinge poucas (4 na 968, 8 na 844). O gate novo não repete o
padrão.

## 4. Onde entra

Uma função só, em `src/domain/cursos.ts`, onde já mora `TETO_CH_SEMESTRE`:

```ts
export const ADIANTAMENTO_MAXIMO_PERIODOS = 2;

export function foraDaJanelaDePeriodo(
  periodoDisciplina: number,
  periodoAluno: number | null,
): boolean
```

Sem consultar a árvore de conjuntos: a §2 mostrou que `d.periodo` já cobre
obrigatórias e optativas com a mesma fidelidade, e subir a hierarquia seria
trabalho para chegar ao mesmo número.

Três consumidores:

1. **`elegiveis.ts`, em `bloqueio()`** — motivo legível: `"abre a partir do 7º
   período"`. Pega a Sugestão de Grade e o "Posso Cursar" de uma vez, porque os
   dois leem `motivoBloqueio`.
2. **`simuladorFormatura.ts`** — o simulador não usa `listarElegiveis`; tem
   filtro próprio, e ali a regra roda contra o `periodoNoSemestre` que ele já
   calcula (`periodoAluno + passo`). Assim o TCC não some da projeção: entra
   sozinho quando a projeção alcança o 7º período.
3. **`grade-magica.ts`, na pontuação** — item separado, §5.

## 5. Pontuação por distância

O gate corta o que está longe demais; a pontuação ordena o que sobrou. Sem a
segunda metade, o TCC volta a saltar para o topo assim que o aluno chega ao 7º.

Substitui o `(10 - periodo) * 12` por um termo na distância `periodoDisciplina -
periodoAluno`, **assimétrico** — matéria atrasada é dívida e pesa mais que
matéria adiantada — e aplicado a **todas** as categorias, não só a
obrigatória/2º estrato. Hoje grupo de escolha não tem noção de período nenhuma,
que é parte do motivo de a 968 se comportar tão mal.

Sem histórico (modo livre, `perfil === null`) não há período do aluno: o termo
antigo continua valendo como fallback.

## 6. Risco e ordem de implementação

O gate (§4) é conservador e previsível. A pontuação (§5) mexe na ordem de todo
curso servido pela plataforma. Vão em **commits separados**, para que as
regressões possam reverter a segunda sem perder a primeira.

Suítes a conferir uma a uma: `regressao-bsi`, `regressao-bsi-806`,
`regressao-engcomp`, `regressao-engcomp-962`, `regressao-eletronica-968`,
`regressao-controle-978`, `regressao-mecatronica-823`, `regressao-mecatronica-973`,
`planejamento-844`, `sugestao-grade`, `simulador-formatura`.

## 7. Fora de escopo

A matriz 823 (Mecatrônica) não tem **nenhum** pré-requisito declarado — 0 de 89
disciplinas, contra 105/201 na 968 e 184/236 na 844. Tem cara de coluna não lida
pelo parser. O gate de período reduz o estrago (deixa de oferecer 10º período a
calouro), mas não substitui as cadeias ausentes. Auditoria própria.
