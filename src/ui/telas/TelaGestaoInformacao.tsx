import type { ReactNode } from "react";

/**
 * Vitrine visual das tabelas de Gestão da Informação do projeto.
 *
 * O conteúdo espelha `Estrategia.md` §2 (PEN, PETI, Ciclo de GI e Dimensões de
 * Qualidade da Informação). O markdown continua sendo a fonte canônica: ao
 * alterar as tabelas de lá, replique aqui.
 */

interface Coluna {
  chave: string;
  rotulo: string;
  /** destaca a coluna como cabeçalho de linha */
  principal?: boolean;
}

function Tabela(props: { colunas: Coluna[]; linhas: Record<string, ReactNode>[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-200/90 dark:border-zinc-800">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr className="bg-zinc-50 dark:bg-zinc-900/80">
            {props.colunas.map((c) => (
              <th
                key={c.chave}
                scope="col"
                className="border-b border-zinc-200/90 px-4 py-3 font-display text-[11px] font-black uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:text-zinc-400"
              >
                {c.rotulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.linhas.map((linha, i) => (
            <tr
              key={i}
              className="border-b border-zinc-100 last:border-0 transition-colors hover:bg-utfpr-50/60 dark:border-zinc-800/80 dark:hover:bg-zinc-800/40"
            >
              {props.colunas.map((c) => (
                <td
                  key={c.chave}
                  className={`px-4 py-3.5 align-top leading-relaxed ${
                    c.principal
                      ? "font-display font-bold text-zinc-900 dark:text-zinc-100"
                      : "text-zinc-600 dark:text-zinc-300"
                  }`}
                >
                  {linha[c.chave]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Secao(props: { numero: string; titulo: string; descricao?: string; children: ReactNode }) {
  return (
    <section className="space-y-3.5">
      <div>
        <div className="flex items-baseline gap-2.5">
          <span className="rounded-lg bg-utfpr-500/20 px-2 py-0.5 font-mono text-xs font-black text-utfpr-700 dark:text-utfpr-400">
            {props.numero}
          </span>
          <h3 className="font-display text-lg font-black tracking-tight text-zinc-900 dark:text-white">
            {props.titulo}
          </h3>
        </div>
        {props.descricao && (
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {props.descricao}
          </p>
        )}
      </div>
      {props.children}
    </section>
  );
}

/** Marcador de dimensão/atributo, para as células da tabela de Qualidade da Informação */
function Marca(props: { children: ReactNode }) {
  return (
    <span className="inline-block rounded-md bg-zinc-900 px-2 py-0.5 font-mono text-[11px] font-bold text-utfpr-400 dark:bg-zinc-800">
      {props.children}
    </span>
  );
}

function Nivel(props: { tom: "alto" | "baixo"; children: ReactNode }) {
  const cor =
    props.tom === "alto"
      ? "text-emerald-700 dark:text-emerald-400"
      : "text-red-700 dark:text-red-400";
  return (
    <li className="leading-relaxed">
      <strong className={`font-display ${cor}`}>{props.tom === "alto" ? "Alto:" : "Baixo:"}</strong>{" "}
      {props.children}
    </li>
  );
}

const EXIGENCIAS = [
  {
    quem: "Aluno de BSI",
    info: "Quanto falta para integralizar cada estrato (obrigatórias, 2º estrato, humanidades, trilhas, eletivas, extensão, estágio)? Qual meu Coeficiente de Rendimento absoluto e normalizado?",
    quando: "Contínuo; pico ao fim do semestre",
  },
  {
    quem: "Aluno de BSI",
    info: "Quais disciplinas estou liberado a cursar (pré-requisitos cumpridos × oferta do semestre)?",
    quando: "Períodos de matrícula e rematrícula",
  },
  {
    quem: "Aluno de BSI",
    info: "Há choque de horário ou conflito de deslocamento entre sedes (Centro/Ecoville/Neoville) na grade que estou montando? Quanto esta grade me faz avançar?",
    quando: "Período de matrícula",
  },
  {
    quem: "Aluno de BSI",
    info: "Qual a dificuldade percebida e a experiência de quem já cursou uma dada disciplina/turma?",
    quando: "Antes de escolher turmas",
  },
  {
    quem: "Aluno Contribuidor",
    info: "Quais das minhas disciplinas concluídas posso avaliar, e como registrar dificuldade e comentário de forma autenticada?",
    quando: "Após concluir a disciplina",
  },
  {
    quem: "Mantenedores",
    info: "Quais turmas foram abertas no semestre? A matriz sofreu alteração? Há avaliações da comunidade pendentes de moderação?",
    quando: "Semestral; contínuo para moderação",
  },
];

const AQUISICAO = [
  {
    info: "Matriz curricular vigente (981)",
    dado: "Disciplinas, período, conjunto/estrato, cargas horárias, pré-requisitos e equivalências",
    fonte: (
      <>
        Consulta Curso e Matriz Curricular — Portal do Aluno UTFPR →{" "}
        <code className="font-mono text-xs text-utfpr-700 dark:text-utfpr-400">data/matriz-981.json</code>
      </>
    ),
  },
  {
    info: "Oferta de turmas do semestre",
    dado: "Códigos de turma, horários (turno M/T/N + slot), sede/sala, professores e prioridade BSI (S73 P1, S71 P2)",
    fonte: (
      <>
        PDF oficial de Turmas Abertas — Portal do Aluno →{" "}
        <code className="font-mono text-xs text-utfpr-700 dark:text-utfpr-400">data/turmas/&lt;sem&gt;.json</code>
      </>
    ),
  },
  {
    info: "Progresso individual do aluno",
    dado: "RA, disciplinas cursadas, notas, frequência, status (aprovado/equivalência/aproveitamento/dependência) e créditos",
    fonte: (
      <>
        Histórico Escolar em PDF — <strong>processado 100% no navegador, sem trânsito em rede</strong>
      </>
    ),
  },
  {
    info: "Avaliação de disciplina pela comunidade",
    dado: "Nível de dificuldade (1–3), comentário textual, código da disciplina e token de prova de vínculo",
    fonte: (
      <>
        Submissão autenticada do Aluno Contribuidor (e-mail institucional + histórico validado localmente) —{" "}
        <em>futuro</em>
      </>
    ),
  },
];

const DISTRIBUICAO = [
  {
    quem: "Aluno de BSI",
    como: "Abas Minha Situação (visão estratégica/longo prazo), Planejamento de Matrícula (posso cursar + grade + conflitos) e Catálogo de Matérias; tooltips de códigos; relatório copiável para o Portal; simulação gamificada de impulso da grade no progresso",
  },
  {
    quem: "Aluno Contribuidor",
    como: "Botão Avaliar habilitado por disciplina concluída (validada no próprio histórico); painel de dificuldade média e comentários agregados por disciplina — futuro",
  },
  {
    quem: "Mantenedores",
    como: "Pipeline de dados versionado (data/ + validadores Python com erro alto); futuro portal de administração/moderação para homologar ofertas e avaliações sem editar JSON manualmente",
  },
];

const FEEDBACK = [
  "Alertas visuais imediatos de observações do parser e inconsistências (perfil.avisos, painel.inconsistencias).",
  "Badges dinâmicas de status da grade em tempo real (contagem de aulas/semana, Sem conflitos vs Choque de horário) e simulação de impulso no progresso curricular.",
  "Copiador de relatório de matrícula pronto para colagem no portal oficial.",
  "Futuro: fila de moderação de avaliações da comunidade e sinal de dificuldade média retroalimentando a decisão de escolha de turmas de outros alunos.",
];

const QUALIDADE = [
  {
    info: "Disciplinas abertas no semestre vigente",
    dado: (
      <>
        Matérias ofertadas no semestre (
        <code className="font-mono text-xs text-utfpr-700 dark:text-utfpr-400">data/turmas/&lt;sem&gt;.json</code>)
      </>
    ),
    dimensao: <Marca>d1: Atualidade</Marca>,
    atributos: (
      <>
        <Marca>a1: intervalo de tempo</Marca>
        <ul className="mt-2 space-y-1.5 text-xs">
          <Nivel tom="alto">
            se a informação é datada com intervalo máximo de até 2 meses antes do início do semestre
            letivo vigente.
          </Nivel>
          <Nivel tom="baixo">
            se a informação é datada com intervalo superior a 2 meses antes do início do semestre
            letivo vigente.
          </Nivel>
        </ul>
      </>
    ),
  },
  {
    info: "Progresso no curso e integralização",
    dado: "Histórico Escolar em PDF do aluno",
    dimensao: <Marca>d2: Confiabilidade / Precisão</Marca>,
    atributos: (
      <>
        <Marca>a2: fidelidade posicional</Marca>
        <ul className="mt-2 space-y-1.5 text-xs">
          <Nivel tom="alto">
            se todas as linhas de disciplina possuem código, nome e carga horária perfeitamente
            alinhados e validados contra invariantes do curso (0 erros).
          </Nivel>
          <Nivel tom="baixo">
            se há falhas de parsing ou divergências em cargas horárias de dependências/equivalências.
          </Nivel>
        </ul>
      </>
    ),
  },
  {
    info: "Horários e sedes das aulas",
    dado: (
      <>
        Conflito de turno e sala (
        <code className="font-mono text-xs text-utfpr-700 dark:text-utfpr-400">motor/grade.ts</code>)
      </>
    ),
    dimensao: <Marca>d3: Integridade</Marca>,
    atributos: (
      <>
        <Marca>a3: completeza relacional</Marca>
        <ul className="mt-2 space-y-1.5 text-xs">
          <Nivel tom="alto">
            se cada slot da grade identifica sem ambiguidade dia, turno, aula, disciplina, turma e
            sala/sede.
          </Nivel>
          <Nivel tom="baixo">
            se há slots órfãos ou turmas sem indicação de sede para cálculo de deslocamento.
          </Nivel>
        </ul>
      </>
    ),
  },
  {
    info: "Avaliações da comunidade",
    dado: (
      <>
        Dificuldade (1–3) e comentário por disciplina (<em>futuro</em>)
      </>
    ),
    dimensao: <Marca>d4: Credibilidade / Autenticidade</Marca>,
    atributos: (
      <>
        <Marca>a4: prova de vínculo</Marca>
        <ul className="mt-2 space-y-1.5 text-xs">
          <Nivel tom="alto">
            se a avaliação está atrelada a um RA autenticado pela submissão do histórico e por
            verificação institucional, com no máximo uma avaliação por (aluno, disciplina).
          </Nivel>
          <Nivel tom="baixo">
            se a avaliação é anônima e não verificável, sujeita a spam, Sybil ou falsificação de RA.
          </Nivel>
        </ul>
      </>
    ),
  },
];

const PEN = [
  {
    rotulo: "1.1 Análise do Cenário Atendido",
    texto:
      "O Portal do Aluno da UTFPR apresenta interfaces fragmentadas, relatórios densos em texto (PDFs multicolecionados) e ausência de simulação preditiva de grade que alerte sobre choques de horários e deslocamento inter-sedes em tempo hábil durante o curto período de matrícula.",
  },
  {
    rotulo: "1.2 Definição de Objetivos",
    texto:
      "Reduzir a carga cognitiva e o tempo gasto pelo estudante de BSI na tomada de decisão curricular de dias/horas para menos de 2 minutos, garantindo 100% de conformidade com a Matriz 981.",
  },
  {
    rotulo: "1.3 Definição da Estratégia",
    texto:
      "Atuar como camada de inteligência e consolidação visual local sobre os documentos brutos da instituição, democratizando o acesso às regras de progressão sem competir com os sistemas oficiais de registro de notas.",
  },
];

const PETI = [
  {
    rotulo: "2.1 Estratégia de TI",
    texto:
      "Infraestrutura descentralizada (client-side computing) alavancando a capacidade de processamento dos navegadores modernos para parsing e motor de inferência, com deploy contínuo via Git no GitHub Pages.",
  },
  {
    rotulo: "2.2 Elementos de TI Sugeridos",
    texto:
      "Frontend & Build: React 19, TypeScript, Vite, Tailwind CSS v4. Engine de extração posicional: Python 3 + pypdf/pdfplumber (build/análise offline) e pdfjs-dist (runtime no browser do usuário).",
  },
  {
    rotulo: "2.3 Indicadores de Desempenho (KPIs de TI)",
    texto:
      "Taxa de sucesso no parseamento do Histórico Escolar em PDF (≥ 99,5%); tempo de processamento do PDF no cliente (< 1000 ms); zero falsos positivos ou omissões na detecção de choques de horário.",
  },
];

function ListaTopicos(props: { itens: { rotulo: string; texto: string }[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {props.itens.map((it) => (
        <div
          key={it.rotulo}
          className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="font-display text-xs font-black uppercase tracking-wider text-utfpr-700 dark:text-utfpr-400">
            {it.rotulo}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{it.texto}</p>
        </div>
      ))}
    </div>
  );
}

export function TelaGestaoInformacao() {
  return (
    <div className="space-y-10">
      <header className="rounded-3xl border-2 border-zinc-200/90 bg-white/95 p-6 shadow-md dark:border-zinc-800/90 dark:bg-zinc-900/95">
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-utfpr-500/20 text-2xl">
            🗂️
          </span>
          <div>
            <h2 className="font-display text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
              Gestão da Informação
            </h2>
            <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              A arquitetura informacional do Oásis UTFPR é guiada pelos frameworks canônicos de
              Planejamento Estratégico de Negócios (PEN), Planejamento Estratégico de TI (PETI) e do
              Ciclo de Gestão da Informação (GI). Esta página é a leitura visual das tabelas
              mantidas em <code className="font-mono text-xs text-utfpr-700 dark:text-utfpr-400">Estrategia.md</code>.
            </p>
          </div>
        </div>
      </header>

      <Secao
        numero="2.1"
        titulo="PEN — Planejamento Estratégico de Negócios"
        descricao="Cenário atendido, objetivos e estratégia de atuação do projeto."
      >
        <ListaTopicos itens={PEN} />
      </Secao>

      <Secao
        numero="2.2"
        titulo="PETI — Planejamento Estratégico de TI"
        descricao="Como a estratégia de negócio se traduz em infraestrutura, tecnologia e métricas."
      >
        <ListaTopicos itens={PETI} />
      </Secao>

      <Secao
        numero="3.1"
        titulo="Determinação das Exigências"
        descricao="Quem precisa de qual informação, e quando."
      >
        <Tabela
          colunas={[
            { chave: "quem", rotulo: "Quem?", principal: true },
            { chave: "info", rotulo: "Informação exigida" },
            { chave: "quando", rotulo: "Quando?" },
          ]}
          linhas={EXIGENCIAS}
        />
      </Secao>

      <Secao
        numero="3.2"
        titulo="Obtenção e Plano de Aquisição da Informação"
        descricao="Qual dado é obtido, e de qual fonte."
      >
        <Tabela
          colunas={[
            { chave: "info", rotulo: "Informação exigida", principal: true },
            { chave: "dado", rotulo: "Dado a ser obtido" },
            { chave: "fonte", rotulo: "Fonte do dado" },
          ]}
          linhas={AQUISICAO}
        />
      </Secao>

      <Secao
        numero="3.3"
        titulo="Distribuição e Disponibilização da Informação"
        descricao="Quem recebe a informação, e por qual canal."
      >
        <Tabela
          colunas={[
            { chave: "quem", rotulo: "Quem?", principal: true },
            { chave: "como", rotulo: "Como?" },
          ]}
          linhas={DISTRIBUICAO}
        />
      </Secao>

      <Secao
        numero="3.4"
        titulo="Feedback da Utilização"
        descricao="Como o uso da informação retroalimenta o ciclo."
      >
        <ul className="space-y-2.5 rounded-2xl border border-zinc-200/90 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          {FEEDBACK.map((f) => (
            <li key={f} className="flex gap-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-utfpr-500" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </Secao>

      <Secao
        numero="2.4"
        titulo="Dimensões e Atributos de Qualidade da Informação"
        descricao="Cada informação coletada é mensurada por dimensões e atributos rigorosos, com faixas explícitas de nível Alto e Baixo."
      >
        <Tabela
          colunas={[
            { chave: "info", rotulo: "Informação", principal: true },
            { chave: "dado", rotulo: "Dado coletado avaliado" },
            { chave: "dimensao", rotulo: "Dimensão avaliada" },
            { chave: "atributos", rotulo: "Atributos avaliados" },
          ]}
          linhas={QUALIDADE}
        />
      </Secao>

      <p className="pb-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
        Fonte canônica: <code className="font-mono">Estrategia.md</code> §2 — Modelagem de Gestão da
        Informação.
      </p>
    </div>
  );
}
