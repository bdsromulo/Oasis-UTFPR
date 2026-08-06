# Aviso de mudança na oferta oficial — desenho

Notifica o aluno quando uma turma que ele já colocou numa grade do Planejamento
sai da oferta oficial da UTFPR ou muda de horário, sede ou enquadramento. Hoje
essa informação não chega a ele de forma nenhuma — e, no caso da remoção, o
Oásis apaga a escolha da tela sem dizer nada.

## 1. O problema, com nome e sobrenome

A reimportação de Turmas Abertas 2026/2 de 06/08/2026 trouxe três mudanças que
afetam grades já montadas:

- `EST70A S02` e `EST70A S03` (Introdução À Estatística) **saíram** da oferta de
  BSI e de Eng. Computação.
- `ELTA8 S11` (Aquisição E Processamento De Sinais Biomédicos), de Eng.
  Eletrônica, deixou de ser `EaD` e passou a `Presencial`. Horários e professor
  permaneceram idênticos — só o enquadramento mudou, e o valor novo é o mais
  coerente, porque a turma sempre teve quatro slots em sala física (CQ-106).

O que acontece hoje com quem tinha `EST70A S02` na grade está em
`src/domain/motor/grade.ts`, na `itensDaSelecao`: a função percorre a seleção
salva e só emite o item quando encontra disciplina **e** turma na oferta atual.
Não há `else`. A seleção simplesmente não é desenhada.

Isso é pior que a ausência de aviso: é desaparecimento silencioso. O aluno abre
o Planejamento e a matéria não está mais lá, sem nenhuma pista de que a UTFPR
mexeu na oferta.

O dado bruto, porém, sobrevive. As cestas ficam em `localStorage` como
`Record<semestre, Record<grade, SelecaoTurma[]>>` — pares `{codDisciplina,
codTurma}` gravados verbatim, que **não** são podados na escrita. A poda é só de
renderização. Existe, portanto, do que reconstruir o aviso.

## 2. Decisões que moldaram o desenho

**Escopo.** Avisa remoção, horário, sede/sala e enquadramento. Fora: professor,
vagas, reserva e prioridade. O critério é o impacto na grade — `motor/grade.ts`
detecta choque por turno e divergência de sede, e nenhum desses quatro campos
excluídos muda o que o aluno consegue cursar. Incluir professor tornaria a
funcionalidade ruidosa logo na estreia: este import preencheu `MAT7PC S25` e
`MAT7PC S15`, que estavam vazios, e isso viraria aviso para todo mundo que tem a
turma.

**A seleção órfã continua visível.** Ela fica na grade, marcada e inerte: não
ocupa horário, não conta carga e não gera choque. O aluno vê o que perdeu e
decide se remove ou troca. É o oposto exato do comportamento atual.

**Remoção não precisa de histórico.** A seleção salva que não casa com a oferta
atual é, por definição, órfã — e só tem órfã quem escolheu a turma enquanto ela
existia. A detecção é exata e sai de graça, sem arquivo auxiliar. Alteração de
atributo é que exige saber como a turma era antes.

**O histórico vem do pipeline, não do usuário.** A alternativa considerada era
gravar um snapshot dos atributos dentro de `SelecaoTurma` no momento da escolha,
comparando em runtime. É tecnicamente mais exata — zero falso positivo — mas
**não ajuda ninguém retroativamente**: quem já tem `ELTA8 S11` salvo hoje não
tem snapshot, e justamente o caso que motivou a funcionalidade passaria batido.
Também mexeria no schema persistido do `localStorage` e do savefile, exigindo
migração sobre dado real de aluno. O changelog gerado na importação não tem
nenhum dos dois problemas.

O preço é um falso positivo conhecido: o Oásis não distingue quem planejou antes
da mudança de quem planejou depois, já com o dado novo. Como a faixa é
dispensável e a dispensa é lembrada, esse aluno a fecha uma vez e segue.

## 3. Fluxo completo

```
Importação de Turmas Abertas (tools/parse_turmas_pdf.py)
  └─ JSON novo no working tree, ainda não commitado
        │
tools/diff_turmas.py
  └─ base = git show HEAD:<arquivo>  (o histórico do git é a fonte, sem storage extra)
  └─ compara removida / horario / sede / enquadramento
  └─ data/<curso>/turmas/mudancas-<semestre>.json   (só se houver mudança relevante)
        │
Build do site — dadosCurso.ts importa o changelog junto da oferta
        │
Planejamento
  ├─ domain/motor/mudancasOferta.ts cruza cesta × oferta × changelog
  ├─ FaixaMudancasOferta (dispensável, lembra a revisão)
  └─ marca no item afetado
```

## 4. Camada de dados — `tools/diff_turmas.py`

```bash
python tools/diff_turmas.py data/turmas/2026-2.json
```

Saída em `data/<curso>/turmas/mudancas-<semestre>.json`:

```json
{
  "curso": "ENG ELETRÔNICA",
  "semestre": "2026-2",
  "revisao": "2026-08-06",
  "base": "a8b4101",
  "mudancas": [
    {
      "codigo": "ELTA8",
      "turma": "S11",
      "nome": "Aquisição E Processamento De Sinais Biomédicos",
      "tipo": "enquadramento",
      "de": "EaD",
      "para": "Presencial"
    }
  ]
}
```

`revisao` é a data da importação e funciona como id de dispensa. `base` registra
o commit comparado, para auditoria.

Tipos emitidos: `removida`, `horario`, `sede`, `enquadramento`. Sem mudança
relevante, **nenhum arquivo é gerado** — é o caso de Controle e Automação e de
Mecatrônica nesta importação, que só tiveram preenchimento de professor.

**Ordem importa.** O diff precisa rodar antes do commit da oferta nova; com o
dado já em `HEAD`, a comparação sai vazia. Documentar na sequência de importação
do `REPOSITORIO.md`.

## 5. Camada de domínio — `src/domain/motor/mudancasOferta.ts`

Módulo puro, sem dependência de React, seguindo o limite arquitetural do projeto.

```ts
export type TipoMudanca = "removida" | "horario" | "sede" | "enquadramento";

export interface MudancaTurma {
  codigo: string;
  turma: string;
  nome: string;
  tipo: TipoMudanca;
  de?: string | string[];
  para?: string | string[];
}

export interface ChangelogOferta {
  curso: string;
  semestre: string;
  revisao: string;
  base: string;
  mudancas: MudancaTurma[];
}

/** Uma mudança já cruzada com a grade do aluno: é o que a tela desenha. */
export interface AvisoMudanca {
  /** grade em que o item está ("A", "B", ...) */
  grade: string;
  /** a seleção salva que originou o aviso */
  selecao: SelecaoTurma;
  nome: string;
  tipo: TipoMudanca;
  de?: string | string[];
  para?: string | string[];
  /** false quando a remoção foi deduzida sem changelog, para o texto genérico */
  confirmadaPelaFonte: boolean;
}

export function detectarMudancas(
  selecao: SelecaoTurma[],
  oferta: OfertaSemestre,
  changelog: ChangelogOferta | null,
): AvisoMudanca[];

export function orfasDaSelecao(
  oferta: OfertaSemestre,
  selecao: SelecaoTurma[],
): SelecaoTurma[];
```

Duas origens, deliberadamente separadas:

- **Órfãs** saem do runtime e funcionam em qualquer semestre, com ou sem
  changelog. É o que conserta o desaparecimento silencioso.
- **Alterações de atributo** saem do changelog, única fonte possível.

Quando a órfã também consta do changelog, o aviso usa o texto rico ("removida da
oferta oficial", `confirmadaPelaFonte: true`); sem changelog, cai no genérico
("não está mais na oferta").

**Regra de precedência, para não duplicar aviso.** A órfã detectada em runtime é
sempre quem emite o aviso de remoção; a entrada `removida` do changelog só
enriquece o texto, nunca emite sozinha. Disso decorrem dois comportamentos
desejados: uma turma removida que o aluno não tinha na grade não gera aviso
nenhum, e uma turma órfã por qualquer outro motivo (semestre antigo, cesta
importada de savefile) continua sendo avisada mesmo sem changelog.

Cada par `(grade, seleção)` gera no máximo um aviso. Se a mesma turma estiver em
mais de uma grade do mesmo semestre, há um aviso por grade — o aluno precisa
resolver cada uma.

Avisos saem ordenados com as remoções primeiro.

## 6. Camada visual

`itensDaSelecao` **não muda de assinatura**. Ela continua devolvendo só itens
válidos, e com isso choque de horário, carga horária, Grade Mágica e simulador de
formatura seguem intactos — que é precisamente o comportamento "item inerte"
desejado. As órfãs saem pela função irmã `orfasDaSelecao`, e a tela as desenha
como linha própria.

- `src/ui/telas/FaixaMudancasOferta.tsx` — faixa dispensável no topo do
  Planejamento, no padrão visual vigente (sem emoji, ícone vetorial de
  `icons.tsx`). Só aparece quando a grade do aluno é afetada.
- Marca no item afetado: badge `removida da oferta`, `horário alterado`,
  `agora presencial` ou `mudou de sede`, com o de/para no tooltip.

## 7. Persistência

Uma chave nova: `oasis:mudancas-vistas` → `Record<semestre, revisao>`. Ao
dispensar a faixa, grava a `revisao` corrente; ela só reaparece quando uma
importação futura gerar revisão diferente.

`SelecaoTurma`, as cestas e o savefile **não mudam**. Nenhuma migração incide
sobre dado real de aluno.

A marca no item não é dispensável: persiste até o aluno trocar ou remover aquela
turma.

## 8. Degradação

| Situação | Comportamento |
|---|---|
| Changelog ausente | Só remoções. Nada quebra. |
| Changelog malformado ou JSON inválido | `try/catch`, ignora, cai para só remoções. |
| `git show` sem commit anterior (arquivo novo) | Diff vazio, nenhum arquivo gerado. |
| Cesta com seleção de semestre sem oferta carregada | Nenhum aviso; a tela já trata semestre ausente. |

## 9. Testes — `tests/mudancas-oferta.test.ts`

- Órfã detectada: `EST70A S02` na seleção, ausente da oferta.
- Alteração de enquadramento lida do changelog: `ELTA8 S11`.
- Turma inalterada não gera aviso.
- Turma removida que o aluno **não** tinha na grade não gera aviso.
- Órfã sem changelog gera aviso genérico (`confirmadaPelaFonte: false`); com
  changelog, gera um único aviso e não dois.
- Mesma turma em duas grades do semestre gera um aviso por grade.
- **Órfã não entra em `itensDaSelecao`**: não conta carga, não gera choque.
- Faixa dispensada não reaparece na mesma revisão e reaparece em revisão nova.
- Changelog corrompido não derruba a tela.

## 10. Primeira carga

| Curso | Arquivo | Conteúdo |
|---|---|---|
| BSI | `data/turmas/mudancas-2026-2.json` | `EST70A S02` e `S03` removidas |
| Eng. Computação | `data/eng-comp/turmas/mudancas-2026-2.json` | `EST70A S02` e `S03` removidas |
| Eng. Eletrônica | `data/eng-eletronica/turmas/mudancas-2026-2.json` | `ELTA8 S11` EaD → Presencial |
| Eng. Controle | — | nada relevante |
| Eng. Mecatrônica | — | nada relevante |
