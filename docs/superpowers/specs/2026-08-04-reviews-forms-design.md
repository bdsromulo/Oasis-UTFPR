# Avaliações da comunidade via Google Forms — desenho

Substitui a superfície de coleta homologada na `feat/reviews-comunidade` (formulário
nativo + endpoint em Apps Script) por um Google Forms do domínio UTFPR. O caminho de
leitura — validação, `data/reviews.json`, exibição — é reaproveitado praticamente
intacto.

## 1. Por que a troca

O desenho anterior admitia, com honestidade, três limites: não autenticava o RA, o
anti-Sybil era humano, e não havia rate limiting por IP. O Forms hospedado em conta
Workspace da UTFPR resolve o primeiro e, com ele, boa parte do segundo: só responde
quem está logado numa conta `@*.utfpr.edu.br`, e o Forms grava esse e-mail sem que o
respondente possa alterá-lo. Em troca, some o controle sobre a UI de envio — o que é
aceitável, porque o custo de manter 566 linhas de `ModalAvaliacao.tsx` mais um endpoint
em Apps Script era desproporcional ao volume esperado.

## 2. Fluxo completo

```
Oásis (tela Situação)
  └─ aluno clica "Avaliar" numa disciplina do último semestre
  └─ escolhe o professor (lista da oferta, com busca; ou "não está na lista")
  └─ site monta URL de prefill e abre o Forms em nova aba
        │
Google Forms (domínio utfpr.edu.br, login obrigatório)
  └─ campos já preenchidos: nome, código, disciplina, semestre, professor
  └─ aluno preenche: 4 notas, sistema avaliativo, comentário, consentimento
        │
Planilha de respostas — aba `Respostas` (PRIVADA, contém e-mail)
  └─ colunas de apoio à moderação, calculadas por fórmula
  └─ dono marca `aprovado = SIM`
        │
Aba `Homologado` (projeção por fórmula: só linhas aprovadas, só colunas públicas)
  └─ publicada como CSV (Arquivo › Compartilhar › Publicar na Web, aba específica)
        │
GitHub Actions (semanal + dispatch manual)
  └─ scripts/ingerir-reviews.ts → regenera data/reviews.json por inteiro
        │
Build do site → notas por turma na Grade e no Painel do Professor
```

A **fronteira de confiança** é a mesma do desenho anterior e não pode ser afrouxada: a
aba de respostas contém e-mail e jamais é publicada; só a aba `Homologado` sai. A
ingestão já recusa CSV que traga coluna privada, e essa guarda permanece.

## 3. Montagem do Forms — passo a passo

Criar o formulário **logado na conta institucional**, senão a restrição de domínio não
aparece.

### 3.1 Configurações

1. Novo formulário em `forms.google.com` com a conta `@alunos.utfpr.edu.br`.
2. Engrenagem › **Respostas**:
   - *Coletar endereços de e-mail* → **Verificado**.
   - *Restringir a usuários em utfpr.edu.br e organizações confiáveis* → **ligado**.
   - *Limitar a 1 resposta* → **desligado**. O aluno avalia várias disciplinas do
     mesmo semestre; o teto por pessoa é aplicado na ingestão (`MAX_AVALIACOES_NO_SEMESTRE`),
     não no Forms.
   - *Permitir edição após o envio* → **ligado**. É o mecanismo de retratação barato
     que a RNF07 pede.
3. Engrenagem › **Apresentação**: mensagem de confirmação explicando que a avaliação
   entra no site na próxima ingestão (não é instantânea) e como pedir remoção.

### 3.2 Perguntas, na ordem

As cinco primeiras chegam preenchidas por URL. Continuam editáveis — o Forms não tem
campo somente-leitura —, o que é conveniência, não integridade: quem edita cai na
validação da ingestão.

| # | Pergunta | Tipo | Origem | Obrigatória |
|---|---|---|---|---|
| 1 | Seu nome — confira, é ele que aparece publicamente | Resposta curta | prefill do histórico local | sim |
| 2 | Código da disciplina | Resposta curta | prefill | sim |
| 3 | Disciplina | Resposta curta | prefill | sim |
| 4 | Semestre em que você cursou | Resposta curta | prefill | sim |
| 5 | Professor(a) | Resposta curta | prefill (vazio se fora do elenco) | sim |
| 6 | Avaliação geral | Escala linear 1–5 | aluno | sim |
| 7 | Didática | Escala linear 1–5 | aluno | sim |
| 8 | Carga de trabalho | Escala linear 1–5 | aluno | sim |
| 9 | Dificuldade | Escala linear 1–5 | aluno | sim |
| 10 | Como a disciplina era avaliada? | Múltipla escolha | aluno | sim |
| 11 | Comentário | Parágrafo | aluno | não |
| 12 | Consentimento | Caixas de seleção | aluno | sim |

Detalhes que importam:

- **Escalas (6–9):** rotular as pontas e pôr a régua completa na descrição da pergunta
  — a escala linear do Forms não aceita rótulo por ponto intermediário. Régua em §3.3.
- **Pergunta 10:** opções exatamente `Provas`, `Trabalhos`, `Provas e trabalhos` →
  mapeadas na ingestão para `provas` / `trabalhos` / `misto`.
- **Pergunta 11:** Validação de resposta › *Comprimento máximo do caractere* igual a
  `LIMITE_COMENTARIO`. Texto de ajuda: descreva o que aconteceu na disciplina, não
  a pessoa. Nada de RA, e-mail ou telefone — a ingestão recusa a linha inteira.
- **Pergunta 12:** caixa única, obrigatória, com o texto abaixo. Caixa de seleção e
  não múltipla escolha porque o consentimento precisa ser ato positivo isolado.

Enunciado da pergunta: **Confirmação**. Caixa única:

> Confirmo que o nome preenchido no primeiro campo é meu e concordo que ele seja
> publicado junto desta avaliação no site do Oásis, de forma pública, enquanto a
> avaliação estiver no ar. Entendo que meu e-mail institucional é registrado para
> autenticar o envio e não é publicado. Posso pedir a remoção a qualquer momento
> editando esta resposta ou entrando em contato — a remoção vale para as publicações
> seguintes.

A permanência no histórico do Git **não** entra aqui: é verdadeira, mas explicar
versionamento dentro de uma caixa de consentimento gasta a atenção do respondente no
ponto errado. Fica na página de ajuda do site, linkada a partir do formulário.

Três coisas que o texto precisa acertar, e que a redação acima corrige em relação a um
"obtido da minha conta Google":

1. **Procedência real do nome.** O Google Workspace entrega ao formulário o **e-mail
   verificado, não o nome do titular**. O nome chega por prefill, vindo do histórico
   escolar que o próprio aluno carregou no Oásis — processamento local, o PDF nunca
   sai do navegador. Descrever a origem errado invalidaria o consentimento justamente
   no ponto que ele existe para cobrir.
2. **O campo é editável.** Como o prefill não trava campo, o consentimento é sobre o
   valor que estiver no campo 1 no momento do envio, não sobre o que o site sugeriu.
   Daí "o nome preenchido no primeiro campo é meu" em vez de "meu nome": é confirmação
   de titularidade — e, como não há conferência automática contra o e-mail (§4.1), ela
   é a única coisa que responsabiliza quem assina.
3. **Papel do e-mail.** Ele é coletado e é PII; o texto declara para que serve
   (autenticar) e o que não acontece com ele (publicação). Silenciar sobre um dado
   coletado é pior que declará-lo.

A frase final também não é decoração jurídica: o repositório é público e versionado,
então prometer apagamento retroativo seria mentira.

### 3.3 Régua das escalas

Fonte da verdade em `src/domain/reviews/tipos.ts`. O Forms copia dela; a UI de exibição
mostra a mesma régua em tooltip. Régua não compartilhada entre quem responde e quem lê
transforma a média em ruído com aparência de número.

Nenhuma âncora descreve o professor como pessoa — todas descrevem o que aconteceu com
o respondente. É o critério de comportamento observável que o desenho antigo aplicava às
tags, e é ele que contém a superfície difamatória sem exigir moderação caso a caso.

**Geral** — pontas *ruim* → *ótima*

1. Não recomendo; teria evitado essa turma se pudesse
2. Deixou a desejar; cursaria com outro professor se houvesse opção
3. Cumpriu o esperado, sem se destacar
4. Boa experiência; recomendo
5. Das melhores que cursei; recomendo sem ressalva

**Didática** — pontas *ruim* → *ótima*

1. Não dava para acompanhar a aula; aprendi por fora
2. Explicação confusa com frequência; o material ajudava pouco
3. Dava para acompanhar, mas exigia estudo por fora para fechar
4. Explicava com clareza e o material sustentava o estudo
5. A aula bastava por si só; eu saía entendendo

**Carga de trabalho** — pontas *leve* → *pesada* — mede **tempo fora da aula**

1. Quase nada fora da aula (até ~1h por semana)
2. Leve: ~2h por semana
3. Moderada: ~4h por semana, com picos perto das entregas
4. Pesada: ~6–8h por semana, entregas constantes
5. Muito pesada: essa disciplina ditou minha rotina no semestre

**Dificuldade** — pontas *fácil* → *difícil* — mede **exigência para ir bem**

1. Passei sem precisar de esforço concentrado
2. Passar foi tranquilo; nota alta exigia atenção
3. Precisei estudar de verdade para ir bem
4. Exigente: nota boa só com estudo constante
5. Das mais exigentes do curso; reprovação era comum na turma

Carga e dificuldade são ancoradas em dimensões diferentes de propósito: sem isso viram
a mesma pergunta feita duas vezes. Uma disciplina pode ser pesada e fácil (volume
braçal) ou leve e difícil (uma prova, conceitualmente dura).

**Consequência para o front-end:** geral e didática têm polo bom; carga e dificuldade
não — 5 ali é informação, não defeito. Essas duas nunca são pintadas com a semântica de
alerta nem entram em média com as outras, sob pena de o painel afirmar que disciplina
difícil é disciplina ruim.

### 3.4 Textos do formulário

**Título:** Avaliação de disciplinas — Oásis UTFPR

**Descrição (topo):**

> Este formulário coleta avaliações de disciplinas que você **já cursou** em
> Bacharelado em Sistemas de Informação — UTFPR Curitiba. As respostas alimentam o
> **Oásis**, projeto independente feito por estudantes, **sem vínculo oficial com a
> UTFPR**.
>
> Sua avaliação é **pública e assinada com seu nome**. Seu e-mail institucional é
> registrado apenas para confirmar que você é da UTFPR e **nunca é publicado**; seu RA
> e suas notas também não.
>
> Os primeiros campos chegam preenchidos quando você abre o formulário pelo botão
> "Avaliar" dentro do Oásis. Se algum estiver vazio ou errado, corrija antes de enviar.
>
> Leva cerca de 2 minutos. Avalie **uma disciplina por envio** — para avaliar outra,
> abra o formulário de novo pelo site.
>
> Todas as respostas passam por moderação antes de aparecer no site, e a publicação
> acontece em lote, uma vez por semana.

A declaração de não-oficialidade é a primeira coisa dita de propósito: ver a expectativa
correta antes de responder é o que separa este formulário de uma avaliação institucional.

**Descrição do campo de comentário (pergunta 11):**

> Conte como foi cursar essa disciplina com esse professor: como eram as aulas, o
> material, as provas e os trabalhos, o que você faria diferente. O que ajuda quem vem
> depois é o **concreto** — "as provas cobravam exercícios iguais aos da lista" vale
> mais que "as provas eram justas".
>
> Escreva sobre **a disciplina e a forma como ela foi conduzida**, não sobre a pessoa.
> Não são publicados: xingamento, ofensa, apelido, baixo calão, ironia agressiva,
> acusação sobre algo que você não presenciou, ou qualquer afirmação sobre a vida
> pessoal do professor.
>
> Não inclua RA, e-mail, telefone ou nome de colegas — respostas com esses dados são
> descartadas inteiras.
>
> Toda resposta passa por moderação antes de ir ao site. Comentário reprovado não é
> publicado, **mas suas notas continuam valendo** — elas entram na média mesmo sem o
> texto.
>
> Opcional. Máximo de 1000 caracteres.

A última garantia é deliberada: sem ela, quem tem medo de ter o texto barrado tende a
abandonar o envio inteiro, e a nota se perde junto. Separar o destino do comentário do
destino das notas protege o dado quantitativo, que é o que sustenta as médias.

### 3.5 Estética

O Forms customiza pouco: cor de tema, cor de fundo, banner de topo e um preset de
fonte. Outfit e Plus Jakarta não estão disponíveis nos campos — a tipografia da marca
só aparece se estiver desenhada dentro do banner.

- **Banner:** ~1600×400 px, PNG. Fundo `#18181b` (o zinc do favicon), a palmeira do
  favicon à esquerda em traço branco, "Oásis UTFPR" ao lado em Outfit Bold branco,
  faixa fina `#fecd0f` como acento. O Forms recorta o banner diferente em celular e
  desktop: tudo dentro dos 60% centrais, nada de texto junto às bordas.
- **Tema:** amarelo mais próximo de `#fecd0f`, fundo claro neutro. Subir o banner antes
  faz o Forms sugerir a paleta a partir dele. Preset de fonte *Básico*.

Três proibições, cada uma por um motivo distinto:

1. **Nada de brasão ou marca oficial da UTFPR.** Um formulário que avalia professores
   ostentando a marca da instituição se apresenta como avaliação institucional, que não
   é. É risco concreto de reclamação, e é o que a primeira linha da descrição neutraliza.
2. **Nenhuma foto de pessoa** — professor, aluno ou banco de imagens de sala de aula.
   Além do direito de imagem, foto de gente num formulário sobre gente empurra o tom
   para o pessoal, exatamente o que a descrição do comentário trabalha para evitar.
3. **Nada de areia, duna, camelo ou palmeira tropical.** A convenção do projeto é
   explícita: a identidade não deriva do nome "Oásis" — amarelo UTFPR sobre base
   neutra. A palmeira do favicon é marca gráfica, não tema de deserto.

### 3.6 URL de prefill

Em *Obter link pré-preenchido*, preencher os campos 1–5 com valores marcadores e copiar
o link gerado. Ele traz os `entry.NNNNNNN` de cada campo. Esses IDs vão para um único
módulo do domínio (`src/domain/reviews/forms.ts`), com o comentário de que são opacos e
mudam se a pergunta for recriada — editar a pergunta preserva o ID, apagar e refazer não.

## 4. Moderação — plugando o output

Na planilha de respostas, **não** editar a aba `Respostas` (o Forms sobrescreve). Criar
colunas auxiliares à direita da última coluna do Forms, que é área livre.

### 4.1 Colunas de apoio (aba `Respostas`)

- `aprovado` — preenchida à mão com `SIM`. Só isso publica a linha. O padrão é vazio,
  ou seja, nada é publicado por omissão.
- Nome declarado **não é conferido contra o e-mail**. Chegou a estar no desenho e foi
  removido: o e-mail institucional da UTFPR costuma ser abreviado (`rsilva`, `rbsilva`,
  `silva.r`), então a heurística erraria na maioria dos casos legítimos, e alerta que
  quase sempre está errado é alerta que se aprende a ignorar — pior que não ter. Não
  há substituto automático: o e-mail autenticado fica na aba privada e permite rastrear
  a autoria se houver disputa. Mitigação reativa, que é o que dá para ter sem backend.
- `alerta_pii` — fórmula que procura padrão de RA (7 dígitos), e-mail e telefone no
  comentário. Redundante com a guarda da ingestão de propósito: melhor pegar na
  planilha, onde dá para editar, do que na Action, onde a linha inteira cai.
- `alerta_prefill` — sinaliza código que não bate com o formato esperado, indício de
  que alguém editou o campo preenchido.

### 4.2 Aba `Homologado`

Aba nova, uma única fórmula na célula A1, projetando apenas as colunas públicas na
ordem de cabeçalho que `ingerir-reviews.ts` exige (`carimbo, autor, codigo, semestre,
situacao, professorId, geral, didatica, dificuldade, cargaTrabalho, avaliacao,
comentario`), filtrando por `aprovado = "SIM"`. Nem e-mail nem RA nem as colunas de
alerta atravessam.

Publicar **essa aba** como CSV e guardar a URL. Ela é pública: não é segredo, é o dado
que já ia para o site.

### 4.3 Ingestão

`scripts/ingerir-reviews.ts` é reaproveitado. Mudanças:

- Remover a validação de `tags` e do vocabulário `TAGS`/`TAGS_OPOSTAS` — o sistema de
  tags sai de escopo.
- Aceitar `situacao` ausente: o Forms não sabe se o aluno foi aprovado ou reprovado, e
  perguntar convida à mentira. O campo vira opcional no tipo, ou é preenchido pelo
  site no prefill a partir do histórico local.
- Mapear os rótulos em português da pergunta 10 para `SistemaAvaliativo`.
- O `id` estável por linha continua vindo do hash — regeneração total, nunca append,
  como já é.

O workflow existente (`.github/workflows/ingerir-reviews.yml`) muda só na URL do CSV,
que passa a apontar para a aba `Homologado` desta planilha.

## 5. Front-end

**Reaproveitado inteiro:** `PainelProfessor.tsx`, a exibição de notas na `Grade.tsx`,
`acervo.ts`, `professores.ts`, `config.ts`, e a seção "Avaliar o semestre X" da
`Situacao.tsx` — inclusive o ponto de entrada, que é o mesmo lugar de antes.

**Removido:** `ModalAvaliacao.tsx`, `envio.ts`, `tools/apps-script/recebe-review.gs`,
`tests/reviews-envio.test.ts`, e o vocabulário de tags de `tipos.ts`.
`ModalMinhasAvaliacoes.tsx` perde sentido na forma atual — sem envio local não há
rascunho a listar — e vira, no máximo, um texto explicando como editar a resposta no
próprio Forms.

**Novo:** `ModalEnvioForms.tsx`, pequeno, com três responsabilidades e nada mais:

1. **Escolher o professor.** Lista da oferta daquele `(codigo, semestre)` via
   `construirRoster`, com busca por texto — é aqui que mora a pesquisabilidade que o
   Forms não tem. Opção final e sempre presente: *"Meu professor não está na lista"*,
   que deixa o campo vazio para digitação no Forms. Pela medição do `Estrategia.md`,
   essa rota atinge ~14% dos casos, e 31% para quem está adiantado — é caminho comum,
   não borda, e a UI deve tratá-la como escolha legítima, não como erro.
2. **Mostrar o que será público.** Nome (de `perfil.nome`, do histórico local),
   disciplina, semestre, professor. É o momento do consentimento informado: o aluno vê
   aqui o nome que vai assinar a avaliação, e a caixa do campo 12 confirma no Forms o
   que já foi mostrado aqui. Os dois textos precisam descrever a mesma procedência —
   se a UI disser "seu nome" e o Forms disser "obtido do Google", o consentimento
   descreve um fluxo que não existe.
3. **Abrir o Forms** com a URL montada, em nova aba.

`src/domain/reviews/forms.ts` — módulo puro, testável, sem React: recebe alvo, autor e
professor, devolve a URL. Os IDs `entry.*` moram só aqui.

## 6. O que faz a ferramenta funcionar de fato

- **Volume.** O gargalo não é técnico, é ter avaliação suficiente para a nota significar
  algo. O convite pós-semestre na tela de Situação (RF16) é o motor; sem ele, o
  formulário é um link que ninguém acha.
- **Atrito.** O prefill mata 5 dos 12 campos e a busca de professor acontece onde já
  funciona. Sobram 6 toques e um texto opcional.
- **Confiança.** Auth de domínio e nome público são o que distingue isto de um mural
  anônimo — e são também o que reduz a chance de difamação, porque quem assina pensa.
- **Custo de moderação.** As colunas de alerta existem para que aprovar seja marcar
  `SIM` em lote, olhando só as linhas acesas. Se moderar custar caro, a ingestão para
  de rodar e a feature morre em silêncio.
- **Frescor.** Semanal é suficiente e a mensagem de confirmação do Forms avisa disso.
  Expectativa de publicação instantânea é a única forma de a latência virar reclamação.

## 7. Limites honestos

- Prefill não trava campo: a validação da ingestão é a linha de defesa real.
- A restrição de domínio impede não-UTFPR, mas não impede um aluno de avaliar
  disciplina que não cursou. O teto por pessoa e a moderação humana são a mitigação;
  não há como verificar matrícula sem o RA, que é dado proibido.
- Sem backend, a remoção vale para publicações futuras. O Git guarda o passado, e o
  texto de consentimento diz isso.
